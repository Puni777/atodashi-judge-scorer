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

export type ScorerConfig = {
  /** null → プレイヤー人数（親一巡）で確定 */
  totalRounds: number | null
}
