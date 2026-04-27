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
  <div class="ui-timer rounded-xl p-4 transition {expired
    ? 'ui-timer-expired animate-pulse'
    : warn
      ? 'ui-timer-warn'
      : ''}">
    <div class="flex items-baseline justify-between">
      <p class="text-xs ui-text-muted uppercase tracking-widest">残り時間</p>
      {#if expired}
        <p class="text-xs font-bold ui-text-danger">⏰ 時間切れ</p>
      {:else if !timer.isRunning}
        <p class="text-xs ui-text-dim">停止中</p>
      {/if}
    </div>
    <p class="mt-1 font-mono text-4xl font-bold tabular-nums {expired
      ? 'ui-text-danger'
      : warn
        ? 'ui-text-warning'
        : 'ui-text-main'}">
      {mm}:{String(ss).padStart(2, '0')}
    </p>
    <div class="ui-progress-track mt-2 h-1.5 rounded-full overflow-hidden">
      <div
        class="h-full transition-all {expired
          ? 'ui-progress-danger'
          : warn
            ? 'ui-progress-warning'
            : 'ui-progress-accent'}"
        style="width: {Math.max(0, Math.min(100, progress * 100))}%"
      ></div>
    </div>
  </div>
{/if}
