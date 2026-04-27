<script lang="ts">
  import { onMount } from 'svelte'
  import type { JudgeCard, ThemeId } from './lib/types'
  import { DEFAULT_THEME_ID, Phase } from './lib/types'
  import { ScoreSession } from './lib/scorer/session.svelte'
  import { loadJudges } from './lib/scorer/judges'
  import { fallbackGmMessages, getGmMessage, loadGmMessages } from './lib/scorer/gmMessages'
  import Setup from './components/Setup.svelte'
  import RoundHeader from './components/RoundHeader.svelte'
  import JudgeSelect from './components/JudgeSelect.svelte'
  import JudgmentPhase from './components/JudgmentPhase.svelte'
  import RoundScore from './components/RoundScore.svelte'
  import GameOver from './components/GameOver.svelte'
  import TimerDisplay from './components/TimerDisplay.svelte'
  import GameMasterGuide from './components/GameMasterGuide.svelte'

  let session = new ScoreSession()
  let judges = $state<JudgeCard[]>([])
  let gmMessages = $state(fallbackGmMessages)
  let loadError = $state('')
  let runError = $state('')
  let activeThemeId = $state<ThemeId>(DEFAULT_THEME_ID)

  onMount(() => {
    void loadJudges()
      .then((cards) => {
        judges = cards
      })
      .catch((e) => {
        loadError = String(e)
      })

    void loadGmMessages().then((messages) => {
      gmMessages = messages
    })
  })

  function safe(action: () => void) {
    try {
      action()
      runError = ''
    } catch (e) {
      runError = e instanceof Error ? e.message : String(e)
    }
  }

  function handleStart(
    names: string[],
    totalRounds: number | null,
    timerSeconds: number,
    themeId: ThemeId,
  ) {
    activeThemeId = themeId
    safe(() => session.startGame(names, { totalRounds, timerSeconds, themeId }))
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
    const { totalRounds, timerSeconds } = session.config
    const themeId = session.config.themeId ?? DEFAULT_THEME_ID
    activeThemeId = themeId
    safe(() => session.startGame(names, { totalRounds, timerSeconds, themeId }))
  }

  let totalRounds = $derived(session.config.totalRounds ?? session.players.length)
  let isLastRound = $derived(session.roundIndex + 1 >= totalRounds)
  let gmMessage = $derived(getGmMessage(gmMessages, session))
</script>

<main class="app-shell" data-theme={activeThemeId}>
  <div class="max-w-2xl mx-auto p-4 sm:p-8 space-y-5">
    <h1 class="text-2xl sm:text-3xl font-bold tracking-tight ui-title">後出しジャッジ Scorer</h1>

    {#if loadError}
      <div class="ui-alert-danger rounded-lg p-4">
        ジャッジカードの読み込みに失敗しました: {loadError}
      </div>
    {/if}

    {#if runError}
      <div class="ui-alert-warning rounded-lg p-3 text-sm">
        {runError}
      </div>
    {/if}

    <GameMasterGuide message={gmMessage} />

    {#if session.phase === Phase.Setup}
      <Setup
        onStart={handleStart}
        selectedThemeId={activeThemeId}
        onThemeChange={(themeId) => (activeThemeId = themeId)}
      />
    {:else if session.phase === Phase.GameOver}
      <GameOver players={session.players} onRestart={handleRestart} />
    {:else}
      <RoundHeader
        roundNumber={session.currentRoundNumber()}
        {totalRounds}
        parent={session.parent()}
        players={session.players}
      />

      {#if session.phase === Phase.RoundStart}
        <section class="ui-card p-6 space-y-4 text-center">
          <p class="text-sm ui-text-dim">このラウンドの親</p>
          <p class="text-3xl font-bold">{session.parent().name}</p>
          <p class="text-sm ui-text-muted">親はジャッジを選んでください</p>
          <button
            onclick={handleEnterParentSetup}
            class="ui-button-primary w-full px-5 py-3 rounded-lg font-bold active:scale-[0.98] transition"
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
        <TimerDisplay timer={session.timer} />
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
