<script lang="ts">
  import Settings from 'lucide-svelte/icons/settings'

  type Props = {
    onOpenOptions: () => void
  }

  let { onOpenOptions }: Props = $props()
</script>

<header class="app-header">
  <div class="app-logo" aria-label="後出しジャッジ Scorer">
    <span class="app-logo-mark" aria-hidden="true">
      <span class="app-logo-card app-logo-card-back"></span>
      <span class="app-logo-card app-logo-card-front">判</span>
    </span>
    <span class="app-logo-copy">
      <span class="app-logo-main">
        <span class="app-logo-word">後出し</span>
        <span class="app-logo-word app-logo-word-accent">ジャッジ</span>
      </span>
      <span class="app-logo-sub">Scorer</span>
    </span>
  </div>

  <button
    type="button"
    class="app-header-options"
    onclick={onOpenOptions}
    aria-label="オプションを開く"
  >
    <Settings size={20} strokeWidth={2.4} aria-hidden="true" />
  </button>
</header>
