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
import { Phase, DEFAULT_TIMER_SECONDS, DEFAULT_THEME_ID } from '../types'
import type { JudgeCard, Player, RoundState, ScorerConfig, IdMap } from '../types'
import { CountdownTimer } from './timer.svelte'
import type { CountdownTimerSnapshot } from './timer.svelte'

const MIN_PLAYERS = 2
const MAX_PLAYERS = 6
export const SCORE_SESSION_SNAPSHOT_VERSION = 1

export type RankedPlayer = { rank: number; player: Player }

export type ScoreSessionSnapshot = {
  sessionVersion: typeof SCORE_SESSION_SNAPSHOT_VERSION
  phase: Phase
  config: ScorerConfig
  players: Player[]
  roundIndex: number
  roundState: RoundState | null
  history: RoundState[]
  timer: CountdownTimerSnapshot
  savedAt: number
}

/**
 * スコア降順で並べ、同点なら同じ順位を割り当てる（standard competition ranking: 1, 1, 3）。
 */
export function rankedStandings(players: Player[]): RankedPlayer[] {
  const sorted = [...players].sort((a, b) => b.score - a.score)
  const result: RankedPlayer[] = []
  let lastScore = Number.POSITIVE_INFINITY
  let lastRank = 0
  sorted.forEach((p, i) => {
    if (p.score < lastScore) {
      lastRank = i + 1
      lastScore = p.score
    }
    result.push({ rank: lastRank, player: p })
  })
  return result
}

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
  config: ScorerConfig = $state({
    totalRounds: null,
    timerSeconds: DEFAULT_TIMER_SECONDS,
    themeId: DEFAULT_THEME_ID,
  })
  players: Player[] = $state([])
  roundIndex: number = $state(0)
  roundState: RoundState | null = $state(null)
  history: RoundState[] = $state([])

  /** 最終判断のタイマー。session 経由で UI から `session.timer.remainingSeconds` を見る */
  readonly timer: CountdownTimer

  constructor(timer: CountdownTimer = new CountdownTimer()) {
    this.timer = timer
  }

  // ---- セットアップ ------------------------------------------------------

  startGame(names: string[], config: ScorerConfig): void {
    if (names.length < MIN_PLAYERS || names.length > MAX_PLAYERS) {
      throw new Error(`プレイヤー人数は ${MIN_PLAYERS}〜${MAX_PLAYERS} 人`)
    }
    this.config = {
      totalRounds: config.totalRounds ?? names.length,
      timerSeconds: Math.max(0, config.timerSeconds ?? DEFAULT_TIMER_SECONDS),
      themeId: config.themeId ?? DEFAULT_THEME_ID,
    }
    this.players = names.map((name, id) => ({ id, name, score: 0 }))
    this.roundIndex = 0
    this.history = []
    this.timer.reset()
    this.beginRound()
  }

  resetToSetup(): void {
    this.timer.reset()
    this.phase = Phase.Setup
    this.config = {
      totalRounds: null,
      timerSeconds: DEFAULT_TIMER_SECONDS,
      themeId: DEFAULT_THEME_ID,
    }
    this.players = []
    this.roundIndex = 0
    this.roundState = null
    this.history = []
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
    if (this.config.timerSeconds > 0) {
      this.timer.start(this.config.timerSeconds)
    }
  }

  finalizeRound(): IdMap {
    this.requireRound()
    if (!this.allFinalSubmitted()) throw new Error('全員の最終判断が未入力です')
    const deltas = this.scoreRound(this.roundState!)
    this.phase = Phase.RoundScore
    this.timer.stop()
    return deltas
  }

  nextRound(): void {
    this.requireRound()
    this.history.push(this.roundState!)
    this.roundIndex += 1
    this.timer.reset()
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

  toSnapshot(now: number = Date.now()): ScoreSessionSnapshot {
    return {
      sessionVersion: SCORE_SESSION_SNAPSHOT_VERSION,
      phase: this.phase,
      config: { ...this.config },
      players: this.players.map(clonePlayer),
      roundIndex: this.roundIndex,
      roundState: cloneRoundState(this.roundState),
      history: this.history.map((state) => cloneRoundState(state)!),
      timer: this.timer.toSnapshot(now),
      savedAt: now,
    }
  }

  restoreSnapshot(snapshot: ScoreSessionSnapshot, now: number = Date.now()): void {
    this.config = { ...snapshot.config }
    this.players = snapshot.players.map(clonePlayer)
    this.roundIndex = snapshot.roundIndex
    this.roundState = cloneRoundState(snapshot.roundState)
    this.history = snapshot.history.map((state) => cloneRoundState(state)!)
    this.phase = snapshot.phase
    this.timer.restoreSnapshot(snapshot.timer, now)
    if (this.phase !== Phase.FinalJudgment && this.timer.isRunning) {
      this.timer.stop()
    }
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

export function parseScoreSessionSnapshot(value: unknown): ScoreSessionSnapshot | null {
  const root = asRecord(value)
  if (!root || root.sessionVersion !== SCORE_SESSION_SNAPSHOT_VERSION) return null

  const phase = parsePhase(root.phase)
  const config = parseConfig(root.config)
  const players = parsePlayers(root.players)
  const roundState = parseNullableRoundState(root.roundState)
  const history = parseHistory(root.history)
  const timer = parseTimerSnapshot(root.timer)

  if (
    !phase ||
    !config ||
    !players ||
    roundState === undefined ||
    !history ||
    !timer ||
    typeof root.roundIndex !== 'number' ||
    !Number.isInteger(root.roundIndex) ||
    root.roundIndex < 0 ||
    typeof root.savedAt !== 'number'
  ) {
    return null
  }

  return {
    sessionVersion: SCORE_SESSION_SNAPSHOT_VERSION,
    phase,
    config,
    players,
    roundIndex: root.roundIndex,
    roundState,
    history,
    timer,
    savedAt: root.savedAt,
  }
}

function clonePlayer(player: Player): Player {
  return { id: player.id, name: player.name, score: player.score }
}

function cloneJudge(card: JudgeCard): JudgeCard {
  return {
    id: card.id,
    question: card.question,
    options: [...card.options],
  }
}

function cloneIdMap(map: IdMap): IdMap {
  return { ...map }
}

function cloneRoundState(state: RoundState | null): RoundState | null {
  if (state === null) return null
  return {
    parentId: state.parentId,
    judge: state.judge ? cloneJudge(state.judge) : null,
    firstJudgments: cloneIdMap(state.firstJudgments),
    secondJudgments: cloneIdMap(state.secondJudgments),
    finalJudgments: cloneIdMap(state.finalJudgments),
    scoreDelta: cloneIdMap(state.scoreDelta),
  }
}

function parsePhase(value: unknown): Phase | null {
  return Object.values(Phase).includes(value as Phase) ? (value as Phase) : null
}

function parseConfig(value: unknown): ScorerConfig | null {
  const obj = asRecord(value)
  if (!obj) return null
  const totalRounds =
    obj.totalRounds === null
      ? null
      : typeof obj.totalRounds === 'number' &&
          Number.isInteger(obj.totalRounds) &&
          obj.totalRounds > 0
        ? obj.totalRounds
        : undefined
  if (totalRounds === undefined || typeof obj.timerSeconds !== 'number') return null
  const themeId =
    typeof obj.themeId === 'string' && ['tailwind', 'light', 'dark', 'cyber'].includes(obj.themeId)
      ? (obj.themeId as ScorerConfig['themeId'])
      : DEFAULT_THEME_ID
  return {
    totalRounds,
    timerSeconds: Math.max(0, Math.floor(obj.timerSeconds)),
    themeId,
  }
}

function parsePlayers(value: unknown): Player[] | null {
  if (!Array.isArray(value)) return null
  const players = value.map(parsePlayer)
  return players.every((p): p is Player => p !== null) ? players : null
}

function parsePlayer(value: unknown): Player | null {
  const obj = asRecord(value)
  if (
    !obj ||
    typeof obj.id !== 'number' ||
    !Number.isInteger(obj.id) ||
    typeof obj.name !== 'string' ||
    typeof obj.score !== 'number'
  ) {
    return null
  }
  return { id: obj.id, name: obj.name, score: obj.score }
}

function parseHistory(value: unknown): RoundState[] | null {
  if (!Array.isArray(value)) return null
  const states = value.map(parseRoundState)
  return states.every((state): state is RoundState => state !== null) ? states : null
}

function parseNullableRoundState(value: unknown): RoundState | null | undefined {
  if (value === null) return null
  return parseRoundState(value) ?? undefined
}

function parseRoundState(value: unknown): RoundState | null {
  const obj = asRecord(value)
  if (!obj || typeof obj.parentId !== 'number' || !Number.isInteger(obj.parentId)) return null
  const judge = obj.judge === null ? null : parseJudge(obj.judge)
  const firstJudgments = parseIdMap(obj.firstJudgments)
  const secondJudgments = parseIdMap(obj.secondJudgments)
  const finalJudgments = parseIdMap(obj.finalJudgments)
  const scoreDelta = parseIdMap(obj.scoreDelta)
  if (judge === undefined || !firstJudgments || !secondJudgments || !finalJudgments || !scoreDelta) {
    return null
  }
  return {
    parentId: obj.parentId,
    judge,
    firstJudgments,
    secondJudgments,
    finalJudgments,
    scoreDelta,
  }
}

function parseJudge(value: unknown): JudgeCard | undefined {
  const obj = asRecord(value)
  if (
    !obj ||
    typeof obj.id !== 'string' ||
    typeof obj.question !== 'string' ||
    !Array.isArray(obj.options) ||
    !obj.options.every((option) => typeof option === 'string')
  ) {
    return undefined
  }
  return {
    id: obj.id,
    question: obj.question,
    options: [...obj.options],
  }
}

function parseIdMap(value: unknown): IdMap | null {
  const obj = asRecord(value)
  if (!obj) return null
  const result: IdMap = {}
  for (const [key, option] of Object.entries(obj)) {
    const id = Number(key)
    if (!Number.isInteger(id) || typeof option !== 'number' || !Number.isInteger(option)) {
      return null
    }
    result[id] = option
  }
  return result
}

function parseTimerSnapshot(value: unknown): CountdownTimerSnapshot | null {
  const obj = asRecord(value)
  if (
    !obj ||
    typeof obj.totalSeconds !== 'number' ||
    typeof obj.remainingSeconds !== 'number' ||
    typeof obj.isRunning !== 'boolean' ||
    typeof obj.expired !== 'boolean' ||
    !(typeof obj.endsAt === 'number' || obj.endsAt === null)
  ) {
    return null
  }
  return {
    totalSeconds: obj.totalSeconds,
    remainingSeconds: obj.remainingSeconds,
    isRunning: obj.isRunning,
    expired: obj.expired,
    endsAt: obj.endsAt,
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null
}
