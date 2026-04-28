<script lang="ts">
  import type { ThemeId } from '../lib/types'
  import type { AudioLoadStatus } from '../lib/audio/audioManager'
  import { DEFAULT_THEME_ID, DEFAULT_TIMER_SECONDS } from '../lib/types'
  import GameOptions from './GameOptions.svelte'

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

  function submit() {
    const used = names.slice(0, count).map((n) => n.trim())
    if (used.some((n) => !n)) { error = 'プレイヤー名を入力してください'; return }
    if (new Set(used).size !== used.length) { error = 'プレイヤー名が重複しています'; return }
    let total: number | null = null
    if (roundsText.trim()) {
      const parsed = Number.parseInt(roundsText, 10)
      if (!Number.isFinite(parsed) || parsed < 1) { error = 'ラウンド数は 1 以上の整数で入力してください'; return }
      total = parsed
    }
    let timerSeconds = 0
    if (timerEnabled) {
      clampTimerInputs()
      timerSeconds = timerMinutes * 60 + timerSecondsPart
      if (timerSeconds <= 0) { error = '話し合い時間は 1 秒以上にするか、OFF にしてください'; return }
    }
    error = ''
    onStart(used, total, timerSeconds, selectedThemeId)
  }
</script>

<section class="ui-card p-6 space-y-5">
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
    onclick={submit}
    data-audio="confirm"
    class="ui-button-primary w-full px-5 py-3 rounded-lg active:scale-[0.98] transition font-bold"
  >
    ゲーム開始
  </button>
</section>
