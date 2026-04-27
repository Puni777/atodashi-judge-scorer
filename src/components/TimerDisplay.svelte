<script lang="ts">
  import type { CountdownTimer } from '../lib/scorer/timer.svelte'

  type Props = { timer: CountdownTimer }
  let { timer }: Props = $props()

  let mm = $derived(Math.floor(timer.remainingSeconds / 60))
  let ss = $derived(timer.remainingSeconds % 60)
  let progress = $derived(
    timer.totalSeconds > 0 ? timer.remainingSeconds / timer.totalSeconds : 0,
  )
  let warn = $derived(timer.remainingSeconds > 0 && timer.remainingSeconds <= 30)
  let expired = $derived(timer.expired)
</script>

{#if timer.totalSeconds > 0}
  <div class="rounded-xl p-4 ring-1 transition {expired
    ? 'bg-red-500/30 ring-red-400 animate-pulse'
    : warn
      ? 'bg-amber-500/20 ring-amber-400/60'
      : 'bg-white/5 ring-white/15'}">
    <div class="flex items-baseline justify-between">
      <p class="text-xs text-slate-300 uppercase tracking-widest">残り時間</p>
      {#if expired}
        <p class="text-xs font-bold text-red-200">⏰ 時間切れ</p>
      {:else if !timer.isRunning}
        <p class="text-xs text-slate-400">停止中</p>
      {/if}
    </div>
    <p class="mt-1 font-mono text-4xl font-bold tabular-nums {expired
      ? 'text-red-200'
      : warn
        ? 'text-amber-200'
        : 'text-white'}">
      {mm}:{String(ss).padStart(2, '0')}
    </p>
    <div class="mt-2 h-1.5 rounded-full bg-black/40 overflow-hidden">
      <div
        class="h-full transition-all {expired
          ? 'bg-red-400'
          : warn
            ? 'bg-amber-400'
            : 'bg-purple-400'}"
        style="width: {Math.max(0, Math.min(100, progress * 100))}%"
      ></div>
    </div>
  </div>
{/if}
