import { Phase } from '../types'
import type { IdMap } from '../types'
import type { ScoreSession } from './session.svelte'

export type GmJudgmentMessages = {
  empty: string
  progress: string
  complete: string
}

export type GmFinalJudgmentMessages = GmJudgmentMessages & {
  expired: string
}

export type GmMessages = {
  setup: string
  roundStart: string
  parentSetup: string
  firstJudgment: GmJudgmentMessages
  secondJudgment: GmJudgmentMessages
  finalJudgment: GmFinalJudgmentMessages
  roundScore: string
  gameOver: string
}

export type GmMessagesFile = {
  version: number
  messages: GmMessages
}

export const fallbackGmMessages: GmMessages = {
  setup: 'まずは参加する人を決めましょう。名前とラウンド数、タイマーを確認したら始められます。',
  roundStart: 'このラウンドの親は {parent} さんです。準備ができたらジャッジを選びましょう。',
  parentSetup: '親は今回の判断軸になるジャッジカードを1枚選んでください。',
  firstJudgment: {
    empty: 'まずは直感で第1判断です。今ある情報だけで選んでみましょう。',
    progress: '第1判断は {done}/{total} 人まで入力済みです。全員そろうまで待ちましょう。',
    complete: '全員の第1判断がそろいました。親は追加情報を出して、次へ進めましょう。',
  },
  secondJudgment: {
    empty: '追加情報をふまえて第2判断です。さっきの判断が変わっても大丈夫です。',
    progress: '第2判断は {done}/{total} 人まで入力済みです。落ち着いて選びましょう。',
    complete: '第2判断がそろいました。ここから話し合いに入ります。',
  },
  finalJudgment: {
    empty: '話し合いの結論として、最終判断を選んでください。',
    progress: '最終判断は {done}/{total} 人まで入力済みです。納得できる選択をしましょう。',
    complete: '全員の最終判断がそろいました。採点に進めます。',
    expired: '時間です。まだ未入力の人がいれば、最終判断を入れてから採点しましょう。',
  },
  roundScore: 'このラウンドの結果です。判断がどう動いたかを見て、次へ進みましょう。',
  gameOver: 'ゲーム終了です。順位だけでなく、判断が揺れた場面もぜひ振り返ってみてください。',
}

type TemplateValue = string | number
type TemplateValues = Record<string, TemplateValue>

export function renderGmTemplate(template: string, values: TemplateValues): string {
  return template.replace(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g, (match, key: string) => {
    const value = values[key]
    return value === undefined ? match : String(value)
  })
}

export function getGmMessage(messages: GmMessages, session: ScoreSession): string {
  const values = baseTemplateValues(session)

  switch (session.phase) {
    case Phase.Setup:
      return renderGmTemplate(messages.setup, values)
    case Phase.RoundStart:
      return renderGmTemplate(messages.roundStart, values)
    case Phase.ParentSetup:
      return renderGmTemplate(messages.parentSetup, values)
    case Phase.FirstJudgment:
      return judgmentMessage(messages.firstJudgment, session.roundState?.firstJudgments, values)
    case Phase.SecondJudgment:
      return judgmentMessage(messages.secondJudgment, session.roundState?.secondJudgments, values)
    case Phase.FinalJudgment:
      if (session.timer.expired) {
        return renderGmTemplate(messages.finalJudgment.expired, values)
      }
      return judgmentMessage(messages.finalJudgment, session.roundState?.finalJudgments, values)
    case Phase.RoundScore:
      return renderGmTemplate(messages.roundScore, values)
    case Phase.GameOver:
      return renderGmTemplate(messages.gameOver, values)
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

  const firstJudgment = parseJudgmentMessages(messages.firstJudgment)
  const secondJudgment = parseJudgmentMessages(messages.secondJudgment)
  const finalJudgment = parseFinalJudgmentMessages(messages.finalJudgment)
  if (!firstJudgment || !secondJudgment || !finalJudgment) return null

  if (
    typeof messages.setup !== 'string' ||
    typeof messages.roundStart !== 'string' ||
    typeof messages.parentSetup !== 'string' ||
    typeof messages.roundScore !== 'string' ||
    typeof messages.gameOver !== 'string'
  ) {
    return null
  }

  return {
    setup: messages.setup,
    roundStart: messages.roundStart,
    parentSetup: messages.parentSetup,
    firstJudgment,
    secondJudgment,
    finalJudgment,
    roundScore: messages.roundScore,
    gameOver: messages.gameOver,
  }
}

function judgmentMessage(
  messages: GmJudgmentMessages,
  judgments: IdMap | undefined,
  values: TemplateValues,
): string {
  const done = judgments ? Object.keys(judgments).length : 0
  const total = Number(values.total)
  const key = progressKey(done, total)
  return renderGmTemplate(messages[key], { ...values, done, total })
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

function parseJudgmentMessages(value: unknown): GmJudgmentMessages | null {
  const obj = asRecord(value)
  if (!obj) return null
  if (
    typeof obj.empty !== 'string' ||
    typeof obj.progress !== 'string' ||
    typeof obj.complete !== 'string'
  ) {
    return null
  }
  return { empty: obj.empty, progress: obj.progress, complete: obj.complete }
}

function parseFinalJudgmentMessages(value: unknown): GmFinalJudgmentMessages | null {
  const base = parseJudgmentMessages(value)
  const obj = asRecord(value)
  if (!base || !obj || typeof obj.expired !== 'string') return null
  return { ...base, expired: obj.expired }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null
}
