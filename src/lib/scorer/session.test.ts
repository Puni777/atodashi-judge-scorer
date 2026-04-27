/**
 * `tests/test_scorer_session.py` の関連ケースを vitest に移植したもの。
 * 数値が Python 実装と一致することを確認するのが目的。
 */
import { describe, expect, it } from 'vitest'
import { Phase } from '../types'
import type { JudgeCard, ScorerConfig } from '../types'
import { ScoreSession } from './session.svelte'

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
  config: ScorerConfig = { totalRounds: null },
): void {
  s.startGame(names, config)
}

describe('ScoreSession', () => {
  it('プレイヤー人数 1 / 7 はエラー', () => {
    expect(() => start(new ScoreSession(), ['A'])).toThrow()
    expect(() => start(new ScoreSession(), ['A', 'B', 'C', 'D', 'E', 'F', 'G'])).toThrow()
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
    start(s, ['A', 'B', 'C'], { totalRounds: 3 })
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

  it('standings はスコア降順', () => {
    const s = new ScoreSession()
    start(s, ['A', 'B', 'C'])
    s.players[0]!.score = 1
    s.players[1]!.score = 5
    s.players[2]!.score = 3
    const ranked = s.standings()
    expect(ranked.map((p) => p.name)).toEqual(['B', 'C', 'A'])
  })
})
