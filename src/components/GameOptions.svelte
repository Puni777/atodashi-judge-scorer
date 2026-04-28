<script lang="ts">
  import type { ThemeId } from '../lib/types'
  import type { AudioLoadStatus } from '../lib/audio/audioManager'
  import { THEME_OPTIONS } from '../lib/types'

  type Props = {
    selectedThemeId: ThemeId
    floatingGmEnabled: boolean
    seEnabled: boolean
    bgmEnabled: boolean
    seVolume: number
    bgmVolume: number
    audioStatus: AudioLoadStatus
    onThemeChange: (themeId: ThemeId) => void
    onFloatingGmChange: (enabled: boolean) => void
    onSeEnabledChange: (enabled: boolean) => void
    onBgmEnabledChange: (enabled: boolean) => void
    onSeVolumeChange: (volume: number) => void
    onBgmVolumeChange: (volume: number) => void
  }

  let {
    selectedThemeId,
    floatingGmEnabled,
    seEnabled,
    bgmEnabled,
    seVolume,
    bgmVolume,
    audioStatus,
    onThemeChange,
    onFloatingGmChange,
    onSeEnabledChange,
    onBgmEnabledChange,
    onSeVolumeChange,
    onBgmVolumeChange,
  }: Props = $props()

  function clampUnit(value: number): number {
    return Math.max(0, Math.min(1, value))
  }

  function setSeVolume(volumePercent: number) {
    onSeVolumeChange(clampUnit(volumePercent / 100))
  }

  function setBgmVolume(volumePercent: number) {
    onBgmVolumeChange(clampUnit(volumePercent / 100))
  }

  let seVolumePercent = $derived(Math.round(seVolume * 100))
  let bgmVolumePercent = $derived(Math.round(bgmVolume * 100))
  let audioStatusLabel = $derived.by(() => {
    if (!seEnabled && !bgmEnabled) return '音声OFF'
    if (audioStatus === 'ready') return '音声OK'
    if (audioStatus === 'error') return '音声準備を再試行中'
    return '音声準備中...'
  })
</script>

<div class="space-y-5">
  <section class="space-y-2">
    <p class="text-sm ui-text-muted">スタイル</p>
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {#each THEME_OPTIONS as theme}
        <button
          type="button"
          onclick={() => onThemeChange(theme.id)}
          aria-pressed={selectedThemeId === theme.id}
          class="ui-theme-option rounded-lg px-3 py-3 font-bold transition"
          class:ui-theme-option-active={selectedThemeId === theme.id}
        >
          <span class="theme-swatch" data-preview={theme.id} aria-hidden="true"></span>
          <span>{theme.name}</span>
        </button>
      {/each}
    </div>
  </section>

  <section class="ui-card-soft rounded-lg p-4 flex items-center justify-between gap-3">
    <div>
      <p class="font-bold ui-text-main">GM固定表示</p>
      <p class="text-xs ui-text-dim">スマホでは進行中も左下にGMを残します。</p>
    </div>
    <label class="ui-switch">
      <input
        type="checkbox"
        checked={floatingGmEnabled}
        onchange={(e) => onFloatingGmChange(e.currentTarget.checked)}
      />
      <span aria-hidden="true"></span>
      <span class="sr-only">GM固定表示</span>
    </label>
  </section>

  <section class="grid grid-cols-1 sm:grid-cols-2 gap-2">
    <div class="ui-card-soft rounded-lg p-4 flex items-center justify-between gap-3">
      <div>
        <p class="font-bold ui-text-main">SE</p>
        <p class="text-xs ui-text-dim">タップや得点表示の効果音。</p>
      </div>
      <label class="ui-switch">
        <input
          type="checkbox"
          checked={seEnabled}
          onchange={(e) => onSeEnabledChange(e.currentTarget.checked)}
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
          onchange={(e) => onBgmEnabledChange(e.currentTarget.checked)}
        />
        <span aria-hidden="true"></span>
        <span class="sr-only">BGM</span>
      </label>
    </div>
  </section>

  <section class="ui-card-soft rounded-lg p-3 flex items-center justify-between gap-3">
    <p class="text-sm font-bold ui-text-main">{audioStatusLabel}</p>
    <span
      class="ui-audio-status-dot"
      class:ui-audio-status-dot-ready={audioStatus === 'ready'}
      class:ui-audio-status-dot-error={audioStatus === 'error'}
      aria-hidden="true"
    ></span>
  </section>

  <section class="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
  </section>
</div>
