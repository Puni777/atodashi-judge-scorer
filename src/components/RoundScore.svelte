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
  <div class="ui-card p-5">
    <h2 class="text-xl font-bold ui-text-main">ラウンド結果</h2>
  </div>

  <div class="space-y-2">
    {#each players as p}
      {@const delta = deltas[p.id] ?? 0}
      <div class="ui-result-row flex items-center justify-between rounded-lg p-4 {p.id === parentId
        ? 'ui-result-row-parent'
        : ''}">
        <div>
          <p class="font-bold ui-text-main">{p.name}{p.id === parentId ? '（親）' : ''}</p>
          <p class="text-xs ui-text-dim">累計 {p.score} 点</p>
        </div>
        <p class="text-2xl font-mono font-bold {delta > 0 ? 'ui-text-positive' : 'ui-text-dim'}">
          {delta > 0 ? '+' : ''}{delta}
        </p>
      </div>
    {/each}
  </div>

  <button
    onclick={onNext}
    class="ui-button-primary w-full px-5 py-3 rounded-lg font-bold active:scale-[0.98] transition"
  >
    {isLastRound ? '結果発表' : '次のラウンドへ'}
  </button>
</section>
