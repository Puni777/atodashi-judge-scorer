export type SoundEffectId = 'tap' | 'confirm' | 'roundScore' | 'finalScore' | 'alarm'
export type BgmId = 'main'

export type AudioClipConfig = {
  label: string
  src: string
  volume: number
}

export type BgmConfig = AudioClipConfig & {
  loop: boolean
  autoplay: boolean
}

export type AudioAssets = {
  version: number
  se: Record<SoundEffectId, AudioClipConfig>
  bgm: Record<BgmId, BgmConfig>
}

export const fallbackAudioAssets: AudioAssets = {
  version: 1,
  se: {
    tap: {
      label: 'カーソル移動',
      src: 'audio/se/cursor-move.mp3',
      volume: 0.45,
    },
    confirm: {
      label: '決定ボタンを押す',
      src: 'audio/se/confirm-button.mp3',
      volume: 0.65,
    },
    roundScore: {
      label: 'スコア表示',
      src: 'audio/se/round-score.mp3',
      volume: 0.8,
    },
    finalScore: {
      label: '最終スコア表示',
      src: 'audio/se/final-score.mp3',
      volume: 0.85,
    },
    alarm: {
      label: 'アラーム',
      src: 'audio/se/alarm.mp3',
      volume: 0.4,
    },
  },
  bgm: {
    main: {
      label: 'クマノミの夢',
      src: 'audio/bgm/kumanomi-no-yume.mp3',
      volume: 0.14,
      loop: true,
      autoplay: true,
    },
  },
}

export async function loadAudioAssets(
  fetcher: typeof fetch = globalThis.fetch,
  baseUrl: string = import.meta.env.BASE_URL,
): Promise<AudioAssets> {
  try {
    const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
    const res = await fetcher(`${base}data/audio_assets.json`)
    if (!res.ok) return fallbackAudioAssets
    return parseAudioAssets(await res.json()) ?? fallbackAudioAssets
  } catch {
    return fallbackAudioAssets
  }
}

export function parseAudioAssets(value: unknown): AudioAssets | null {
  const root = asRecord(value)
  if (!root || root.version !== 1) return null
  const se = asRecord(root.se)
  const bgm = asRecord(root.bgm)
  if (!se || !bgm) return null

  const tap = parseClip(se.tap)
  const confirm = parseClip(se.confirm)
  const roundScore = parseClip(se.roundScore)
  const finalScore = parseClip(se.finalScore)
  const alarm = parseClip(se.alarm)
  const main = parseBgm(bgm.main)
  if (!tap || !confirm || !roundScore || !finalScore || !alarm || !main) return null

  return {
    version: 1,
    se: { tap, confirm, roundScore, finalScore, alarm },
    bgm: { main },
  }
}

function parseClip(value: unknown): AudioClipConfig | null {
  const obj = asRecord(value)
  if (
    !obj ||
    typeof obj.label !== 'string' ||
    typeof obj.src !== 'string' ||
    typeof obj.volume !== 'number'
  ) {
    return null
  }
  return {
    label: obj.label,
    src: obj.src,
    volume: clampVolume(obj.volume),
  }
}

function parseBgm(value: unknown): BgmConfig | null {
  const clip = parseClip(value)
  const obj = asRecord(value)
  if (!clip || !obj || typeof obj.loop !== 'boolean' || typeof obj.autoplay !== 'boolean') {
    return null
  }
  return { ...clip, loop: obj.loop, autoplay: obj.autoplay }
}

function clampVolume(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null
}
