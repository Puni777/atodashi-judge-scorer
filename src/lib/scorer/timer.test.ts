/**
 * CountdownTimer のテスト。
 * Scheduler を差し替えて手動で tick を進めることで、setInterval に依存しない決定論的テストにする。
 */
import { describe, expect, it, vi } from 'vitest'
import { CountdownTimer, type Scheduler } from './timer.svelte'

/** 何もしない Scheduler — テストでは `timer.tick()` を直接呼んで時間を進める */
const noopScheduler: Scheduler = {
  setInterval: () => 'fake-handle',
  clearInterval: () => {},
}

describe('CountdownTimer', () => {
  it('初期状態は 0 / 停止', () => {
    const t = new CountdownTimer(noopScheduler)
    expect(t.totalSeconds).toBe(0)
    expect(t.remainingSeconds).toBe(0)
    expect(t.isRunning).toBe(false)
    expect(t.expired).toBe(false)
  })

  it('start で running になり tick で 1 秒ずつ減る', () => {
    const t = new CountdownTimer(noopScheduler)
    t.start(3)
    expect(t.isRunning).toBe(true)
    expect(t.remainingSeconds).toBe(3)
    t.tick()
    expect(t.remainingSeconds).toBe(2)
    t.tick()
    expect(t.remainingSeconds).toBe(1)
  })

  it('0 秒に達したら expired が true、isRunning が false', () => {
    const t = new CountdownTimer(noopScheduler)
    const expiredCb = vi.fn()
    t.on('expired', expiredCb)
    t.start(2)
    t.tick()
    t.tick()
    expect(t.remainingSeconds).toBe(0)
    expect(t.expired).toBe(true)
    expect(t.isRunning).toBe(false)
    expect(expiredCb).toHaveBeenCalledTimes(1)
  })

  it('tick リスナーは毎秒呼ばれる', () => {
    const t = new CountdownTimer(noopScheduler)
    const ticks: number[] = []
    t.on('tick', (s) => ticks.push(s))
    t.start(3)
    t.tick()
    t.tick()
    t.tick()
    expect(ticks).toEqual([2, 1, 0])
  })

  it('start(0) は OFF 扱いで何も起きない', () => {
    const t = new CountdownTimer(noopScheduler)
    const startedCb = vi.fn()
    t.on('started', startedCb)
    t.start(0)
    expect(t.isRunning).toBe(false)
    expect(startedCb).not.toHaveBeenCalled()
  })

  it('stop で stopped イベントが飛び clearInterval が呼ばれる', () => {
    const handle = Symbol('h')
    const sched: Scheduler = {
      setInterval: () => handle,
      clearInterval: vi.fn(),
    }
    const t = new CountdownTimer(sched)
    const stoppedCb = vi.fn()
    t.on('stopped', stoppedCb)
    t.start(5)
    t.stop()
    expect(t.isRunning).toBe(false)
    expect(stoppedCb).toHaveBeenCalledTimes(1)
    expect(sched.clearInterval).toHaveBeenCalledWith(handle)
  })

  it('off でリスナーを外せる', () => {
    const t = new CountdownTimer(noopScheduler)
    const cb = vi.fn()
    const unsubscribe = t.on('expired', cb)
    unsubscribe()
    t.start(1)
    t.tick()
    expect(cb).not.toHaveBeenCalled()
  })

  it('実 setInterval でも 1 秒進めば残時間が減る', () => {
    vi.useFakeTimers()
    try {
      const t = new CountdownTimer()
      t.start(3)
      vi.advanceTimersByTime(1000)
      expect(t.remainingSeconds).toBe(2)
      vi.advanceTimersByTime(2000)
      expect(t.remainingSeconds).toBe(0)
      expect(t.expired).toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })
})
