export type JudgeCard = {
  id: string
  question: string
  options: readonly string[]
}

export type JudgesFile = {
  version: number
  type: 'judge'
  cards: JudgeCard[]
}

export type Player = {
  id: number
  name: string
  score: number
}

export enum Phase {
  Setup = 'SETUP',
  RoundStart = 'ROUND_START',
  ParentSetup = 'PARENT_SETUP',
  FirstJudgment = 'FIRST_JUDGMENT',
  SecondJudgment = 'SECOND_JUDGMENT',
  FinalJudgment = 'FINAL_JUDGMENT',
  RoundScore = 'ROUND_SCORE',
  GameOver = 'GAME_OVER',
}

/** プレイヤーID → 値（option index / score delta）。`Map` ではなく POJO にしているのは
 *  Svelte 5 の `$state` deep proxy が Map のミューテーションを観測してくれないため。 */
export type IdMap = Record<number, number>

export type RoundState = {
  parentId: number
  judge: JudgeCard | null
  firstJudgments: IdMap
  secondJudgments: IdMap
  finalJudgments: IdMap
  scoreDelta: IdMap
}

export const THEME_OPTIONS = [
  { id: 'tailwind', name: 'Tailwind' },
  { id: 'light', name: 'Light' },
  { id: 'dark', name: 'Dark' },
  { id: 'cyber', name: 'Cyber' },
  { id: 'pink', name: 'Pink' },
  { id: 'orange', name: 'Orange' },
] as const

export type ThemeId = (typeof THEME_OPTIONS)[number]['id']

export const DEFAULT_THEME_ID: ThemeId = 'tailwind'

export type ScorerConfig = {
  /** null → プレイヤー人数（親一巡）で確定 */
  totalRounds: number | null
  /** 最終判断のタイマー秒数。0 = OFF。デフォルトは 180 秒（3 分） */
  timerSeconds: number
  /** 画面全体の見た目。未指定なら Tailwind default */
  themeId?: ThemeId
}

export const DEFAULT_TIMER_SECONDS = 180
