<script lang="ts">
  import type { JudgeCard, Player } from '../lib/types'

  type Props = {
    child: Player
    judge: JudgeCard
    currentOption: number | undefined
    prevOption?: number | undefined
    prevLabel?: string
    onSelect: (childId: number, option: number) => void
  }
  let { child, judge, currentOption, prevOption, prevLabel, onSelect }: Props = $props()

  let prevOptionText = $derived(
    prevOption === undefined ? null : (judge.options[prevOption] ?? null),
  )
</script>

<div class="ui-judgment-row rounded-xl p-4 transition {currentOption !== undefined
  ? 'ui-judgment-row-complete'
  : 'ui-judgment-row-empty'}">
  <div class="flex items-baseline justify-between gap-3">
    <p class="text-base font-bold ui-text-main">{child.name}</p>
    {#if prevOptionText !== null && prevLabel}
      <p class="text-xs ui-text-dim">
        {prevLabel}: <span class="ui-text-soft">{prevOptionText}</span>
      </p>
    {/if}
  </div>

  <div class="mt-3 flex flex-wrap gap-2">
    {#each judge.options as opt, idx}
      <button
        type="button"
        onclick={() => onSelect(child.id, idx)}
        class="ui-choice min-h-[56px] px-5 rounded-full font-bold transition {currentOption === idx
          ? 'ui-choice-active'
          : ''}"
      >
        {opt}
      </button>
    {/each}
  </div>
</div>
