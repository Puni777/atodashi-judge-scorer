<script lang="ts">
  import type { Player } from '../lib/types'
  import { rankedStandings } from '../lib/scorer/session.svelte'

  type Props = {
    players: Player[]
    onRestart: () => void
    onSetup: () => void
  }
  let { players, onRestart, onSetup }: Props = $props()

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
  <div class="ui-card p-5">
    <h2 class="text-2xl font-bold ui-text-main">最終結果</h2>
  </div>

  <ol class="space-y-2">
    {#each ranked as { rank, player } (player.id)}
      <li class="ui-result-row flex items-center justify-between rounded-lg p-4 {isTop(rank)
        ? 'ui-result-row-top'
        : ''}">
        <div class="flex items-center gap-3">
          <span class="text-xl w-8 text-center">{rankLabel(rank)}</span>
          <p class="font-bold ui-text-main">{player.name}</p>
        </div>
        <p class="text-2xl font-mono font-bold ui-text-main">{player.score}</p>
      </li>
    {/each}
  </ol>

  <button
    onclick={onRestart}
    data-audio="confirm"
    class="ui-button-primary w-full px-5 py-3 rounded-lg font-bold active:scale-[0.98] transition"
  >
    もう 1 試合
  </button>
  <button
    onclick={onSetup}
    data-audio="confirm"
    class="ui-button-secondary w-full px-5 py-3 rounded-lg font-bold active:scale-[0.98] transition"
  >
    セットアップに戻る
  </button>
</section>
