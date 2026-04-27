<script lang="ts">
  import { DEFAULT_TIMER_SECONDS } from '../lib/types'

  type Props = {
    onStart: (names: string[], totalRounds: number | null, timerSeconds: number) => void
  }
  let { onStart }: Props = $props()

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
    onStart(used, total, timerSeconds)
  }
</script>

<section class="rounded-xl bg-white/10 backdrop-blur p-6 space-y-5 ring-1 ring-white/20">
  <h2 class="text-xl font-bold">セットアップ</h2>

  <div class="space-y-2">
    <p class="text-sm text-slate-300">プレイヤー人数</p>
    <div class="flex gap-2 flex-wrap">
      {#each [2, 3, 4, 5, 6] as n}
        <button
          type="button"
          onclick={() => setCount(n)}
          class="w-12 h-12 rounded-lg font-bold transition {count === n
            ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30'
            : 'bg-white/5 text-slate-300 ring-1 ring-white/15 hover:bg-white/10'}"
        >
          {n}
        </button>
      {/each}
    </div>
  </div>

  <div class="space-y-2">
    <p class="text-sm text-slate-300">プレイヤー名</p>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {#each Array(count) as _, i}
        <input
          type="text"
          bind:value={names[i]}
          class="px-3 py-2 rounded-lg bg-black/30 ring-1 ring-white/15 focus:ring-purple-400 outline-none"
          placeholder={`プレイヤー${i + 1}`}
        />
      {/each}
    </div>
  </div>

  <div class="space-y-2">
    <p class="text-sm text-slate-300">ラウンド数（空欄で {count}）</p>
    <input
      type="number"
      min="1"
      bind:value={roundsText}
      class="w-32 px-3 py-2 rounded-lg bg-black/30 ring-1 ring-white/15 focus:ring-purple-400 outline-none"
    />
  </div>

  <div class="space-y-2">
    <div class="flex items-center justify-between">
      <p class="text-sm text-slate-300">最終判断のタイマー</p>
      <label class="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
        <input type="checkbox" bind:checked={timerEnabled} class="accent-purple-400" />
        ON
      </label>
    </div>
    <input
      type="text"
      bind:value={timerText}
      disabled={!timerEnabled}
      placeholder="3:00"
      class="w-32 px-3 py-2 rounded-lg bg-black/30 ring-1 ring-white/15 focus:ring-purple-400 outline-none disabled:opacity-50"
    />
    <p class="text-xs text-slate-400">「3:00」(分:秒) または秒数。OFF にすると無制限。</p>
  </div>

  {#if error}<p class="text-red-300 text-sm">{error}</p>{/if}

  <button
    onclick={submit}
    class="w-full px-5 py-3 rounded-lg bg-purple-500 hover:bg-purple-400 active:scale-[0.98] transition font-bold shadow-lg shadow-purple-500/30"
  >
    ゲーム開始
  </button>
</section>
