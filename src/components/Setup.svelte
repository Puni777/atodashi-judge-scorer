<script lang="ts">
  import { onDestroy } from 'svelte'
  import ArrowDown from 'lucide-svelte/icons/arrow-down'
  import ArrowUp from 'lucide-svelte/icons/arrow-up'
  import GripVertical from 'lucide-svelte/icons/grip-vertical'
  import Shuffle from 'lucide-svelte/icons/shuffle'
  import type { ThemeId } from '../lib/types'
  import type { AudioLoadStatus } from '../lib/audio/audioManager'
  import { shuffleParentOrder } from '../lib/scorer/parentOrder'
  import { DEFAULT_THEME_ID, DEFAULT_TIMER_SECONDS } from '../lib/types'
  import GameOptions from './GameOptions.svelte'

  type SetupStep = 'basic' | 'parent-order'

  type PreparedSetup = {
    names: string[]
    totalRounds: number | null
    timerSeconds: number
  }

  const SHUFFLE_PREVIEW_STEPS = 5
  const SHUFFLE_PREVIEW_INTERVAL_MS = 90
  const SHUFFLE_SETTLE_DELAY_MS = 170
  const SHUFFLE_SETTLE_CLASS_MS = 260

  type Props = {
    onStart: (
      names: string[],
      totalRounds: number | null,
      timerSeconds: number,
      themeId: ThemeId,
    ) => void
    selectedThemeId?: ThemeId
    onThemeChange?: (themeId: ThemeId) => void
    floatingGmEnabled?: boolean
    onFloatingGmChange?: (enabled: boolean) => void
    seEnabled?: boolean
    bgmEnabled?: boolean
    seVolume?: number
    bgmVolume?: number
    audioStatus?: AudioLoadStatus
    onSeEnabledChange?: (enabled: boolean) => void
    onBgmEnabledChange?: (enabled: boolean) => void
    onSeVolumeChange?: (volume: number) => void
    onBgmVolumeChange?: (volume: number) => void
  }
  let {
    onStart,
    selectedThemeId = DEFAULT_THEME_ID,
    onThemeChange = () => {},
    floatingGmEnabled = true,
    onFloatingGmChange = () => {},
    seEnabled = true,
    bgmEnabled = true,
    seVolume = 1,
    bgmVolume = 0.5,
    audioStatus = 'loading',
    onSeEnabledChange = () => {},
    onBgmEnabledChange = () => {},
    onSeVolumeChange = () => {},
    onBgmVolumeChange = () => {},
  }: Props = $props()

  let step = $state<SetupStep>('basic')
  let count = $state(3)
  let names = $state<string[]>([
    'プレイヤー1',
    'プレイヤー2',
    'プレイヤー3',
    'プレイヤー4',
    'プレイヤー5',
    'プレイヤー6',
    'プレイヤー7',
    'プレイヤー8',
  ])
  let roundsText = $state('')
  let timerMinutes = $state(Math.floor(DEFAULT_TIMER_SECONDS / 60))
  let timerSecondsPart = $state(DEFAULT_TIMER_SECONDS % 60)
  let timerEnabled = $state(true)
  let error = $state('')
  let preparedSetup = $state<PreparedSetup | null>(null)
  let parentOrder = $state<number[]>([])
  let draggingIndex = $state<number | null>(null)
  let draggingPlayerIndex = $state<number | null>(null)
  let isShuffling = $state(false)
  let shuffleSettled = $state(false)
  let shuffleTick = $state(0)
  let shuffleTimers: number[] = []

  function setCount(n: number) {
    count = n
  }

  function setTimerPreset(seconds: number) {
    timerEnabled = seconds > 0
    timerMinutes = Math.floor(seconds / 60)
    timerSecondsPart = seconds % 60
  }

  function clampTimerInputs() {
    timerMinutes = Math.max(0, Math.min(60, Math.floor(Number(timerMinutes) || 0)))
    timerSecondsPart = Math.max(0, Math.min(59, Math.floor(Number(timerSecondsPart) || 0)))
  }

  function buildPreparedSetup(): PreparedSetup | null {
    const used = names.slice(0, count).map((n) => n.trim())
    if (used.some((n) => !n)) { error = 'プレイヤー名を入力してください'; return null }
    if (new Set(used).size !== used.length) { error = 'プレイヤー名が重複しています'; return null }
    let total: number | null = null
    if (roundsText.trim()) {
      const parsed = Number.parseInt(roundsText, 10)
      if (!Number.isFinite(parsed) || parsed < 1) { error = 'ラウンド数は 1 以上の整数で入力してください'; return null }
      total = parsed
    }
    let timerSeconds = 0
    if (timerEnabled) {
      clampTimerInputs()
      timerSeconds = timerMinutes * 60 + timerSecondsPart
      if (timerSeconds <= 0) { error = '話し合い時間は 1 秒以上にするか、OFF にしてください'; return null }
    }
    return { names: used, totalRounds: total, timerSeconds }
  }

  function goToParentOrder() {
    const next = buildPreparedSetup()
    if (!next) return
    resetShuffleAnimation()
    const keepOrder =
      preparedSetup !== null &&
      sameNames(preparedSetup.names, next.names) &&
      isValidParentOrder(parentOrder, next.names.length)
    preparedSetup = next
    parentOrder = keepOrder ? [...parentOrder] : next.names.map((_, index) => index)
    draggingIndex = null
    draggingPlayerIndex = null
    error = ''
    step = 'parent-order'
  }

  function backToBasic() {
    resetShuffleAnimation()
    step = 'basic'
    error = ''
    draggingIndex = null
    draggingPlayerIndex = null
  }

  function submitOrderedStart() {
    if (isShuffling) return
    const setup = preparedSetup
    if (!setup) {
      error = 'セットアップ内容を確認してください'
      step = 'basic'
      return
    }
    if (!isValidParentOrder(parentOrder, setup.names.length)) {
      error = '親の順番を確認してください'
      parentOrder = setup.names.map((_, index) => index)
      return
    }
    const orderedNames = parentOrder.map((index) => setup.names[index]!)
    error = ''
    onStart(orderedNames, setup.totalRounds, setup.timerSeconds, selectedThemeId)
  }

  function sameNames(a: string[], b: string[]): boolean {
    return a.length === b.length && a.every((name, index) => name === b[index])
  }

  function isValidParentOrder(order: number[], total: number): boolean {
    if (order.length !== total) return false
    const seen = new Set(order)
    return seen.size === total && order.every((index) => Number.isInteger(index) && index >= 0 && index < total)
  }

  function clearShuffleTimers() {
    for (const timer of shuffleTimers) window.clearTimeout(timer)
    shuffleTimers = []
  }

  function resetShuffleAnimation() {
    clearShuffleTimers()
    isShuffling = false
    shuffleSettled = false
    shuffleTick = 0
  }

  function prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }

  function scheduleShuffleTimer(callback: () => void, delayMs: number) {
    const timer = window.setTimeout(callback, delayMs)
    shuffleTimers.push(timer)
  }

  function shuffleParentOrderWithAnimation() {
    if (isShuffling || parentOrder.length <= 1) return

    clearShuffleTimers()
    const finalOrder = shuffleParentOrder(parentOrder)
    draggingIndex = null
    draggingPlayerIndex = null

    if (prefersReducedMotion()) {
      parentOrder = finalOrder
      shuffleSettled = false
      shuffleTick += 1
      return
    }

    isShuffling = true
    shuffleSettled = false
    shuffleTick += 1

    for (let stepIndex = 1; stepIndex <= SHUFFLE_PREVIEW_STEPS; stepIndex += 1) {
      scheduleShuffleTimer(() => {
        parentOrder = shuffleParentOrder(parentOrder)
        shuffleTick += 1
      }, stepIndex * SHUFFLE_PREVIEW_INTERVAL_MS)
    }

    scheduleShuffleTimer(() => {
      parentOrder = finalOrder
      isShuffling = false
      shuffleSettled = true
      shuffleTick += 1

      scheduleShuffleTimer(() => {
        shuffleSettled = false
      }, SHUFFLE_SETTLE_CLASS_MS)
    }, SHUFFLE_PREVIEW_STEPS * SHUFFLE_PREVIEW_INTERVAL_MS + SHUFFLE_SETTLE_DELAY_MS)
  }

  function moveParentOrder(from: number, to: number) {
    if (isShuffling || from === to || from < 0 || to < 0 || from >= parentOrder.length || to >= parentOrder.length) return
    const next = [...parentOrder]
    const [moved] = next.splice(from, 1)
    if (moved === undefined) return
    next.splice(to, 0, moved)
    parentOrder = next
    if (draggingIndex === from) draggingIndex = to
  }

  function parentName(playerIndex: number): string {
    return preparedSetup?.names[playerIndex] ?? ''
  }

  function handleOrderPointerDown(event: PointerEvent, index: number, playerIndex: number) {
    if (isShuffling) return
    if (event.pointerType === 'mouse' && event.button !== 0) return
    const handle = event.currentTarget as HTMLElement
    handle.setPointerCapture(event.pointerId)
    draggingIndex = index
    draggingPlayerIndex = playerIndex
    event.preventDefault()
  }

  function handleOrderPointerMove(event: PointerEvent) {
    if (isShuffling || draggingIndex === null) return
    const element = document.elementFromPoint(event.clientX, event.clientY)
    const row = element instanceof Element
      ? (element.closest('[data-parent-order-index]') as HTMLElement | null)
      : null
    const target = Number(row?.dataset.parentOrderIndex)
    if (!Number.isInteger(target) || target === draggingIndex) return
    moveParentOrder(draggingIndex, target)
  }

  function finishOrderPointer(event: PointerEvent) {
    const handle = event.currentTarget as HTMLElement
    if (handle.hasPointerCapture(event.pointerId)) {
      handle.releasePointerCapture(event.pointerId)
    }
    draggingIndex = null
    draggingPlayerIndex = null
  }

  onDestroy(clearShuffleTimers)
