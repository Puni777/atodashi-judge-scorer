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
  <div class="rounded-xl bg-white/10 backdrop-blur p-5 ring-1 ring-white/20 space-y-2">
    <p class="text-xs text-slate-400 uppercase tracking-widest">{phaseLabel}</p>
    <h2 class="text-2xl font-bold text-white">{judge.question}</h2>
    {#if hint}<p class="text-sm text-slate-300">{hint}</p>{/if}
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
      ? 'bg-purple-500 hover:bg-purple-400 text-white shadow-lg shadow-purple-500/30 active:scale-[0.98]'
      : 'bg-white/5 text-slate-500 cursor-not-allowed'}"
  >
    {advanceLabel}
  </button>
</section>
