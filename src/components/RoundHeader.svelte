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

<header class="ui-card-soft p-4 space-y-3">
  <div class="flex items-baseline justify-between">
    <p class="text-xs ui-text-dim uppercase tracking-widest">Round {roundNumber} / {totalRounds}</p>
    <p class="text-sm ui-text-muted">親: <span class="font-bold ui-text-main">{parent.name}</span></p>
  </div>
  <div class="flex flex-wrap gap-2">
    {#each players as p}
      <div class="ui-chip px-3 py-1.5 rounded-md text-sm {p.id === parent.id ? 'ui-chip-parent' : ''}">
        <span class="ui-text-soft">{p.name}</span>
        <span class="ml-2 font-mono font-bold ui-text-main">{p.score}</span>
      </div>
    {/each}
  </div>
</header>
