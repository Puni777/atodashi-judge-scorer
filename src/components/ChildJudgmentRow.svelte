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

<div class="rounded-xl p-4 transition ring-1 {currentOption !== undefined
  ? 'bg-emerald-400/10 ring-emerald-400/40'
  : 'bg-white/5 ring-white/15 ring-dashed'}">
  <div class="flex items-baseline justify-between gap-3">
    <p class="text-base font-bold text-white">{child.name}</p>
    {#if prevOptionText !== null && prevLabel}
      <p class="text-xs text-slate-400">
        {prevLabel}: <span class="text-slate-200">{prevOptionText}</span>
      </p>
    {/if}
  </div>

  <div class="mt-3 flex flex-wrap gap-2">
    {#each judge.options as opt, idx}
      <button
        type="button"
        onclick={() => onSelect(child.id, idx)}
        class="min-h-[56px] px-5 rounded-full font-bold transition ring-2 {currentOption === idx
          ? 'bg-purple-500 ring-purple-400 text-white shadow-lg shadow-purple-500/30'
          : 'bg-black/20 ring-white/15 text-slate-200 hover:bg-white/10'}"
      >
        {opt}
      </button>
    {/each}
  </div>
</div>
