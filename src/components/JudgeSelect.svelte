<script lang="ts">
  import type { JudgeCard } from '../lib/types'

  type Props = {
    judges: JudgeCard[]
    onConfirm: (card: JudgeCard) => void
  }
  let { judges, onConfirm }: Props = $props()

  let selectedId = $state<string | null>(null)

  function confirm() {
    const card = judges.find((j) => j.id === selectedId)
    if (card) onConfirm(card)
  }
</script>

<section class="space-y-4">
  <div class="rounded-xl bg-white/10 backdrop-blur p-5 ring-1 ring-white/20">
    <h2 class="text-lg font-bold">ジャッジを選んでください</h2>
    <p class="text-sm text-slate-300 mt-1">親が場に出すジャッジカードを 1 枚タップ</p>
  </div>

  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
    {#each judges as j}
      <button
        type="button"
        onclick={() => (selectedId = j.id)}
        class="text-left rounded-lg p-4 transition ring-1 {selectedId === j.id
          ? 'bg-purple-500/30 ring-purple-400 shadow-lg shadow-purple-500/20'
          : 'bg-white/5 ring-white/15 hover:bg-white/10'}"
      >
        <p class="text-base font-bold text-white">{j.question}</p>
        <div class="mt-2 flex flex-wrap gap-1.5">
          {#each j.options as opt}
            <span class="text-xs px-2 py-0.5 rounded-full bg-black/30 text-slate-300 ring-1 ring-white/10">{opt}</span>
          {/each}
        </div>
      </button>
    {/each}
  </div>

  <button
    onclick={confirm}
    disabled={!selectedId}
    class="w-full px-5 py-3 rounded-lg font-bold transition {selectedId
      ? 'bg-purple-500 hover:bg-purple-400 text-white shadow-lg shadow-purple-500/30 active:scale-[0.98]'
      : 'bg-white/5 text-slate-500 cursor-not-allowed'}"
  >
    決定
  </button>
</section>
