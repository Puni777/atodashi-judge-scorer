<script lang="ts">
  import type { IdMap, Player, PlayerScoreBreakdown, ScoreBreakdownMap } from '../lib/types'

  type Props = {
    players: Player[]
    parentId: number
    deltas: IdMap
    breakdowns: ScoreBreakdownMap
    isLastRound: boolean
    onNext: () => void
    onEndEarly?: () => void
  }
  let { players, parentId, deltas, breakdowns, isLastRound, onNext, onEndEarly }: Props = $props()

  function signed(value: number): string {
    return value > 0 ? `+${value}` : `${value}`
  }

  function breakdownLabels(
    player: Player,
    breakdown: PlayerScoreBreakdown | undefined,
    delta: number,
  ): string[] {
    if (!breakdown) return [player.id === parentId ? `親点 ${signed(delta)}` : `得点 ${signed(delta)}`]
    if (breakdown.kind === 'parent') {
      return [
        `親点 ${signed(breakdown.total)}`,
        `第1→第2: ${breakdown.firstToSecond}`,
        `第2→最終: ${breakdown.secondToFinal}`,
      ]
    }
    if (breakdown.updatePoints > 0) {
      return [`更新点 +${breakdown.updatePoints}`, '第2→最終で変更']
    }
    if (breakdown.pullPoints > 0) {
      return [`引き込み点 +${breakdown.pullPoints}`, `${breakdown.pullCount}人 × 2点`]
    }
    return ['引き込み点 0', '据え置き・引き込みなし']
  }
</script>

<section class="space-y-4">
  <div class="ui-card p-5">
    <h2 class="text-xl font-bold ui-text-main">ラウンド結果</h2>
  </div>

  <div class="space-y-2">
    {#each players as p}
      {@const delta = deltas[p.id] ?? 0}
      {@const labels = breakdownLabels(p, breakdowns[p.id], delta)}
      <div class="ui-result-row flex items-center justify-between rounded-lg p-4 {p.id === parentId
        ? 'ui-result-row-parent'
        : ''}">
        <div class="min-w-0 pr-3">
          <p class="font-bold ui-text-main">{p.name}{p.id === parentId ? '（親）' : ''}</p>
          <p class="text-xs ui-text-dim">累計 {p.score} 点</p>
          <div class="mt-2 flex flex-wrap gap-1.5">
            {#each labels as label}
              <span class="ui-pill rounded-full px-2.5 py-1 text-xs">{label}</span>
            {/each}
          </div>
        </div>
        <p class="shrink-0 text-2xl font-mono font-bold {delta > 0 ? 'ui-text-positive' : 'ui-text-dim'}">
          {delta > 0 ? '+' : ''}{delta}
        </p>
      </div>
    {/each}
  </div>

  <button
    onclick={onNext}
    data-audio="confirm"
    class="ui-button-primary w-full px-5 py-3 rounded-lg font-bold active:scale-[0.98] transition"
  >
    {isLastRound ? '結果発表' : '次のラウンドへ'}
  </button>

  {#if !isLastRound && onEndEarly}
    <button
      onclick={onEndEarly}
      data-audio="confirm"
      class="ui-button-secondary w-full px-5 py-3 rounded-lg font-bold active:scale-[0.98] transition"
    >
      ここで終了して結果発表
    </button>
  {/if}
</section>
