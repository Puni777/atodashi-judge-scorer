<script>
  let judges = $state([]);
  let error = $state('');

  async function loadJudges() {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}data/judges.json`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      judges = data.cards ?? [];
      error = '';
    } catch (e) {
      error = String(e);
    }
  }
</script>

<main class="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-8">
  <div class="max-w-2xl mx-auto space-y-6">
    <h1 class="text-4xl font-bold tracking-tight">後出しジャッジ Scorer</h1>
    <p class="text-slate-300">スモークテスト用ページ。Svelte + Tailwind + JSON fetch が動くかの確認。</p>

    <div class="rounded-xl bg-white/10 backdrop-blur p-6 space-y-4 ring-1 ring-white/20">
      <button
        onclick={loadJudges}
        class="px-5 py-2.5 rounded-lg bg-purple-500 hover:bg-purple-400 active:scale-95 transition font-semibold shadow-lg shadow-purple-500/30"
      >
        judges.json を読み込む
      </button>

      {#if error}
        <p class="text-red-300">エラー: {error}</p>
      {/if}

      {#if judges.length > 0}
        <p class="text-emerald-300">{judges.length} 件読み込み成功</p>
        <ul class="space-y-2 max-h-64 overflow-y-auto">
          {#each judges as j}
            <li class="rounded-md bg-black/20 px-3 py-2 text-sm">
              <span class="font-mono text-purple-300">{j.id}</span>
              {#if j.question}<span class="ml-2">{j.question}</span>{/if}
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  </div>
</main>
