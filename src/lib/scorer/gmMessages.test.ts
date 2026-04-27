import { describe, expect, it } from 'vitest'
import type { GmMessageSequence, GmMessages, GmMessagesFile } from './gmMessages'
import {
  fallbackGmMessages,
  getGmMessage,
  loadGmMessages,
  parseGmMessagesFile,
  renderGmTemplate,
} from './gmMessages'
import { ScoreSession } from './session.svelte'
import type { JudgeCard } from '../types'
import { Phase } from '../types'

const JUDGE_2OPT: JudgeCard = {
  id: 'jdg_001',
  question: '許せる？',
  options: ['許せる', '許せない'],
}

const VALID_FILE: GmMessagesFile = {
  version: 2,
  messages: fallbackGmMessages,
}

function asArray(seq: GmMessageSequence): string[] {
  return Array.isArray(seq) ? seq : [seq]
}

function startSession(): ScoreSession {
  const session = new ScoreSession()
  session.startGame(['A', 'B', 'C'], { totalRounds: 3, timerSeconds: 0 })
  return session
}

function enterFirst(session: ScoreSession): void {
  session.enterParentSetup()
  session.setJudge(JUDGE_2OPT)
  session.enterFirstJudgment()
}

function enterSecond(session: ScoreSession): void {
  enterFirst(session)
  for (const child of session.children()) session.submitFirst(child.id, 0)
  session.advanceToSecond()
}

function enterFinal(session: ScoreSession): void {
  enterSecond(session)
  for (const child of session.children()) session.submitSecond(child.id, 0)
  session.advanceToFinal()
}

describe('GM message rendering', () => {
  it('差し込み変数を置換し、未知の変数は残す', () => {
    expect(
      renderGmTemplate('{parent}:{done}/{total}:{remaining}:{unknown}', {
        parent: 'A',
        done: 1,
        total: 2,
        remaining: 1,
      }),
    ).toBe('A:1/2:1:{unknown}')
  })

  it('Setup と RoundStart のセリフを配列で返す', () => {
    const setup = new ScoreSession()
    expect(getGmMessage(fallbackGmMessages, setup)).toEqual(asArray(fallbackGmMessages.setup))

    const started = startSession()
    const lines = getGmMessage(fallbackGmMessages, started)
    expect(lines.length).toBeGreaterThan(0)
    expect(lines.some((l) => l.includes('A さん'))).toBe(true)
  })

  it('ParentSetup と RoundScore と GameOver のセリフを配列で返す', () => {
    const session = startSession()
    session.enterParentSetup()
    const parentLines = getGmMessage(fallbackGmMessages, session)
    expect(parentLines.some((l) => l.includes('A さん'))).toBe(true)

    session.setJudge(JUDGE_2OPT)
    session.enterFirstJudgment()
    for (const child of session.children()) session.submitFirst(child.id, 0)
    session.advanceToSecond()
    for (const child of session.children()) session.submitSecond(child.id, 0)
    session.advanceToFinal()
    for (const child of session.children()) session.submitFinal(child.id, 0)
    session.finalizeRound()
    expect(session.phase).toBe(Phase.RoundScore)
    expect(getGmMessage(fallbackGmMessages, session)).toEqual(asArray(fallbackGmMessages.roundScore))

    for (let i = 0; i < 2; i++) {
      session.nextRound()
      session.enterParentSetup()
      session.setJudge(JUDGE_2OPT)
      session.enterFirstJudgment()
      for (const child of session.children()) session.submitFirst(child.id, 0)
      session.advanceToSecond()
      for (const child of session.children()) session.submitSecond(child.id, 0)
      session.advanceToFinal()
      for (const child of session.children()) session.submitFinal(child.id, 0)
      session.finalizeRound()
    }
    session.nextRound()
    expect(session.phase).toBe(Phase.GameOver)
    expect(getGmMessage(fallbackGmMessages, session)).toEqual(asArray(fallbackGmMessages.gameOver))
  })

  it('第1判断の empty / progress / complete を返し、{judge} と {remaining} を埋め込む', () => {
    const session = startSession()
    enterFirst(session)
    const empty = getGmMessage(fallbackGmMessages, session)
    expect(empty.some((l) => l.includes('許せる？'))).toBe(true)

    const [firstChild] = session.children()
    if (!firstChild) throw new Error('child should exist')
    session.submitFirst(firstChild.id, 0)
    const progress = getGmMessage(fallbackGmMessages, session)
    expect(progress.length).toBe(1)
    expect(progress[0]).toContain('1')

    for (const child of session.children().filter((c) => c.id !== firstChild.id)) {
      session.submitFirst(child.id, 0)
    }
    const complete = getGmMessage(fallbackGmMessages, session)
    expect(complete.some((l) => l.includes('そろいました'))).toBe(true)
  })

  it('第2判断の empty / progress / complete を返す', () => {
    const session = startSession()
    enterSecond(session)
    expect(getGmMessage(fallbackGmMessages, session).length).toBeGreaterThan(0)

    const [firstChild] = session.children()
    if (!firstChild) throw new Error('child should exist')
    session.submitSecond(firstChild.id, 0)
    expect(getGmMessage(fallbackGmMessages, session).length).toBe(1)

    for (const child of session.children().filter((c) => c.id !== firstChild.id)) {
      session.submitSecond(child.id, 0)
    }
    expect(getGmMessage(fallbackGmMessages, session).length).toBeGreaterThan(0)
  })

  it('最終判断の empty / progress / complete / expired を返す', () => {
    const session = startSession()
    enterFinal(session)
    expect(getGmMessage(fallbackGmMessages, session).length).toBeGreaterThan(0)

    const [firstChild] = session.children()
    if (!firstChild) throw new Error('child should exist')
    session.submitFinal(firstChild.id, 0)
    const progress = getGmMessage(fallbackGmMessages, session)
    expect(progress.length).toBe(1)

    for (const child of session.children().filter((c) => c.id !== firstChild.id)) {
      session.submitFinal(child.id, 0)
    }
    const complete = getGmMessage(fallbackGmMessages, session)
    expect(complete).toEqual(asArray(fallbackGmMessages.finalJudgment.complete))

    session.timer.expired = true
    expect(getGmMessage(fallbackGmMessages, session)).toEqual(
      asArray(fallbackGmMessages.finalJudgment.expired),
    )
  })
})

