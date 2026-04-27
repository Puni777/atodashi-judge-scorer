<script lang="ts">
  import { onMount } from 'svelte'
  import type { JudgeCard } from './lib/types'
  import { Phase } from './lib/types'
  import { ScoreSession } from './lib/scorer/session.svelte'
  import { loadJudges } from './lib/scorer/judges'
  import Setup from './components/Setup.svelte'
  import RoundHeader from './components/RoundHeader.svelte'
  import JudgeSelect from './components/JudgeSelect.svelte'
  import JudgmentPhase from './components/JudgmentPhase.svelte'
  import RoundScore from './components/RoundScore.svelte'
  import GameOver from './components/GameOver.svelte'

  let session = new ScoreSession()
  let judges = $state<JudgeCard[]>([])
  let loadError = $state('')
  let runError = $state('')

  onMount(async () => {
    try {
      judges = await loadJudges()
    } catch (e) {
      loadError = String(e)
    }
  })

  function safe(action: () => void) {
    try {
      action()
      runError = ''
    } catch (e) {
      runError = e instanceof Error ? e.message : String(e)
    }
  }

  function handleStart(names: string[], totalRounds: number | null) {
    safe(() => session.startGame(names, { totalRounds }))
  }

  function handleEnterParentSetup() {
    safe(() => session.enterParentSetup())
  }

  function handleConfirmJudge(card: JudgeCard) {
    safe(() => {
      session.setJudge(card)
      session.enterFirstJudgment()
    })
  }

  function handleSubmitFirst(childId: number, option: number) {
    safe(() => session.submitFirst(childId, option))
  }

  function handleSubmitSecond(childId: number, option: number) {
    safe(() => session.submitSecond(childId, option))
  }

  function handleSubmitFinal(childId: number, option: number) {
    safe(() => session.submitFinal(childId, option))
  }

  function handleAdvanceToSecond() {
    safe(() => session.advanceToSecond())
  }

  function handleAdvanceToFinal() {
    safe(() => session.advanceToFinal())
  }

  function handleFinalize() {
    safe(() => session.finalizeRound())
  }

  function handleNextRound() {
    safe(() => session.nextRound())
  }

  function handleRestart() {
    const names = session.players.map((p) => p.name)
    const totalRounds = session.config.totalRounds
    safe(() => session.startGame(names, { totalRounds }))
  }

  let totalRounds = $derived(session.config.totalRounds ?? session.players.length)
  let isLastRound = $derived(session.roundIndex + 1 >= totalRounds)
</script>

<main class="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 text-white">
  <div class="max-w-2xl mx-auto p-4 sm:p-8 space-y-5">
    <h1 class="text-2xl sm:text-3xl font-bold tracking-tight">後出しジャッジ Scorer</h1>

    {#if loadError}
      <div class="rounded-lg bg-red-500/20 ring-1 ring-red-400/50 p-4 text-red-200">
        ジャッジカードの読み込みに失敗しました: {loadError}
      </div>
    {/if}

    {#if runError}
      <div class="rounded-lg bg-amber-500/20 ring-1 ring-amber-400/50 p-3 text-amber-200 text-sm">
        {runError}
      </div>
    {/if}

    {#if session.phase === Phase.Setup}
      <Setup onStart={handleStart} />
    {:else if session.phase === Phase.GameOver}
      <GameOver standings={session.standings()} onRestart={handleRestart} />
    {:else}
      <RoundHeader
        roundNumber={session.currentRoundNumber()}
        {totalRounds}
        parent={session.parent()}
        players={session.players}
      />

      {#if session.phase === Phase.RoundStart}
        <section class="rounded-xl bg-white/10 backdrop-blur p-6 space-y-4 ring-1 ring-white/20 text-center">
          <p class="text-sm text-slate-400">このラウンドの親</p>
          <p class="text-3xl font-bold">{session.parent().name}</p>
          <p class="text-sm text-slate-300">親はジャッジを選んでください</p>
          <button
            onclick={handleEnterParentSetup}
            class="w-full px-5 py-3 rounded-lg bg-purple-500 hover:bg-purple-400 text-white font-bold shadow-lg shadow-purple-500/30 active:scale-[0.98] transition"
          >
            ジャッジを選ぶ
          </button>
        </section>
      {:else if session.phase === Phase.ParentSetup}
        <JudgeSelect {judges} onConfirm={handleConfirmJudge} />
      {:else if session.phase === Phase.FirstJudgment && session.roundState?.judge}
        <JudgmentPhase
          phaseLabel="第 1 判断"
          judge={session.roundState.judge}
          children={session.children()}
          currentJudgments={session.roundState.firstJudgments}
          advanceLabel="親がアイテムを追加 → 次へ"
          onSelect={handleSubmitFirst}
          onAdvance={handleAdvanceToSecond}
        />
      {:else if session.phase === Phase.SecondJudgment && session.roundState?.judge}
        <JudgmentPhase
          phaseLabel="第 2 判断"
          judge={session.roundState.judge}
          children={session.children()}
          currentJudgments={session.roundState.secondJudgments}
          prevJudgments={session.roundState.firstJudgments}
          prevLabel="第1"
          hint="親がアイテムを追加したあと、もう一度判断してください"
          advanceLabel="話し合い → 次へ"
          onSelect={handleSubmitSecond}
          onAdvance={handleAdvanceToFinal}
        />
      {:else if session.phase === Phase.FinalJudgment && session.roundState?.judge}
        <JudgmentPhase
          phaseLabel="最終判断"
          judge={session.roundState.judge}
          children={session.children()}
          currentJudgments={session.roundState.finalJudgments}
          prevJudgments={session.roundState.secondJudgments}
          prevLabel="第2"
          hint="話し合い + 子のアイテム追加後の最終判断"
          advanceLabel="採点する"
          onSelect={handleSubmitFinal}
          onAdvance={handleFinalize}
        />
      {:else if session.phase === Phase.RoundScore && session.roundState}
        <RoundScore
          players={session.players}
          parentId={session.roundState.parentId}
          deltas={session.roundState.scoreDelta}
          {isLastRound}
          onNext={handleNextRound}
        />
      {/if}
    {/if}
  </div>
</main>
