<script lang="ts">
  import type { Player } from '../lib/types'
  import { rankedStandings } from '../lib/scorer/session.svelte'

  type Props = {
    players: Player[]
    onRestart: () => void
  }
  let { players, onRestart }: Props = $props()

  let ranked = $derived(rankedStandings(players))

  function rankLabel(rank: number): string {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return `${rank}.`
  }

  function isTop(rank: number): boolean {
    return rank === 1
  }
</script>

<section class="space-y-4">
  <div class="rounded-xl bg-white/10 backdrop-blur p-5 ring-1 ring-white/20">
    <h2 class="text-2xl font-bold text-white">最終結果</h2>
  </div>

  <ol class="space-y-2">
    {#each ranked as { rank, player } (player.id)}
      <li class="flex items-center justify-between rounded-lg p-4 ring-1 {isTop(rank)
        ? 'bg-amber-400/15 ring-amber-400/50'
        : 'bg-white/5 ring-white/15'}">
        <div class="flex items-center gap-3">
          <span class="text-xl w-8 text-center">{rankLabel(rank)}</span>
          <p class="font-bold text-white">{player.name}</p>
        </div>
        <p class="text-2xl font-mono font-bold text-white">{player.score}</p>
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
