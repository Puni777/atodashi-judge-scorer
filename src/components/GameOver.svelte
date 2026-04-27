<script lang="ts">
  import type { Player } from '../lib/types'

  type Props = {
    standings: Player[]
    onRestart: () => void
  }
  let { standings, onRestart }: Props = $props()

  const medals = ['🥇', '🥈', '🥉']
</script>

<section class="space-y-4">
  <div class="rounded-xl bg-white/10 backdrop-blur p-5 ring-1 ring-white/20">
    <h2 class="text-2xl font-bold text-white">最終結果</h2>
  </div>

  <ol class="space-y-2">
    {#each standings as p, i}
      <li class="flex items-center justify-between rounded-lg p-4 ring-1 {i === 0
        ? 'bg-amber-400/15 ring-amber-400/50'
        : 'bg-white/5 ring-white/15'}">
        <div class="flex items-center gap-3">
          <span class="text-xl w-8 text-center">{medals[i] ?? `${i + 1}.`}</span>
          <p class="font-bold text-white">{p.name}</p>
        </div>
        <p class="text-2xl font-mono font-bold text-white">{p.score}</p>
      </li>
    {/each}
  </ol>

  <button
    onclick={onRestart}
    class="w-full px-5 py-3 rounded-lg bg-purple-500 hover:bg-purple-400 text-white font-bold shadow-lg shadow-purple-500/30 active:scale-[0.98] transition"
  >
    もう 1 試合
  </button>
</section>
