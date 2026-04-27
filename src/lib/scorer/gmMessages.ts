import { Phase } from '../types'
import type { IdMap } from '../types'
import type { ScoreSession } from './session.svelte'

/** 1 状態あたりの GM セリフ。1 文でも複数文の配列でも書ける（後方互換）。 */
export type GmMessageSequence = string | string[]

export type GmJudgmentMessages = {
  empty: GmMessageSequence
  progress: GmMessageSequence
  complete: GmMessageSequence
}

export type GmFinalJudgmentMessages = GmJudgmentMessages & {
  expired: GmMessageSequence
}

export type GmMessages = {
  setup: GmMessageSequence
  roundStart: GmMessageSequence
  parentSetup: GmMessageSequence
  firstJudgment: GmJudgmentMessages
  secondJudgment: GmJudgmentMessages
  finalJudgment: GmFinalJudgmentMessages
  roundScore: GmMessageSequence
  gameOver: GmMessageSequence
}

export type GmMessagesFile = {
  version: number
  messages: GmMessages
}

export const fallbackGmMessages: GmMessages = {
  setup: [
    'こんにちは！後出しジャッジへようこそ。',
    'まずは参加する人と、名前・ラウンド数・タイマーを決めましょう。',
    '準備ができたら「ゲームスタート」を押してください！',
  ],
  roundStart: [
    'ラウンド {round}/{totalRounds} のはじまりです！',
    '今回の親は {parent} さんですね。',
    '親はジャッジカードを選ぶ準備をしましょう。',
  ],
  parentSetup: [
    '{parent} さん、ジャッジカードを選んでください。',
    '選んだジャッジで、みんなが判断していきます。',
  ],
  firstJudgment: {
    empty: [
      'テーマは「{judge}」です。',
      'まずは第1判断！今ある情報だけで、直感で選んでみましょう。',
      'ここで意見が割れても全然 OK です。',
    ],
    progress: '残り {remaining} 人の判断を待っています。',
    complete: [
      '全員の第1判断がそろいました！',
      '次は親の {parent} さんの番。',
      'アイテムカードを出して、子の判断を揺さぶりましょう。',
      '親はカードについて何も言わずに出すのがルールです。',
    ],
  },
  secondJudgment: {
    empty: [
      '親が情報を追加しました。',
      'アイテムは「事実」として扱います。',
      'これをふまえて、第2判断をしましょう。',
      '判断を変えなくても、変えても OK です。',
    ],
    progress: '残り {remaining} 人。落ち着いて選びましょう。',
    complete: [
      '第2判断がそろいました。',
      'ここからは話し合いの時間です！',
      '子のみんなもアイテムカードを出して反論できますよ。',
      '自分の判断が正しいことを、理由とアイテムで証明しましょう。',
    ],
  },
  finalJudgment: {
    empty: [
      '話し合いをふまえて、最終判断を選んでください。',
      '親は、第2判断から最終判断で意見を変えた子の人数分が得点。',
      '子は、自分と同じ最終判断に他の子を引き込んだ人数分が得点。',
      'ただし、第2判断から最終判断で自分が意見を変えた場合、子は得点になりません。',
    ],
    progress: '残り {remaining} 人。納得できる選択を！',
    complete: '全員の最終判断がそろいました。採点に進みましょう！',
    expired: [
      '時間切れです！',
      '未入力の人がいたら最終判断を入れてから採点しましょう。',
    ],
  },
  roundScore: [
    'このラウンドの結果です。',
    '判断がどう動いたかを見て、次のラウンドへ進みましょう。',
  ],
  gameOver: [
    'ゲーム終了です！お疲れさまでした。',
    '順位だけでなく、判断が揺れた場面もぜひ振り返ってみてください。',
    'もう一試合いきますか？',
  ],
}

type TemplateValue = string | number
type TemplateValues = Record<string, TemplateValue>

export function renderGmTemplate(template: string, values: TemplateValues): string {
  return template.replace(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g, (match, key: string) => {
    const value = values[key]
    return value === undefined ? match : String(value)
  })
}

function renderSequence(sequence: GmMessageSequence, values: TemplateValues): string[] {
  const arr = Array.isArray(sequence) ? sequence : [sequence]
  return arr.map((line) => renderGmTemplate(line, values))
}

