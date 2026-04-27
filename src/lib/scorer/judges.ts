import type { JudgeCard, JudgesFile } from '../types'

/** `public/data/judges.json` を fetch して 12 枚の JudgeCard を返す。
 *  Vite の `BASE_URL` を吸収するのでローカル / GitHub Pages 双方で動く。 */
export async function loadJudges(): Promise<JudgeCard[]> {
  const res = await fetch(`${import.meta.env.BASE_URL}data/judges.json`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = (await res.json()) as JudgesFile
  return data.cards ?? []
}