describe('GM message loader', () => {
  it('正常な v2 JSON を読める', async () => {
    let requestedUrl = ''
    const fetcher: typeof fetch = async (input) => {
      requestedUrl = String(input)
      return {
        ok: true,
        json: async () => VALID_FILE,
      } as Response
    }

    const messages = await loadGmMessages(fetcher, '/atodashi-judge-scorer/')
    expect(requestedUrl).toBe('/atodashi-judge-scorer/data/gm_messages.json')
    expect(messages).toEqual(fallbackGmMessages)
  })

  it('v1 形式の単一文 JSON も後方互換で読める', () => {
    const v1: GmMessagesFile = {
      version: 1,
      messages: {
        setup: 'まずは参加する人を決めましょう。',
        roundStart: '親は {parent} さんです。',
        parentSetup: 'ジャッジを選んでください。',
        firstJudgment: { empty: '第1判断', progress: 'p', complete: 'c' },
        secondJudgment: { empty: '第2判断', progress: 'p', complete: 'c' },
        finalJudgment: { empty: '最終', progress: 'p', complete: 'c', expired: 'e' },
        roundScore: 'スコアを確認',
        gameOver: 'おしまい',
      } as GmMessages,
    }
    const parsed = parseGmMessagesFile(v1)
    expect(parsed).not.toBeNull()
    expect(parsed?.setup).toBe('まずは参加する人を決めましょう。')
  })

  it('不正または欠落したJSONならフォールバックに倒れる', async () => {
    const invalidFetcher: typeof fetch = async () => ({
      ok: true,
      json: async () => ({ version: 1, messages: { setup: 'missing fields' } }),
    } as Response)

    const failingFetcher: typeof fetch = async () => {
      throw new Error('network error')
    }

    expect(parseGmMessagesFile({ version: 1, messages: { setup: 'missing fields' } })).toBeNull()
    await expect(loadGmMessages(invalidFetcher, '/')).resolves.toBe(fallbackGmMessages)
    await expect(loadGmMessages(failingFetcher, '/')).resolves.toBe(fallbackGmMessages)
  })

  it('配列か文字列以外の値は不正とみなす', () => {
    const invalid = {
      version: 2,
      messages: {
        ...fallbackGmMessages,
        setup: 123,
      },
    }
    expect(parseGmMessagesFile(invalid)).toBeNull()
  })
})
