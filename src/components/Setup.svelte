<script lang="ts">
  type Props = {
    onStart: (names: string[], totalRounds: number | null) => void
  }
  let { onStart }: Props = $props()

  let count = $state(3)
  let names = $state<string[]>(['プレイヤー1', 'プレイヤー2', 'プレイヤー3', 'プレイヤー4', 'プレイヤー5', 'プレイヤー6'])
  let roundsText = $state('')
  let error = $state('')

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
    error = ''
    onStart(used, total)
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

  {#if error}<p class="text-red-300 text-sm">{error}</p>{/if}

  <button
    onclick={submit}
    class="w-full px-5 py-3 rounded-lg bg-purple-500 hover:bg-purple-400 active:scale-[0.98] transition font-bold shadow-lg shadow-purple-500/30"
  >
    ゲーム開始
  </button>
</section>
