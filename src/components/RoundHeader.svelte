<script lang="ts">
  import type { Player } from '../lib/types'

  type Props = {
    roundNumber: number
    totalRounds: number
    parent: Player
    players: Player[]
  }
  let { roundNumber, totalRounds, parent, players }: Props = $props()
</script>

<header class="rounded-xl bg-white/5 backdrop-blur p-4 ring-1 ring-white/15 space-y-3">
  <div class="flex items-baseline justify-between">
    <p class="text-xs text-slate-400 uppercase tracking-widest">Round {roundNumber} / {totalRounds}</p>
    <p class="text-sm text-slate-300">親: <span class="font-bold text-white">{parent.name}</span></p>
  </div>
  <div class="flex flex-wrap gap-2">
    {#each players as p}
      <div class="px-3 py-1.5 rounded-md text-sm {p.id === parent.id
        ? 'bg-purple-500/30 ring-1 ring-purple-400/40'
        : 'bg-black/20 ring-1 ring-white/10'}">
        <span class="text-slate-200">{p.name}</span>
        <span class="ml-2 font-mono font-bold text-white">{p.score}</span>
      </div>
    {/each}
  </div>
</header>
