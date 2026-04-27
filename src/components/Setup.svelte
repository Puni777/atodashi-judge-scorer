<script lang="ts">
  import type { ThemeId } from '../lib/types'
  import type { AudioLoadStatus } from '../lib/audio/audioManager'
  import { DEFAULT_THEME_ID, DEFAULT_TIMER_SECONDS, THEME_OPTIONS } from '../lib/types'

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

  function setTheme(nextThemeId: ThemeId) {
    onThemeChange(nextThemeId)
  }

  function setFloatingGm(enabled: boolean) {
    onFloatingGmChange(enabled)
  }

  function setSeEnabled(enabled: boolean) {
    onSeEnabledChange(enabled)
  }

  function setBgmEnabled(enabled: boolean) {
    onBgmEnabledChange(enabled)
  }

  function setSeVolume(volumePercent: number) {
    onSeVolumeChange(clampUnit(volumePercent / 100))
  }

  function setBgmVolume(volumePercent: number) {
    onBgmVolumeChange(clampUnit(volumePercent / 100))
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

  function clampUnit(value: number): number {
    return Math.max(0, Math.min(1, value))
  }

  let seVolumePercent = $derived(Math.round(seVolume * 100))
  let bgmVolumePercent = $derived(Math.round(bgmVolume * 100))
  let audioStatusLabel = $derived.by(() => {
    if (!seEnabled && !bgmEnabled) return '音声OFF'
    if (audioStatus === 'ready') return '音声OK'
    if (audioStatus === 'error') return '音声準備を再試行中'
    return '音声準備中...'
  })

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

  <div class="space-y-2">
    <p class="text-sm ui-text-muted">スタイル</p>
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {#each THEME_OPTIONS as theme}
        <button
          type="button"
          onclick={() => setTheme(theme.id)}
          class="ui-theme-option rounded-lg px-3 py-3 font-bold transition {selectedThemeId === theme.id
            ? 'ui-theme-option-active'
            : ''}"
        >
          <span class="theme-swatch" data-preview={theme.id} aria-hidden="true"></span>
          <span>{theme.name}</span>
        </button>
      {/each}
    </div>
  </div>

  <div class="ui-card-soft rounded-lg p-4 flex items-center justify-between gap-3">
    <div>
      <p class="font-bold ui-text-main">GM固定表示</p>
      <p class="text-xs ui-text-dim">スマホでは進行中も左下にGMを残します。</p>
    </div>
    <label class="ui-switch">
      <input
        type="checkbox"
        checked={floatingGmEnabled}
        onchange={(e) => setFloatingGm(e.currentTarget.checked)}
      />
      <span aria-hidden="true"></span>
      <span class="sr-only">GM固定表示</span>
    </label>
  </div>

  <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
    <div class="ui-card-soft rounded-lg p-4 flex items-center justify-between gap-3">
      <div>
        <p class="font-bold ui-text-main">SE</p>
        <p class="text-xs ui-text-dim">タップや得点表示の効果音。</p>
      </div>
      <label class="ui-switch">
        <input
          type="checkbox"
          checked={seEnabled}
          onchange={(e) => setSeEnabled(e.currentTarget.checked)}
        />
        <span aria-hidden="true"></span>
        <span class="sr-only">SE</span>
      </label>
    </div>

    <div class="ui-card-soft rounded-lg p-4 flex items-center justify-between gap-3">
      <div>
        <p class="font-bold ui-text-main">BGM</p>
        <p class="text-xs ui-text-dim">クマノミの夢を流します。</p>
      </div>
      <label class="ui-switch">
        <input
          type="checkbox"
          checked={bgmEnabled}
          onchange={(e) => setBgmEnabled(e.currentTarget.checked)}
        />
        <span aria-hidden="true"></span>
        <span class="sr-only">BGM</span>
      </label>
    </div>
  </div>

  <div class="ui-card-soft rounded-lg p-3 flex items-center justify-between gap-3">
    <p class="text-sm font-bold ui-text-main">{audioStatusLabel}</p>
    <span
      class="ui-audio-status-dot"
      class:ui-audio-status-dot-ready={audioStatus === 'ready'}
      class:ui-audio-status-dot-error={audioStatus === 'error'}
      aria-hidden="true"
    ></span>
  </div>

  <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
    <label class="ui-card-soft rounded-lg p-4 space-y-2">
      <div class="flex items-center justify-between gap-3">
        <span class="font-bold ui-text-main">SE音量</span>
        <span class="text-sm font-mono ui-text-muted">{seVolumePercent}%</span>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        step="5"
        value={seVolumePercent}
        disabled={!seEnabled}
        oninput={(e) => setSeVolume(Number(e.currentTarget.value))}
        onchange={(e) => setSeVolume(Number(e.currentTarget.value))}
        class="ui-range w-full"
      />
    </label>

    <label class="ui-card-soft rounded-lg p-4 space-y-2">
      <div class="flex items-center justify-between gap-3">
        <span class="font-bold ui-text-main">BGM音量</span>
        <span class="text-sm font-mono ui-text-muted">{bgmVolumePercent}%</span>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        step="5"
        value={bgmVolumePercent}
        disabled={!bgmEnabled}
        oninput={(e) => setBgmVolume(Number(e.currentTarget.value))}
        onchange={(e) => setBgmVolume(Number(e.currentTarget.value))}
        class="ui-range w-full"
      />
    </label>
  </div>

  {#if error}<p class="ui-text-danger text-sm">{error}</p>{/if}

  <button
    onclick={submit}
    data-audio="confirm"
    class="ui-button-primary w-full px-5 py-3 rounded-lg active:scale-[0.98] transition font-bold"
  >
    ゲーム開始
  </button>
</section>
