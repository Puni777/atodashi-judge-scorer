import type { AudioAssets, BgmId, SoundEffectId } from './assets'

export type AudioLoadStatus = 'loading' | 'ready' | 'error'

export class AudioManager {
  private se = new Map<SoundEffectId, HTMLAudioElement[]>()
  private seCursor = new Map<SoundEffectId, number>()
  private seBuffers = new Map<SoundEffectId, AudioBuffer>()
  private seBufferLoads = new Map<SoundEffectId, Promise<void>>()
  private bgm = new Map<BgmId, HTMLAudioElement>()
  private bgmSources = new Map<BgmId, MediaElementAudioSourceNode>()
  private bgmGains = new Map<BgmId, GainNode>()
  private audioContext: AudioContext | null = null
  private unlocked = false
  private mainBgmStarted = false
  private seReady = false
  private hasFailure = false
  private pendingBgmAutoplay = false
  private sePrimePromise: Promise<void> | null = null
  private status: AudioLoadStatus = 'loading'
  private statusListeners = new Set<(status: AudioLoadStatus) => void>()
  private seEnabled = true
  private bgmEnabled = true
  private seMasterVolume = 1
  private bgmMasterVolume = 0.5

  constructor(
    private assets: AudioAssets,
    private baseUrl: string = import.meta.env.BASE_URL,
  ) {
    this.rebuild()
    void this.primeSeBuffers()
  }

  onStatusChange(listener: (status: AudioLoadStatus) => void): () => void {
    this.statusListeners.add(listener)
    listener(this.status)
    return () => {
      this.statusListeners.delete(listener)
    }
  }

  setAssets(assets: AudioAssets): void {
    this.stopBgm('main')
    this.assets = assets
    this.mainBgmStarted = false
    this.seReady = false
    this.hasFailure = false
    this.refreshStatus()
    this.rebuild()
    this.primeAudioElements()
    void this.primeSeBuffers()
  }

  startAutoplay(): void {
    if (!this.bgmEnabled) return
    if (!this.assets.bgm.main.autoplay) return
    if (!this.seReady) {
      this.pendingBgmAutoplay = true
      return
    }
    void this.playBgm('main')
  }

  async unlock(): Promise<void> {
    if (this.unlocked) return
    this.ensureAudioContext()
    this.connectBgmNodes()
    await this.resumeAudioContext()
    this.primeAudioElements()
    void this.primeSeBuffers()
    this.unlocked = this.audioContext?.state === 'running' || !this.audioContext
    this.refreshStatus()
    if (this.unlocked) this.startAutoplay()
  }

  playSe(id: SoundEffectId): void {
    if (!this.seEnabled) return
    if (!this.unlocked) this.primeAudioElements()
    if (this.playWebAudioSe(id)) return
    if (this.unlocked) void this.loadSeBuffer(id).catch(() => {})
    const audio = this.nextSeAudio(id)
    if (!audio) return
    audio.currentTime = 0
    void audio.play().catch(() => {
      this.unlocked = false
    })
  }

