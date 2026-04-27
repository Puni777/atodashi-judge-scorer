/**
 * 後出しジャッジ scorer の状態機械（UI 非依存）。
 *
 * 旧 Python 実装 `atodashi_judge/scorer/session.py` + `game.py` の以下のロジックを
 * 物理カード前提（手札・デッキなし）に絞って TS 移植したもの。
 *
 *   - 親ローテ（roundIndex % players.length）
 *   - 1st/2nd/最終 判断の入力と前提チェック
 *   - score_round の採点アルゴリズム
 *   - フェーズ遷移
 */
import { Phase } from '../types'
import type { JudgeCard, Player, RoundState, ScorerConfig, IdMap } from '../types'

const MIN_PLAYERS = 2
const MAX_PLAYERS = 6

function emptyRoundState(parentId: number): RoundState {
  return {
    parentId,
    judge: null,
    firstJudgments: {},
    secondJudgments: {},
    finalJudgments: {},
    scoreDelta: {},
  }
}

export class ScoreSession {
  // Svelte 5: class フィールドを reactive にするには `$state` rune を使う。
  // .svelte.ts 拡張子のおかげで Svelte コンパイラが処理してくれる。
  phase: Phase = $state(Phase.Setup)
  config: ScorerConfig = $state({ totalRounds: null })
  players: Player[] = $state([])
  roundIndex: number = $state(0)
  roundState: RoundState | null = $state(null)
  history: RoundState[] = $state([])

  // ---- セットアップ ------------------------------------------------------

  startGame(names: string[], config: ScorerConfig): void {
    if (names.length < MIN_PLAYERS || names.length > MAX_PLAYERS) {
      throw new Error(`プレイヤー人数は ${MIN_PLAYERS}〜${MAX_PLAYERS} 人`)
    }
    this.config = {
      totalRounds: config.totalRounds ?? names.length,
    }
    this.players = names.map((name, id) => ({ id, name, score: 0 }))
    this.roundIndex = 0
    this.history = []
    this.beginRound()
  }

  // ---- ラウンド進行 ------------------------------------------------------

  private beginRound(): void {
    this.roundState = emptyRoundState(this.parent().id)
    this.phase = Phase.RoundStart
  }

  enterParentSetup(): void {
    this.requireRound()
    this.phase = Phase.ParentSetup
  }

  setJudge(card: JudgeCard): void {
    this.requireRound()
    this.roundState!.judge = card
  }

  enterFirstJudgment(): void {
    this.requireRound()
    if (this.roundState!.judge === null) {
      throw new Error('ジャッジカードを選んでください')
    }
    this.phase = Phase.FirstJudgment
  }

  submitFirst(childId: number, option: number): void {
    this.requireRound()
    this.validateOption(option)
    this.roundState!.firstJudgments[childId] = option
  }

  submitSecond(childId: number, option: number): void {
    this.requireRound()
    if (!(childId in this.roundState!.firstJudgments)) {
      throw new Error('第一判断が未提出')
    }
    this.validateOption(option)
    this.roundState!.secondJudgments[childId] = option
  }

  submitFinal(childId: number, option: number): void {
    this.requireRound()
    if (!(childId in this.roundState!.secondJudgments)) {
      throw new Error('第二判断が未提出')
    }
    this.validateOption(option)
    this.roundState!.finalJudgments[childId] = option
  }

  advanceToSecond(): void {
    if (!this.allFirstSubmitted()) throw new Error('全員の第一判断が未入力です')
    this.phase = Phase.SecondJudgment
  }

  advanceToFinal(): void {
    if (!this.allSecondSubmitted()) throw new Error('全員の第二判断が未入力です')
    this.phase = Phase.FinalJudgment
  }

  finalizeRound(): IdMap {
    this.requireRound()
    if (!this.allFinalSubmitted()) throw new Error('全員の最終判断が未入力です')
    const deltas = this.scoreRound(this.roundState!)
    this.phase = Phase.RoundScore
    return deltas
  }

  nextRound(): void {
    this.requireRound()
    this.history.push(this.roundState!)
    this.roundIndex += 1
    const total = this.config.totalRounds ?? this.players.length
    if (this.roundIndex >= total) {
      this.phase = Phase.GameOver
      this.roundState = null
      return
    }
    this.beginRound()
  }

  // ---- 採点 --------------------------------------------------------------

  /**
   * 親と各子の得点差分を計算し累計スコアに加算する。
   *
   * 親:
   *   - 第一→第二 で判断が変わった子の人数（+）
   *   - 第二→最終 で判断が変わった子の人数（+）
   *
   * 子（第二==最終 の者のみ）:
   *   - 他の子のうち「第二→最終 で変え、かつ最終が自分の最終と一致」する人数
   *   第二→最終 で判断を変えた子は 0 点。
   */
  private scoreRound(state: RoundState): IdMap {
    const childIds = this.children().map((c) => c.id)
    if (
      Object.keys(state.firstJudgments).length !== childIds.length ||
      Object.keys(state.secondJudgments).length !== childIds.length ||
      Object.keys(state.finalJudgments).length !== childIds.length
    ) {
      throw new Error('全員分の判断が揃っていません')
    }

    const deltas: IdMap = {}
    for (const p of this.players) deltas[p.id] = 0

    const shiftedOnSecond = childIds.filter(
      (c) => state.secondJudgments[c] !== state.firstJudgments[c],
    ).length
    const shiftedOnFinal = childIds.filter(
      (c) => state.finalJudgments[c] !== state.secondJudgments[c],
    ).length
    deltas[state.parentId] = shiftedOnSecond + shiftedOnFinal

    for (const c of childIds) {
      if (state.finalJudgments[c] !== state.secondJudgments[c]) {
        deltas[c] = 0
        continue
      }
      const pulled = childIds.filter(
        (o) =>
          o !== c &&
          state.finalJudgments[o] !== state.secondJudgments[o] &&
          state.finalJudgments[o] === state.finalJudgments[c],
      ).length
      deltas[c] = pulled
    }

    state.scoreDelta = deltas
    for (const p of this.players) {
      p.score += deltas[p.id] ?? 0
    }
    return deltas
  }

  // ---- クエリ -----------------------------------------------------------

  parent(): Player {
    if (this.players.length === 0) throw new Error('ゲーム未開始')
    const p = this.players[this.roundIndex % this.players.length]
    if (!p) throw new Error('parent index out of range')
    return p
  }

  children(): Player[] {
    const parentId = this.parent().id
    return this.players.filter((p) => p.id !== parentId)
  }

  currentRoundNumber(): number {
    return this.roundIndex + 1
  }

  standings(): Player[] {
    return [...this.players].sort((a, b) => b.score - a.score)
  }

  allFirstSubmitted(): boolean {
    this.requireRound()
    return Object.keys(this.roundState!.firstJudgments).length === this.children().length
  }

  allSecondSubmitted(): boolean {
    this.requireRound()
    return Object.keys(this.roundState!.secondJudgments).length === this.children().length
  }

  allFinalSubmitted(): boolean {
    this.requireRound()
    return Object.keys(this.roundState!.finalJudgments).length === this.children().length
  }

  // ---- 内部 --------------------------------------------------------------

  private requireRound(): void {
    if (this.players.length === 0) throw new Error('ゲーム未開始')
  }

  private validateOption(option: number): void {
    const judge = this.roundState?.judge
    if (!judge) throw new Error('ジャッジカード未提出')
    if (!Number.isInteger(option) || option < 0 || option >= judge.options.length) {
      throw new Error(`option は 0〜${judge.options.length - 1}`)
    }
  }
}
