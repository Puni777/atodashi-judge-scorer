import { describe, expect, it } from 'vitest'
import {
  fallbackAudioAssets,
  loadAudioAssets,
  parseAudioAssets,
  type AudioAssets,
} from './assets'

const VALID_FILE: AudioAssets = fallbackAudioAssets

describe('audio asset catalog', () => {
  it('valid な音声カタログを parse できる', () => {
    expect(parseAudioAssets(VALID_FILE)).toEqual(fallbackAudioAssets)
  })

  it('不正な音声カタログは null にする', () => {
    expect(parseAudioAssets({ version: 1, se: {}, bgm: {} })).toBeNull()
    expect(parseAudioAssets({ version: 2, se: VALID_FILE.se, bgm: VALID_FILE.bgm })).toBeNull()
  })

  it('音量は 0〜1 に丸める', () => {
    const parsed = parseAudioAssets({
      ...VALID_FILE,
      se: {
        ...VALID_FILE.se,
        alarm: { ...VALID_FILE.se.alarm, volume: 5 },
      },
      bgm: {
        main: { ...VALID_FILE.bgm.main, volume: -1 },
      },
    })

    expect(parsed?.se.alarm.volume).toBe(1)
    expect(parsed?.bgm.main.volume).toBe(0)
  })

  it('loader は public data のURLを読む', async () => {
    let requestedUrl = ''
    const fetcher: typeof fetch = async (input) => {
      requestedUrl = String(input)
      return {
        ok: true,
        json: async () => VALID_FILE,
      } as Response
    }

    await expect(loadAudioAssets(fetcher, '/atodashi-judge-scorer/')).resolves.toEqual(
      fallbackAudioAssets,
    )
    expect(requestedUrl).toBe('/atodashi-judge-scorer/data/audio_assets.json')
  })
})
