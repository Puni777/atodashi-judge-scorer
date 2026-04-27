<script lang="ts">
  import type { IdMap, Player } from '../lib/types'

  type Props = {
    players: Player[]
    parentId: number
    deltas: IdMap
    isLastRound: boolean
    onNext: () => void
  }
  let { players, parentId, deltas, isLastRound, onNext }: Props = $props()
</script>

<section class="space-y-4">
  <div class="rounded-xl bg-white/10 backdrop-blur p-5 ring-1 ring-white/20">
    <h2 class="text-xl font-bold text-white">ラウンド結果</h2>
  </div>

  <div class="space-y-2">
    {#each players as p}
      {@const delta = deltas[p.id] ?? 0}
      <div class="flex items-center justify-between rounded-lg p-4 ring-1 {p.id === parentId
        ? 'bg-purple-500/15 ring-purple-400/40'
        : 'bg-white/5 ring-white/15'}">
        <div>
          <p class="font-bold text-white">{p.name}{p.id === parentId ? '（親）' : ''}</p>
          <p class="text-xs text-slate-400">累計 {p.score} 点</p>
        </div>
        <p class="text-2xl font-mono font-bold {delta > 0 ? 'text-emerald-300' : 'text-slate-400'}">
          {delta > 0 ? '+' : ''}{delta}
        </p>
      </div>
    {/each}
  </div>

  <button
    onclick={onNext}
    class="w-full px-5 py-3 rounded-lg bg-purple-500 hover:bg-purple-400 text-white font-bold shadow-lg shadow-purple-500/30 active:scale-[0.98] transition"
  >
    {isLastRound ? '結果発表' : '次のラウンドへ'}
  </button>
</section>