</script>

<section class="ui-card p-6 space-y-5">
  {#if step === 'basic'}
    <h2 class="text-xl font-bold">セットアップ</h2>

    <div class="space-y-2">
      <p class="text-sm ui-text-muted">プレイヤー人数</p>
      <div class="flex gap-2 flex-wrap">
        {#each [3, 4, 5, 6, 7, 8] as n}
          <button
            type="button"
            onclick={() => setCount(n)}
            class="ui-segment-button w-12 h-12 rounded-lg font-bold transition {count === n
              ? 'ui-segment-button-active'
              : ''}"
          >
            {n}
          </button>
        {/each}
      </div>
    </div>

    <div class="space-y-2">
      <p class="text-sm ui-text-muted">プレイヤー名</p>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {#each Array(count) as _, i}
          <input
            type="text"
            bind:value={names[i]}
            class="ui-input px-3 py-2 rounded-lg outline-none"
            placeholder={`プレイヤー${i + 1}`}
          />
        {/each}
      </div>
    </div>

    <div class="space-y-2">
      <p class="text-sm ui-text-muted">ラウンド数（空欄で {count}）</p>
      <input
        type="number"
        min="1"
        bind:value={roundsText}
        class="ui-input w-32 px-3 py-2 rounded-lg outline-none"
      />
    </div>

    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <p class="text-sm ui-text-muted">話し合い時間</p>
        <label class="flex items-center gap-2 text-xs ui-text-muted cursor-pointer">
          <input type="checkbox" bind:checked={timerEnabled} class="ui-check" />
          ON
        </label>
      </div>
      <div class="grid grid-cols-2 gap-2 max-w-xs">
        <label class="space-y-1">
          <span class="text-xs ui-text-dim">分</span>
          <input
            type="number"
            min="0"
            max="60"
            bind:value={timerMinutes}
            disabled={!timerEnabled}
            onblur={clampTimerInputs}
            class="ui-input w-full px-3 py-2 rounded-lg outline-none disabled:opacity-50"
          />
        </label>
        <label class="space-y-1">
          <span class="text-xs ui-text-dim">秒</span>
          <input
            type="number"
            min="0"
            max="59"
            bind:value={timerSecondsPart}
            disabled={!timerEnabled}
            onblur={clampTimerInputs}
            class="ui-input w-full px-3 py-2 rounded-lg outline-none disabled:opacity-50"
          />
        </label>
      </div>
      <div class="flex flex-wrap gap-2">
        {#each [
          { label: '1分', seconds: 60 },
          { label: '2分', seconds: 120 },
          { label: '3分', seconds: 180 },
          { label: '5分', seconds: 300 },
          { label: 'OFF', seconds: 0 },
        ] as preset}
          <button
            type="button"
            onclick={() => setTimerPreset(preset.seconds)}
            class="ui-segment-button px-3 py-2 rounded-lg text-sm font-bold transition"
          >
            {preset.label}
          </button>
        {/each}
      </div>
      <p class="text-xs ui-text-dim">OFF にすると無制限。タイマー終了時にアラームが鳴ります。</p>
    </div>

    <GameOptions
      {selectedThemeId}
      {floatingGmEnabled}
      {seEnabled}
      {bgmEnabled}
      {seVolume}
      {bgmVolume}
      {audioStatus}
      onThemeChange={onThemeChange}
      onFloatingGmChange={onFloatingGmChange}
      onSeEnabledChange={onSeEnabledChange}
      onBgmEnabledChange={onBgmEnabledChange}
      onSeVolumeChange={onSeVolumeChange}
      onBgmVolumeChange={onBgmVolumeChange}
    />

    {#if error}<p class="ui-text-danger text-sm">{error}</p>{/if}

    <button
      onclick={goToParentOrder}
      data-audio="confirm"
      class="ui-button-primary w-full px-5 py-3 rounded-lg active:scale-[0.98] transition font-bold"
    >
      親の順番へ
    </button>
  {:else if preparedSetup}
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="text-xs ui-text-dim uppercase tracking-widest">Setup 2 / 2</p>
        <h2 class="text-xl font-bold">親の順番</h2>
      </div>
      <button
        type="button"
        onclick={backToBasic}
        disabled={isShuffling}
        class="ui-button-secondary px-3 py-2 rounded-lg text-sm font-bold transition"
      >
        戻る
      </button>
    </div>

    <div class="parent-order-toolbar">
      <div class="flex flex-wrap gap-2 text-xs">
        <span class="ui-pill rounded-full px-3 py-1">ラウンド {preparedSetup.totalRounds ?? preparedSetup.names.length}</span>
        <span class="ui-pill rounded-full px-3 py-1">人数 {preparedSetup.names.length}</span>
      </div>
      <button
        type="button"
        onclick={shuffleParentOrderWithAnimation}
        disabled={isShuffling || parentOrder.length <= 1}
        class="parent-order-shuffle-button"
        class:parent-order-shuffle-button-active={isShuffling}
        aria-busy={isShuffling}
        aria-label="親の順番をシャッフル"
        data-audio="confirm"
      >
        <span class="parent-order-shuffle-icon" aria-hidden="true">
          <Shuffle size={18} strokeWidth={2.5} />
        </span>
        <span>{isShuffling ? 'シャッフル中' : 'シャッフル'}</span>
      </button>
    </div>

    <ol class="parent-order-list space-y-2" aria-label="親の順番">
      {#each parentOrder as playerIndex, position (playerIndex)}
        <li
          class="parent-order-row"
          class:parent-order-row-dragging={draggingPlayerIndex === playerIndex}
          class:parent-order-row-shuffling={isShuffling}
          class:parent-order-row-settled={shuffleSettled}
          data-parent-order-index={position}
          data-shuffle-tick={shuffleTick}
          style={`--order-delay: ${position * 24}ms`}
        >
          <button
            type="button"
            class="parent-order-drag-handle"
            aria-label={`${parentName(playerIndex)}をドラッグして並べ替え`}
            disabled={isShuffling}
            onpointerdown={(event) => handleOrderPointerDown(event, position, playerIndex)}
            onpointermove={handleOrderPointerMove}
            onpointerup={finishOrderPointer}
            onpointercancel={finishOrderPointer}
          >
            <GripVertical size={20} strokeWidth={2.4} aria-hidden="true" />
          </button>
          <span class="parent-order-rank">{position + 1}</span>
          <span class="parent-order-name">{parentName(playerIndex)}</span>
          <span class="parent-order-actions">
            <button
              type="button"
              class="parent-order-icon-button"
              aria-label={`${parentName(playerIndex)}を1つ上へ`}
              disabled={isShuffling || position === 0}
              onclick={() => moveParentOrder(position, position - 1)}
            >
              <ArrowUp size={18} strokeWidth={2.4} aria-hidden="true" />
            </button>
            <button
              type="button"
              class="parent-order-icon-button"
              aria-label={`${parentName(playerIndex)}を1つ下へ`}
              disabled={isShuffling || position === parentOrder.length - 1}
              onclick={() => moveParentOrder(position, position + 1)}
            >
              <ArrowDown size={18} strokeWidth={2.4} aria-hidden="true" />
            </button>
          </span>
        </li>
      {/each}
    </ol>

    {#if error}<p class="ui-text-danger text-sm">{error}</p>{/if}

    <button
      onclick={submitOrderedStart}
      disabled={isShuffling}
      data-audio="confirm"
      class="ui-button-primary w-full px-5 py-3 rounded-lg active:scale-[0.98] transition font-bold"
    >
      この順番で開始
    </button>
  {:else}
    <h2 class="text-xl font-bold">セットアップ</h2>
    <p class="ui-text-danger text-sm">セットアップ内容を確認してください</p>
    <button
      type="button"
      onclick={backToBasic}
      class="ui-button-primary w-full px-5 py-3 rounded-lg active:scale-[0.98] transition font-bold"
    >
      戻る
    </button>
  {/if}
</section>
