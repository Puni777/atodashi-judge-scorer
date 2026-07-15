<script lang="ts">
  import { onMount } from 'svelte'
  import Flag from 'lucide-svelte/icons/flag'
  import RotateCcw from 'lucide-svelte/icons/rotate-ccw'
  import X from 'lucide-svelte/icons/x'
  import type { ThemeId } from '../lib/types'
  import type { AudioLoadStatus } from '../lib/audio/audioManager'
  import GameOptions from './GameOptions.svelte'

  type Props = {
    open: boolean
    selectedThemeId: ThemeId
    floatingGmEnabled: boolean
    seEnabled: boolean
    bgmEnabled: boolean
    seVolume: number
    bgmVolume: number
    audioStatus: AudioLoadStatus
    canResetToSetup: boolean
    canEndGame: boolean
    onClose: () => void
    onResetToSetup: () => void
    onEndGame: () => void
    onThemeChange: (themeId: ThemeId) => void
    onFloatingGmChange: (enabled: boolean) => void
    onSeEnabledChange: (enabled: boolean) => void
    onBgmEnabledChange: (enabled: boolean) => void
    onSeVolumeChange: (volume: number) => void
    onBgmVolumeChange: (volume: number) => void
  }

  let {
    open,
    selectedThemeId,
    floatingGmEnabled,
    seEnabled,
    bgmEnabled,
    seVolume,
    bgmVolume,
    audioStatus,
    canResetToSetup,
    canEndGame,
    onClose,
    onResetToSetup,
    onEndGame,
    onThemeChange,
    onFloatingGmChange,
    onSeEnabledChange,
    onBgmEnabledChange,
    onSeVolumeChange,
    onBgmVolumeChange,
  }: Props = $props()

  onMount(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!open || event.key !== 'Escape') return
      onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  })

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) onClose()
  }

  function handleReset() {
    onResetToSetup()
  }
</script>

{#if open}
  <div
    class="options-modal-backdrop"
    role="presentation"
    onclick={handleBackdropClick}
  >
    <div
      class="options-modal ui-card"
      role="dialog"
      aria-modal="true"
      aria-labelledby="options-title"
    >
      <div class="options-modal-header">
        <div>
          <p class="text-xs ui-text-dim uppercase tracking-widest">Options</p>
          <h2 id="options-title" class="text-xl font-bold ui-text-main">オプション</h2>
        </div>
        <button type="button" class="options-modal-close" onclick={onClose} aria-label="閉じる">
          <X size={20} strokeWidth={2.4} aria-hidden="true" />
        </button>
      </div>

      <GameOptions
        {selectedThemeId}
        {floatingGmEnabled}
        {seEnabled}
        {bgmEnabled}
        {seVolume}
        {bgmVolume}
        {audioStatus}
        {onThemeChange}
        {onFloatingGmChange}
        {onSeEnabledChange}
        {onBgmEnabledChange}
        {onSeVolumeChange}
        {onBgmVolumeChange}
      />

      {#if canEndGame || canResetToSetup}
        <div class="options-reset-area">
          {#if canEndGame}
            <button
              type="button"
              class="options-reset-button options-end-button"
              onclick={onEndGame}
              data-audio="confirm"
            >
              <Flag size={18} strokeWidth={2.4} aria-hidden="true" />
              <span>途中終了して結果を見る</span>
            </button>
          {/if}
          {#if canResetToSetup}
            <button type="button" class="options-reset-button" onclick={handleReset} data-audio="confirm">
              <RotateCcw size={18} strokeWidth={2.4} aria-hidden="true" />
              <span>セットアップに戻る</span>
            </button>
          {/if}
        </div>
      {/if}
    </div>
  </div>
{/if}
