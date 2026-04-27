/**
 * 最終判断フェーズのカウントダウンタイマー。
 *
 * 拡張性のために最低限のイベントエミッタを内蔵している。
 * 将来「終了時に音を鳴らす」「30 秒前に通知音」「DB に記録」等を足したいときは
 *
 *   timer.on('expired', () => audio.play())
 *   timer.on('tick',    (sec) => { ... })
 *
 * のように外側から差し込めばよい。クラス本体は副作用を持たない。
 */
export type TimerEvent = 'started' | 'tick' | 'expired' | 'stopped'

type Listener<E extends TimerEvent> = E extends 'tick'
  ? (remainingSeconds: number) => void
  : () => void

/** setInterval を差し替え可能にしてテスト容易性を確保 */
export type Scheduler = {
  setInterval: (cb: () => void, ms: number) => unknown
  clearInterval: (handle: unknown) => void
}

export type CountdownTimerSnapshot = {
  totalSeconds: number
  remainingSeconds: number
  isRunning: boolean
  expired: boolean
  endsAt: number | null
}

const defaultScheduler: Scheduler = {
  setInterval: (cb, ms) => globalThis.setInterval(cb, ms),
  clearInterval: (handle) => globalThis.clearInterval(handle as ReturnType<typeof setInterval>),
}

export class CountdownTimer {
  totalSeconds: number = $state(0)
  remainingSeconds: number = $state(0)
  isRunning: boolean = $state(false)
  expired: boolean = $state(false)

  private handle: unknown = null
  private listeners: { [K in TimerEvent]: Set<Listener<K>> } = {
    started: new Set(),
    tick: new Set(),
    expired: new Set(),
    stopped: new Set(),
  }

  constructor(private scheduler: Scheduler = defaultScheduler) {}

  start(seconds: number): void {
    if (seconds <= 0) return // OFF 扱い
    this.stop()
    this.totalSeconds = seconds
    this.remainingSeconds = seconds
    this.expired = false
    this.isRunning = true
    this.emit('started')
    this.handle = this.scheduler.setInterval(() => this.tick(), 1000)
  }

  stop(): void {
    this.clearHandle()
    if (this.isRunning) {
      this.isRunning = false
      this.emit('stopped')
    }
  }

  reset(): void {
    this.stop()
    this.totalSeconds = 0
    this.remainingSeconds = 0
    this.expired = false
  }

  on<E extends TimerEvent>(event: E, listener: Listener<E>): () => void {
    this.listeners[event].add(listener as never)
    return () => this.off(event, listener)
  }

  off<E extends TimerEvent>(event: E, listener: Listener<E>): void {
    this.listeners[event].delete(listener as never)
  }

  toSnapshot(now: number = Date.now()): CountdownTimerSnapshot {
    return {
      totalSeconds: this.totalSeconds,
      remainingSeconds: this.remainingSeconds,
      isRunning: this.isRunning,
      expired: this.expired,
      endsAt: this.isRunning ? now + this.remainingSeconds * 1000 : null,
    }
  }

  restoreSnapshot(snapshot: CountdownTimerSnapshot, now: number = Date.now()): void {
    this.clearHandle()
    this.totalSeconds = Math.max(0, Math.floor(snapshot.totalSeconds))

    if (snapshot.isRunning && snapshot.endsAt !== null) {
      const remainingSeconds = Math.max(0, Math.ceil((snapshot.endsAt - now) / 1000))
      this.remainingSeconds = remainingSeconds
      this.expired = remainingSeconds <= 0
      this.isRunning = remainingSeconds > 0
      if (this.isRunning) {
        this.handle = this.scheduler.setInterval(() => this.tick(), 1000)
      }
      return
    }

    this.remainingSeconds = Math.max(0, Math.floor(snapshot.remainingSeconds))
    this.isRunning = false
    this.expired = snapshot.expired
  }

  /** テストや UI から「強制 1 秒進める」操作（fake timer 用にも使える） */
  tick(): void {
    if (!this.isRunning) return
    this.remainingSeconds = Math.max(0, this.remainingSeconds - 1)
    for (const cb of this.listeners.tick) cb(this.remainingSeconds)
    if (this.remainingSeconds === 0) {
      this.expired = true
      this.isRunning = false
      if (this.handle !== null) {
        this.scheduler.clearInterval(this.handle)
        this.handle = null
      }
      this.emit('expired')
    }
  }

  private clearHandle(): void {
    if (this.handle !== null) {
      this.scheduler.clearInterval(this.handle)
      this.handle = null
    }
  }

  private emit(event: 'started' | 'expired' | 'stopped'): void {
    for (const cb of this.listeners[event]) (cb as () => void)()
  }
}
