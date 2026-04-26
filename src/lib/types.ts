export type JudgeCard = {
  id: string
  question: string
  options: string[]
}

export type JudgesFile = {
  version: number
  type: 'judge'
  cards: JudgeCard[]
}
