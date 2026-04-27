import { describe, expect, it } from 'vitest'
import type { GmMessagesFile } from './gmMessages'
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
  version: 1,
  messages: fallbackGmMessages,
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
    expect(renderGmTemplate('{parent}:{done}/{total}:{unknown}', {
      parent: 'A',
      done: 1,
      total: 2,
    })).toBe('A:1/2:{unknown}')
  })

  it('Setup と RoundStart のセリフを返す', () => {
    const setup = new ScoreSession()
    expect(getGmMessage(fallbackGmMessages, setup)).toBe(fallbackGmMessages.setup)

    const started = startSession()
    expect(getGmMessage(fallbackGmMessages, started)).toContain('A さん')
  })

  it('ParentSetup と RoundScore と GameOver のセリフを返す', () => {
    const session = startSession()
    session.enterParentSetup()
    expect(getGmMessage(fallbackGmMessages, session)).toBe(fallbackGmMessages.parentSetup)

    session.setJudge(JUDGE_2OPT)
    session.enterFirstJudgment()
    for (const child of session.children()) session.submitFirst(child.id, 0)
    session.advanceToSecond()
    for (const child of session.children()) session.submitSecond(child.id, 0)
    session.advanceToFinal()
    for (const child of session.children()) session.submitFinal(child.id, 0)
    session.finalizeRound()
    expect(session.phase).toBe(Phase.RoundScore)
    expect(getGmMessage(fallbackGmMessages, session)).toBe(fallbackGmMessages.roundScore)

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
    session.nextRound()
    expect(session.phase).toBe(Phase.GameOver)
    expect(getGmMessage(fallbackGmMessages, session)).toBe(fallbackGmMessages.gameOver)
  })

  it('第1判断の empty / progress / complete を返す', () => {
    const session = startSession()
    enterFirst(session)
    expect(getGmMessage(fallbackGmMessages, session)).toBe(fallbackGmMessages.firstJudgment.empty)

    const [firstChild] = session.children()
    if (!firstChild) throw new Error('child should exist')
    session.submitFirst(firstChild.id, 0)
    expect(getGmMessage(fallbackGmMessages, session)).toBe(
      renderGmTemplate(fallbackGmMessages.firstJudgment.progress, { done: 1, total: 2 }),
    )

    for (const child of session.children().filter((c) => c.id !== firstChild.id)) {
      session.submitFirst(child.id, 0)
    }
    expect(getGmMessage(fallbackGmMessages, session)).toBe(fallbackGmMessages.firstJudgment.complete)
  })

  it('第2判断の empty / progress / complete を返す', () => {
    const session = startSession()
    enterSecond(session)
    expect(getGmMessage(fallbackGmMessages, session)).toBe(fallbackGmMessages.secondJudgment.empty)

    const [firstChild] = session.children()
    if (!firstChild) throw new Error('child should exist')
    session.submitSecond(firstChild.id, 0)
    expect(getGmMessage(fallbackGmMessages, session)).toBe(
      renderGmTemplate(fallbackGmMessages.secondJudgment.progress, { done: 1, total: 2 }),
    )

    for (const child of session.children().filter((c) => c.id !== firstChild.id)) {
      session.submitSecond(child.id, 0)
    }
    expect(getGmMessage(fallbackGmMessages, session)).toBe(fallbackGmMessages.secondJudgment.complete)
  })

  it('最終判断の empty / progress / complete / expired を返す', () => {
    const session = startSession()
    enterFinal(session)
    expect(getGmMessage(fallbackGmMessages, session)).toBe(fallbackGmMessages.finalJudgment.empty)

    const [firstChild] = session.children()
    if (!firstChild) throw new Error('child should exist')
    session.submitFinal(firstChild.id, 0)
    expect(getGmMessage(fallbackGmMessages, session)).toBe(
      renderGmTemplate(fallbackGmMessages.finalJudgment.progress, { done: 1, total: 2 }),
    )

    for (const child of session.children().filter((c) => c.id !== firstChild.id)) {
      session.submitFinal(child.id, 0)
    }
    expect(getGmMessage(fallbackGmMessages, session)).toBe(fallbackGmMessages.finalJudgment.complete)

    session.timer.expired = true
    expect(getGmMessage(fallbackGmMessages, session)).toBe(fallbackGmMessages.finalJudgment.expired)
  })
})

describe('GM message loader', () => {
  it('正常なJSONを読める', async () => {
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
})
