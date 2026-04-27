/**
 * `tests/test_scorer_session.py` の関連ケースを vitest に移植したもの。
 * 数値が Python 実装と一致することを確認するのが目的。
 */
import { describe, expect, it } from 'vitest'
import { DEFAULT_THEME_ID, Phase } from '../types'
import type { JudgeCard, ScorerConfig } from '../types'
import { ScoreSession, parseScoreSessionSnapshot, rankedStandings } from './session.svelte'
import { CountdownTimer, type Scheduler } from './timer.svelte'

const noopScheduler: Scheduler = {
  setInterval: () => 'fake-handle',
  clearInterval: () => {},
}

const JUDGE_2OPT: JudgeCard = {
  id: 'jdg_001',
  question: '許せる？',
  options: ['許せる', '許せない'],
}

const JUDGE_3OPT: JudgeCard = {
  id: 'jdg_004',
  question: 'マナー違反？',
  options: ['アウト', 'セーフ', 'グレー'],
}

function start(
  s: ScoreSession,
  names: string[] = ['A', 'B', 'C'],
  config: ScorerConfig = { totalRounds: null, timerSeconds: 0 },
): void {
  s.startGame(names, config)
}

describe('ScoreSession', () => {
  it('プレイヤー人数 2 / 9 はエラー、3 / 8 は有効', () => {
    expect(() => start(new ScoreSession(), ['A', 'B'])).toThrow()
    expect(() => start(new ScoreSession(), ['A', 'B', 'C'])).not.toThrow()
    expect(() => start(new ScoreSession(), ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'])).not.toThrow()
    expect(() => start(new ScoreSession(), ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'])).toThrow()
  })

  it('初期 phase は Setup', () => {
    expect(new ScoreSession().phase).toBe(Phase.Setup)
  })

  it('startGame で RoundStart に遷移し、親が先頭プレイヤー', () => {
    const s = new ScoreSession()
    start(s)
    expect(s.phase).toBe(Phase.RoundStart)
    expect(s.parent().name).toBe('A')
  })

  it('1 ラウンドの遷移と採点が Python と一致する', () => {
    /*
     * 親=A, 子=B/C
     * B: 1st=0 → 2nd=1 (flipped) → final=1 (held)
     * C: 1st=0 → 2nd=0 (held)    → final=1 (flipped)
     *
     * 親 A: 1st→2nd で 1 人, 2nd→final で 1 人 → 2 点
     * 子 B: final == 2nd → 他の子のうち 2nd→final で変え final が一致 = C → 1 点
     * 子 C: final ≠ 2nd → 0 点
     */
    const s = new ScoreSession()
    start(s)

    s.enterParentSetup()
    expect(s.phase).toBe(Phase.ParentSetup)

    s.setJudge(JUDGE_2OPT)
    s.enterFirstJudgment()
    expect(s.phase).toBe(Phase.FirstJudgment)

    const [b, c] = s.children()
    if (!b || !c) throw new Error('children should be defined')

    s.submitFirst(b.id, 0)
    s.submitFirst(c.id, 0)
    s.advanceToSecond()
    expect(s.phase).toBe(Phase.SecondJudgment)

    s.submitSecond(b.id, 1)
    s.submitSecond(c.id, 0)
    s.advanceToFinal()
    expect(s.phase).toBe(Phase.FinalJudgment)

    s.submitFinal(b.id, 1)
    s.submitFinal(c.id, 1)
    const deltas = s.finalizeRound()
    expect(s.phase).toBe(Phase.RoundScore)

    const parentId = s.parent().id
    expect(deltas[parentId]).toBe(2)
    expect(deltas[b.id]).toBe(1)
    expect(deltas[c.id]).toBe(0)

    // 累計スコアにも反映されている
    expect(s.players.find((p) => p.id === parentId)!.score).toBe(2)
    expect(s.players.find((p) => p.id === b.id)!.score).toBe(1)
    expect(s.players.find((p) => p.id === c.id)!.score).toBe(0)
  })

  it('全員揃わないと advanceToSecond できない', () => {
    const s = new ScoreSession()
    start(s)
    s.enterParentSetup()
    s.setJudge(JUDGE_2OPT)
    s.enterFirstJudgment()
    const [b] = s.children()
    if (!b) throw new Error('child b should exist')
    s.submitFirst(b.id, 0)
    expect(() => s.advanceToSecond()).toThrow()
  })

  it('親が A→B→C と正しくローテし、3 ラウンドで GameOver', () => {
    const s = new ScoreSession()
    start(s, ['A', 'B', 'C'], { totalRounds: 3, timerSeconds: 0 })
    const parents: string[] = []
    for (let i = 0; i < 3; i++) {
      parents.push(s.parent().name)
      s.enterParentSetup()
      s.setJudge(JUDGE_2OPT)
      s.enterFirstJudgment()
      for (const ch of s.children()) s.submitFirst(ch.id, 0)
      s.advanceToSecond()
      for (const ch of s.children()) s.submitSecond(ch.id, 0)
      s.advanceToFinal()
      for (const ch of s.children()) s.submitFinal(ch.id, 0)
      s.finalizeRound()
      s.nextRound()
    }
    expect(parents).toEqual(['A', 'B', 'C'])
    expect(s.phase).toBe(Phase.GameOver)
  })

  it('3 択ジャッジでも入力でき、範囲外は弾く', () => {
    const s = new ScoreSession()
    start(s)
    s.enterParentSetup()
    s.setJudge(JUDGE_3OPT)
    s.enterFirstJudgment()
    const [b, c] = s.children()
    if (!b || !c) throw new Error('children should exist')
    s.submitFirst(b.id, 2) // グレー
    s.submitFirst(c.id, 1) // セーフ
    expect(() => s.submitFirst(b.id, 3)).toThrow()
    expect(() => s.submitFirst(b.id, -1)).toThrow()
  })

  it('ジャッジ未選択で enterFirstJudgment はエラー', () => {
    const s = new ScoreSession()
    start(s)
    s.enterParentSetup()
    expect(() => s.enterFirstJudgment()).toThrow()
  })

  it('totalRounds 未指定なら人数ぶんになる', () => {
    const s = new ScoreSession()
    start(s, ['A', 'B', 'C', 'D'])
    expect(s.config.totalRounds).toBe(4)
  })

  it('themeId 未指定なら Tailwind、指定時は設定に保存される', () => {
    const fallback = new ScoreSession()
    start(fallback)
    expect(fallback.config.themeId).toBe(DEFAULT_THEME_ID)

    const cyber = new ScoreSession()
    start(cyber, ['A', 'B', 'C'], { totalRounds: null, timerSeconds: 0, themeId: 'cyber' })
    expect(cyber.config.themeId).toBe('cyber')

    const pink = new ScoreSession()
    start(pink, ['A', 'B', 'C'], { totalRounds: null, timerSeconds: 0, themeId: 'pink' })
    expect(pink.config.themeId).toBe('pink')

    const orange = new ScoreSession()
    start(orange, ['A', 'B', 'C'], { totalRounds: null, timerSeconds: 0, themeId: 'orange' })
    expect(orange.config.themeId).toBe('orange')
  })

  it('timerSeconds 設定なし（0）ならタイマーは start されない', () => {
    const s = new ScoreSession()
    start(s)
    s.enterParentSetup()
    s.setJudge(JUDGE_2OPT)
    s.enterFirstJudgment()
    for (const c of s.children()) s.submitFirst(c.id, 0)
    s.advanceToSecond()
    for (const c of s.children()) s.submitSecond(c.id, 0)
    s.advanceToFinal()
    expect(s.timer.isRunning).toBe(false)
    expect(s.timer.totalSeconds).toBe(0)
  })

  it('timerSeconds > 0 なら advanceToFinal で start、finalizeRound で stop', () => {
    const s = new ScoreSession()
    start(s, ['A', 'B', 'C'], { totalRounds: null, timerSeconds: 60 })
    s.enterParentSetup()
    s.setJudge(JUDGE_2OPT)
    s.enterFirstJudgment()
    for (const c of s.children()) s.submitFirst(c.id, 0)
    s.advanceToSecond()
    for (const c of s.children()) s.submitSecond(c.id, 0)
    s.advanceToFinal()
    expect(s.timer.isRunning).toBe(true)
    expect(s.timer.totalSeconds).toBe(60)
    expect(s.timer.remainingSeconds).toBe(60)

    for (const c of s.children()) s.submitFinal(c.id, 0)
    s.finalizeRound()
    expect(s.timer.isRunning).toBe(false)
  })

  it('standings はスコア降順', () => {
    const s = new ScoreSession()
    start(s, ['A', 'B', 'C'])
    s.players[0]!.score = 1
    s.players[1]!.score = 5
    s.players[2]!.score = 3
    const ranked = s.standings()
    expect(ranked.map((p) => p.name)).toEqual(['B', 'C', 'A'])
  })

  it('snapshot からフェーズ、点数、判断入力、履歴、タイマーを復元できる', () => {
    const s = new ScoreSession(new CountdownTimer(noopScheduler))
    start(s, ['A', 'B', 'C'], { totalRounds: 3, timerSeconds: 60, themeId: 'cyber' })
    s.enterParentSetup()
    s.setJudge(JUDGE_2OPT)
    s.enterFirstJudgment()
    const [b, c] = s.children()
    if (!b || !c) throw new Error('children should exist')
    s.submitFirst(b.id, 0)
    s.submitFirst(c.id, 1)
    s.advanceToSecond()
    s.submitSecond(b.id, 1)
    s.submitSecond(c.id, 1)
    s.advanceToFinal()
    s.submitFinal(b.id, 1)

    const snapshot = s.toSnapshot(1_000)
    const parsed = parseScoreSessionSnapshot(JSON.parse(JSON.stringify(snapshot)))
    expect(parsed).not.toBeNull()

    const restored = new ScoreSession(new CountdownTimer(noopScheduler))
    restored.restoreSnapshot(parsed!, 16_000)
    expect(restored.phase).toBe(Phase.FinalJudgment)
    expect(restored.config.themeId).toBe('cyber')
    expect(restored.players.map((p) => p.name)).toEqual(['A', 'B', 'C'])
    expect(restored.roundState?.firstJudgments).toEqual({ 1: 0, 2: 1 })
    expect(restored.roundState?.secondJudgments).toEqual({ 1: 1, 2: 1 })
    expect(restored.roundState?.finalJudgments).toEqual({ 1: 1 })
    expect(restored.history).toEqual([])
    expect(restored.timer.isRunning).toBe(true)
    expect(restored.timer.remainingSeconds).toBe(45)
  })

  it('期限切れのタイマーを snapshot から復元できる', () => {
    const s = new ScoreSession(new CountdownTimer(noopScheduler))
    start(s, ['A', 'B', 'C'], { totalRounds: 3, timerSeconds: 10 })
    s.enterParentSetup()
    s.setJudge(JUDGE_2OPT)
    s.enterFirstJudgment()
    for (const child of s.children()) s.submitFirst(child.id, 0)
    s.advanceToSecond()
    for (const child of s.children()) s.submitSecond(child.id, 0)
    s.advanceToFinal()

    const snapshot = s.toSnapshot(1_000)
    const restored = new ScoreSession(new CountdownTimer(noopScheduler))
    restored.restoreSnapshot(snapshot, 12_000)
    expect(restored.phase).toBe(Phase.FinalJudgment)
    expect(restored.timer.isRunning).toBe(false)
    expect(restored.timer.remainingSeconds).toBe(0)
    expect(restored.timer.expired).toBe(true)
  })

  it('不正な snapshot は parse で null になる', () => {
    expect(parseScoreSessionSnapshot({ sessionVersion: 999 })).toBeNull()
    expect(parseScoreSessionSnapshot({ sessionVersion: 1, phase: 'BAD' })).toBeNull()
  })

  it('resetToSetup は進行中ゲームを初期化する', () => {
    const s = new ScoreSession()
    start(s)
    s.resetToSetup()
    expect(s.phase).toBe(Phase.Setup)
    expect(s.players).toEqual([])
    expect(s.roundState).toBeNull()
    expect(s.history).toEqual([])
  })
})

describe('rankedStandings', () => {
  it('全員違う点数なら 1, 2, 3 と単調', () => {
    const players = [
      { id: 0, name: 'A', score: 1 },
      { id: 1, name: 'B', score: 5 },
      { id: 2, name: 'C', score: 3 },
    ]
    const ranked = rankedStandings(players)
    expect(ranked.map((r) => `${r.rank}:${r.player.name}`)).toEqual(['1:B', '2:C', '3:A'])
  })

  it('同点なら同順位、その後は人数分飛ばす（standard competition ranking）', () => {
    // A=5, B=5, C=3, D=3, E=0 → 1位タイ:A,B / 3位タイ:C,D / 5位:E
    const players = [
      { id: 0, name: 'A', score: 5 },
      { id: 1, name: 'B', score: 5 },
      { id: 2, name: 'C', score: 3 },
      { id: 3, name: 'D', score: 3 },
      { id: 4, name: 'E', score: 0 },
    ]
    const ranked = rankedStandings(players)
    expect(ranked.map((r) => r.rank)).toEqual([1, 1, 3, 3, 5])
  })

  it('全員同点なら全員 1 位', () => {
    const players = [
      { id: 0, name: 'A', score: 7 },
      { id: 1, name: 'B', score: 7 },
      { id: 2, name: 'C', score: 7 },
    ]
    expect(rankedStandings(players).map((r) => r.rank)).toEqual([1, 1, 1])
  })
})
