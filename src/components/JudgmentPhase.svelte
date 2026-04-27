<script lang="ts">
  import type { IdMap, JudgeCard, Player } from '../lib/types'
  import ChildJudgmentRow from './ChildJudgmentRow.svelte'

  type Props = {
    phaseLabel: string
    judge: JudgeCard
    children: Player[]
    currentJudgments: IdMap
    prevJudgments?: IdMap
    prevLabel?: string
    hint?: string
    advanceLabel: string
    onSelect: (childId: number, option: number) => void
    onAdvance: () => void
  }
  let {
    phaseLabel,
    judge,
    children,
    currentJudgments,
    prevJudgments,
    prevLabel,
    hint,
    advanceLabel,
    onSelect,
    onAdvance,
  }: Props = $props()

  let allDone = $derived(children.every((c) => currentJudgments[c.id] !== undefined))
</script>

<section class="space-y-4">
  <div class="ui-card p-5 space-y-2">
    <p class="text-xs ui-text-dim uppercase tracking-widest">{phaseLabel}</p>
    <h2 class="text-2xl font-bold ui-text-main">{judge.question}</h2>
    {#if hint}<p class="text-sm ui-text-muted">{hint}</p>{/if}
  </div>

  <div class="space-y-3">
    {#each children as child}
      <ChildJudgmentRow
        {child}
        {judge}
        currentOption={currentJudgments[child.id]}
        prevOption={prevJudgments?.[child.id]}
        {prevLabel}
        {onSelect}
      />
    {/each}
  </div>

  <button
    onclick={onAdvance}
    disabled={!allDone}
    class="w-full px-5 py-3 rounded-lg font-bold transition {allDone
      ? 'ui-button-primary active:scale-[0.98]'
      : 'ui-button-disabled'}"
  >
    {advanceLabel}
  </button>
</section>
