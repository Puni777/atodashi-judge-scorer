import type { AudioAssets, BgmId, SoundEffectId } from './assets'

export class AudioManager {
  private se = new Map<SoundEffectId, HTMLAudioElement>()
  private bgm = new Map<BgmId, HTMLAudioElement>()
  private unlocked = false
  private mainBgmStarted = false
  private seEnabled = true
  private bgmEnabled = true

  constructor(
    private assets: AudioAssets,
    private baseUrl: string = import.meta.env.BASE_URL,
  ) {
    this.rebuild()
  }

  setAssets(assets: AudioAssets): void {
    this.stopBgm('main')
    this.assets = assets
    this.mainBgmStarted = false
    this.rebuild()
  }

  startAutoplay(): void {
    if (!this.bgmEnabled) return
    if (!this.assets.bgm.main.autoplay) return
    void this.playBgm('main')
  }

  unlock(): void {
    if (this.unlocked) return
    this.unlocked = true
    this.startAutoplay()
  }

  playSe(id: SoundEffectId): void {
    if (!this.seEnabled) return
    const audio = this.se.get(id)
    if (!audio) return
    audio.currentTime = 0
    void audio.play().catch(() => {})
  }

  async playBgm(id: BgmId): Promise<void> {
    if (!this.bgmEnabled) return
    const audio = this.bgm.get(id)
    if (!audio) return
    try {
      await audio.play()
      if (id === 'main') this.mainBgmStarted = true
    } catch {
      // ブラウザの自動再生制限時は、最初のユーザー操作で unlock() が再試行する。
    }
  }

  stopBgm(id: BgmId): void {
    const audio = this.bgm.get(id)
    if (!audio) return
    audio.pause()
    audio.currentTime = 0
    if (id === 'main') this.mainBgmStarted = false
  }

  resumeMainBgmAfterGesture(): void {
    if (!this.bgmEnabled) return
    if (this.mainBgmStarted || !this.assets.bgm.main.autoplay) return
    this.unlock()
  }

  setSeEnabled(enabled: boolean): void {
    this.seEnabled = enabled
  }

  setBgmEnabled(enabled: boolean): void {
    this.bgmEnabled = enabled
    if (!enabled) {
      this.stopBgm('main')
      return
    }
    this.startAutoplay()
  }

  private rebuild(): void {
    this.se.clear()
    this.bgm.clear()

    for (const id of Object.keys(this.assets.se) as SoundEffectId[]) {
      const clip = this.assets.se[id]
      this.se.set(id, this.createAudio(clip.src, clip.volume, false))
    }

    for (const id of Object.keys(this.assets.bgm) as BgmId[]) {
      const clip = this.assets.bgm[id]
      this.bgm.set(id, this.createAudio(clip.src, clip.volume, clip.loop))
    }
  }

  private createAudio(src: string, volume: number, loop: boolean): HTMLAudioElement {
    const audio = new Audio(this.resolveSrc(src))
    audio.preload = 'auto'
    audio.volume = Math.max(0, Math.min(1, volume))
    audio.loop = loop
    return audio
  }

  private resolveSrc(src: string): string {
    const base = this.baseUrl.endsWith('/') ? this.baseUrl : `${this.baseUrl}/`
    return `${base}${src.replace(/^\//, '')}`
  }
}