  async playBgm(id: BgmId): Promise<void> {
    if (!this.bgmEnabled) return
    const audio = this.bgm.get(id)
    if (!audio) return
    if (audio.readyState === HTMLMediaElement.HAVE_NOTHING) {
      audio.load()
    }
    this.connectBgmNodes()
    try {
      await audio.play()
      if (id === 'main') this.mainBgmStarted = true
    } catch {
      // ブラウザの自動再生制限時は、最初のユーザー操作で unlock() が再試行する。
      this.unlocked = false
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
    if (!this.unlocked) {
      void this.unlock()
      return
    }
    void this.resumeAudioContext()
    if (this.mainBgmStarted || !this.assets.bgm.main.autoplay) return
    this.startAutoplay()
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

  setSeVolume(volume: number): void {
    this.seMasterVolume = clampVolume(volume)
    this.applySeVolumes()
  }

  setBgmVolume(volume: number): void {
    this.bgmMasterVolume = clampVolume(volume)
    this.applyBgmVolumes()
  }

  private rebuild(): void {
    this.se.clear()
    this.seCursor.clear()
    this.seBuffers.clear()
    this.seBufferLoads.clear()
    this.sePrimePromise = null
    this.bgm.clear()
    this.bgmSources.clear()
    this.bgmGains.clear()

    for (const id of Object.keys(this.assets.se) as SoundEffectId[]) {
      const clip = this.assets.se[id]
      const poolSize = id === 'tap' ? 5 : 3
      this.se.set(
        id,
        Array.from({ length: poolSize }, () =>
          this.createAudio(clip.src, clip.volume * this.seMasterVolume, false, 'auto'),
        ),
      )
      this.seCursor.set(id, 0)
    }

    for (const id of Object.keys(this.assets.bgm) as BgmId[]) {
      const clip = this.assets.bgm[id]
      this.bgm.set(id, this.createAudio(clip.src, clip.volume * this.bgmMasterVolume, clip.loop, 'none'))
    }
  }

  private playWebAudioSe(id: SoundEffectId): boolean {
    const context = this.audioContext
    const buffer = this.seBuffers.get(id)
    if (!context || !buffer || context.state === 'closed') return false
    const clip = this.assets.se[id]
    const source = context.createBufferSource()
    const gain = context.createGain()
    source.buffer = buffer
    gain.gain.value = clampVolume(clip.volume * this.seMasterVolume)
    source.connect(gain)
    gain.connect(context.destination)
    source.start()
    return true
  }

  private nextSeAudio(id: SoundEffectId): HTMLAudioElement | null {
    const pool = this.se.get(id)
    if (!pool || pool.length === 0) return null
    const index = this.seCursor.get(id) ?? 0
    const audio = pool[index] ?? pool[0]
    this.seCursor.set(id, (index + 1) % pool.length)
    return audio ?? null
  }

  private primeAudioElements(): void {
    for (const pool of this.se.values()) {
      for (const audio of pool) {
        if (audio.readyState === HTMLMediaElement.HAVE_NOTHING) {
          audio.load()
        }
      }
    }
  }

  private async primeSeBuffers(): Promise<void> {
    if (this.seReady) return
    if (this.sePrimePromise) return this.sePrimePromise
    this.setStatus('loading')
    this.sePrimePromise = Promise.allSettled(
      (Object.keys(this.assets.se) as SoundEffectId[]).map((id) => this.loadSeBuffer(id)),
    )
      .then((results) => {
        this.seReady = true
        this.hasFailure = results.some((result) => result.status === 'rejected')
        this.refreshStatus()
        if (this.pendingBgmAutoplay) {
          this.pendingBgmAutoplay = false
          this.startAutoplay()
        }
      })
      .finally(() => {
        this.sePrimePromise = null
      })
    return this.sePrimePromise
  }

  private async loadSeBuffer(id: SoundEffectId): Promise<void> {
    if (this.seBuffers.has(id)) return
    const existing = this.seBufferLoads.get(id)
    if (existing) return existing

    const context = this.ensureAudioContext()
    if (!context) throw new Error('Web Audio API is unavailable')

    const load = fetch(this.resolveSrc(this.assets.se[id].src))
      .then((res) => {
        if (!res.ok) throw new Error(`audio fetch failed: ${id}`)
        return res.arrayBuffer()
      })
      .then((buffer) => context.decodeAudioData(buffer))
      .then((decoded) => {
        this.seBuffers.set(id, decoded)
      })
      .catch(() => {
        this.seBufferLoads.delete(id)
        throw new Error(`audio decode failed: ${id}`)
      })

    this.seBufferLoads.set(id, load)
    return load
  }

  private ensureAudioContext(): AudioContext | null {
    if (this.audioContext) return this.audioContext
    const AudioContextCtor =
      window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextCtor) return null
    this.audioContext = new AudioContextCtor()
    this.audioContext.addEventListener('statechange', () => {
      if (this.audioContext?.state === 'running') this.unlocked = true
      this.refreshStatus()
    })
    this.connectBgmNodes()
    return this.audioContext
  }

  private connectBgmNodes(): void {
    const context = this.audioContext
    if (!context) return
    for (const id of Object.keys(this.assets.bgm) as BgmId[]) {
      if (this.bgmSources.has(id)) continue
      const audio = this.bgm.get(id)
      if (!audio) continue
      try {
        const source = context.createMediaElementSource(audio)
        const gain = context.createGain()
        const clip = this.assets.bgm[id]
        gain.gain.value = clampVolume(clip.volume * this.bgmMasterVolume)
        source.connect(gain)
        gain.connect(context.destination)
        this.bgmSources.set(id, source)
        this.bgmGains.set(id, gain)
        audio.volume = 1
      } catch {
        // 既に別経路で接続済み等の場合は HTMLAudioElement の volume にフォールバックする。
      }
    }
  }

  private async resumeAudioContext(): Promise<void> {
    const context = this.audioContext
    if (!context || context.state !== 'suspended') return
    try {
      await context.resume()
    } catch {
      this.unlocked = false
    }
  }

  private applySeVolumes(): void {
    for (const id of Object.keys(this.assets.se) as SoundEffectId[]) {
      const clip = this.assets.se[id]
      const pool = this.se.get(id) ?? []
      for (const audio of pool) {
        audio.volume = clampVolume(clip.volume * this.seMasterVolume)
      }
    }
  }

  private applyBgmVolumes(): void {
    for (const id of Object.keys(this.assets.bgm) as BgmId[]) {
      const clip = this.assets.bgm[id]
      const volume = clampVolume(clip.volume * this.bgmMasterVolume)
      const gain = this.bgmGains.get(id)
      if (gain) {
        gain.gain.value = volume
        continue
      }
      const audio = this.bgm.get(id)
      if (audio) audio.volume = volume
    }
  }

  private createAudio(
    src: string,
    volume: number,
    loop: boolean,
    preload: 'auto' | 'metadata' | 'none',
  ): HTMLAudioElement {
    const audio = new Audio(this.resolveSrc(src))
    audio.preload = preload
    audio.volume = clampVolume(volume)
    audio.loop = loop
    return audio
  }

  private resolveSrc(src: string): string {
    const base = this.baseUrl.endsWith('/') ? this.baseUrl : `${this.baseUrl}/`
    return `${base}${src.replace(/^\//, '')}`
  }

  private setStatus(status: AudioLoadStatus): void {
    if (this.status === status) return
    this.status = status
    for (const listener of this.statusListeners) listener(status)
  }

  private refreshStatus(): void {
    this.setStatus(this.computeStatus())
  }

  private computeStatus(): AudioLoadStatus {
    if (this.hasFailure) return 'error'
    if (!this.seReady) return 'loading'
    if (this.audioContext && this.audioContext.state !== 'running') return 'loading'
    return 'ready'
  }
}

function clampVolume(volume: number): number {
  return Math.max(0, Math.min(1, volume))
}
