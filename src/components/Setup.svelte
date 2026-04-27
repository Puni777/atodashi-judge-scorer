<script lang="ts">
  import type { ThemeId } from '../lib/types'
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
  }
  let {
    onStart,
    selectedThemeId = DEFAULT_THEME_ID,
    onThemeChange = () => {},
  }: Props = $props()

  let count = $state(3)
  let names = $state<string[]>(['プレイヤー1', 'プレイヤー2', 'プレイヤー3', 'プレイヤー4', 'プレイヤー5', 'プレイヤー6'])
  let roundsText = $state('')
  // 入力は分:秒の "M:SS" 形式。デフォルト 3 分。
  let timerText = $state(formatMinSec(DEFAULT_TIMER_SECONDS))
  let timerEnabled = $state(true)
  let error = $state('')

  function formatMinSec(totalSeconds: number): string {
    const m = Math.floor(totalSeconds / 60)
    const s = totalSeconds % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }

  /** "3:00", "180", "3:5" などを秒に変換。失敗時は null */
  function parseTimer(text: string): number | null {
    const t = text.trim()
    if (!t) return null
    if (t.includes(':')) {
      const parts = t.split(':')
      if (parts.length !== 2) return null
      const m = Number.parseInt(parts[0]!, 10)
      const s = Number.parseInt(parts[1]!, 10)
      if (!Number.isFinite(m) || !Number.isFinite(s) || m < 0 || s < 0 || s >= 60) return null
      return m * 60 + s
    }
    const sec = Number.parseInt(t, 10)
    if (!Number.isFinite(sec) || sec < 0) return null
    return sec
  }

  function setCount(n: number) {
    count = n
  }

  function setTheme(nextThemeId: ThemeId) {
    onThemeChange(nextThemeId)
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
      const parsedTimer = parseTimer(timerText)
      if (parsedTimer === null) { error = 'タイマーは「3:00」または秒数で入力してください'; return }
      timerSeconds = parsedTimer
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
      {#each [2, 3, 4, 5, 6] as n}
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
      <p class="text-sm ui-text-muted">最終判断のタイマー</p>
      <label class="flex items-center gap-2 text-xs ui-text-muted cursor-pointer">
        <input type="checkbox" bind:checked={timerEnabled} class="ui-check" />
        ON
      </label>
    </div>
    <input
      type="text"
      bind:value={timerText}
      disabled={!timerEnabled}
      placeholder="3:00"
      class="ui-input w-32 px-3 py-2 rounded-lg outline-none disabled:opacity-50"
    />
    <p class="text-xs ui-text-dim">「3:00」(分:秒) または秒数。OFF にすると無制限。</p>
  </div>

  <div class="space-y-2">
    <p class="text-sm ui-text-muted">スタイル</p>
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
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

  {#if error}<p class="ui-text-danger text-sm">{error}</p>{/if}

  <button
    onclick={submit}
    class="ui-button-primary w-full px-5 py-3 rounded-lg active:scale-[0.98] transition font-bold"
  >
    ゲーム開始
  </button>
</section>