export function getGmMessage(messages: GmMessages, session: ScoreSession): string[] {
  const values = baseTemplateValues(session)

  switch (session.phase) {
    case Phase.Setup:
      return renderSequence(messages.setup, values)
    case Phase.RoundStart:
      return renderSequence(messages.roundStart, values)
    case Phase.ParentSetup:
      return renderSequence(messages.parentSetup, values)
    case Phase.FirstJudgment:
      return judgmentMessage(messages.firstJudgment, session.roundState?.firstJudgments, values)
    case Phase.SecondJudgment:
      return judgmentMessage(messages.secondJudgment, session.roundState?.secondJudgments, values)
    case Phase.FinalJudgment:
      if (session.timer.expired) {
        return renderSequence(messages.finalJudgment.expired, values)
      }
      return judgmentMessage(messages.finalJudgment, session.roundState?.finalJudgments, values)
    case Phase.RoundScore:
      return renderSequence(messages.roundScore, values)
    case Phase.GameOver:
      return renderSequence(messages.gameOver, values)
  }
}

export async function loadGmMessages(
  fetcher: typeof fetch = globalThis.fetch,
  baseUrl: string = import.meta.env.BASE_URL,
): Promise<GmMessages> {
  try {
    const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
    const res = await fetcher(`${base}data/gm_messages.json`)
    if (!res.ok) return fallbackGmMessages
    const parsed = parseGmMessagesFile(await res.json())
    return parsed ?? fallbackGmMessages
  } catch {
    return fallbackGmMessages
  }
}

export function parseGmMessagesFile(value: unknown): GmMessages | null {
  const root = asRecord(value)
  if (!root || typeof root.version !== 'number') return null
  const messages = asRecord(root.messages)
  if (!messages) return null

  const setup = asMessageSequence(messages.setup)
  const roundStart = asMessageSequence(messages.roundStart)
  const parentSetup = asMessageSequence(messages.parentSetup)
  const roundScore = asMessageSequence(messages.roundScore)
  const gameOver = asMessageSequence(messages.gameOver)
  const firstJudgment = parseJudgmentMessages(messages.firstJudgment)
  const secondJudgment = parseJudgmentMessages(messages.secondJudgment)
  const finalJudgment = parseFinalJudgmentMessages(messages.finalJudgment)

  if (
    setup === null ||
    roundStart === null ||
    parentSetup === null ||
    roundScore === null ||
    gameOver === null ||
    !firstJudgment ||
    !secondJudgment ||
    !finalJudgment
  ) {
    return null
  }

  return {
    setup,
    roundStart,
    parentSetup,
    firstJudgment,
    secondJudgment,
    finalJudgment,
    roundScore,
    gameOver,
  }
}

function judgmentMessage(
  messages: GmJudgmentMessages,
  judgments: IdMap | undefined,
  values: TemplateValues,
): string[] {
  const done = judgments ? Object.keys(judgments).length : 0
  const total = Number(values.total)
  const remaining = Math.max(0, total - done)
  const key = progressKey(done, total)
  return renderSequence(messages[key], { ...values, done, total, remaining })
}

function progressKey(done: number, total: number): keyof GmJudgmentMessages {
  if (done <= 0) return 'empty'
  if (total > 0 && done >= total) return 'complete'
  return 'progress'
}

function baseTemplateValues(session: ScoreSession): TemplateValues {
  const totalRounds = session.config.totalRounds ?? session.players.length
  const total = safeChildrenCount(session)
  return {
    parent: safeParentName(session),
    judge: safeJudgeQuestion(session),
    round: session.currentRoundNumber(),
    total,
    totalRounds,
  }
}

function safeParentName(session: ScoreSession): string {
  try {
    return session.parent().name
  } catch {
    return '親'
  }
}

function safeChildrenCount(session: ScoreSession): number {
  try {
    return session.children().length
  } catch {
    return 0
  }
}

function safeJudgeQuestion(session: ScoreSession): string {
  return session.roundState?.judge?.question ?? 'ジャッジ'
}

function asMessageSequence(value: unknown): GmMessageSequence | null {
  if (typeof value === 'string') return value
  if (Array.isArray(value) && value.every((v) => typeof v === 'string')) {
    return value as string[]
  }
  return null
}

function parseJudgmentMessages(value: unknown): GmJudgmentMessages | null {
  const obj = asRecord(value)
  if (!obj) return null
  const empty = asMessageSequence(obj.empty)
  const progress = asMessageSequence(obj.progress)
  const complete = asMessageSequence(obj.complete)
  if (empty === null || progress === null || complete === null) return null
  return { empty, progress, complete }
}

function parseFinalJudgmentMessages(value: unknown): GmFinalJudgmentMessages | null {
  const base = parseJudgmentMessages(value)
  const obj = asRecord(value)
  if (!base || !obj) return null
  const expired = asMessageSequence(obj.expired)
  if (expired === null) return null
  return { ...base, expired }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null
}
