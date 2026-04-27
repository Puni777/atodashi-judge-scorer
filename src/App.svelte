<script lang="ts">
  import { onMount } from 'svelte'
  import type { JudgeCard, ThemeId } from './lib/types'
  import { DEFAULT_THEME_ID, Phase, THEME_OPTIONS } from './lib/types'
  import { ScoreSession, parseScoreSessionSnapshot } from './lib/scorer/session.svelte'
  import type { ScoreSessionSnapshot } from './lib/scorer/session.svelte'
  import { loadJudges } from './lib/scorer/judges'
  import { fallbackGmMessages, getGmMessage, loadGmMessages } from './lib/scorer/gmMessages'
  import { AudioManager } from './lib/audio/audioManager'
  import type { AudioLoadStatus } from './lib/audio/audioManager'
  import { fallbackAudioAssets, loadAudioAssets } from './lib/audio/assets'
  import Setup from './components/Setup.svelte'
  import RoundHeader from './components/RoundHeader.svelte'
  import JudgeSelect from './components/JudgeSelect.svelte'
  import JudgmentPhase from './components/JudgmentPhase.svelte'
  import RoundScore from './components/RoundScore.svelte'
  import GameOver from './components/GameOver.svelte'
  import TimerDisplay from './components/TimerDisplay.svelte'
  import GameMasterGuide from './components/GameMasterGuide.svelte'

  const SESSION_STORAGE_KEY = 'atodashi-judge-scorer:session:v1'
  const UI_STORAGE_KEY = 'atodashi-judge-scorer:ui:v1'
  const UI_STORAGE_VERSION = 1

  type UiSettingsSnapshot = {
    version: typeof UI_STORAGE_VERSION
    themeId: ThemeId
    floatingGmEnabled: boolean
    floatingGmCollapsed: boolean
    seEnabled: boolean
    bgmEnabled: boolean
    seVolume: number
    bgmVolume: number
  }

  let session = new ScoreSession()
  let judges = $state<JudgeCard[]>([])
  let gmMessages = $state(fallbackGmMessages)
  let loadError = $state('')
  let runError = $state('')
  let activeThemeId = $state<ThemeId>(DEFAULT_THEME_ID)
  let floatingGmEnabled = $state(true)
  let floatingGmCollapsed = $state(false)
  let seEnabled = $state(true)
  let bgmEnabled = $state(true)
  let seVolume = $state(1)
  let bgmVolume = $state(0.5)
  let pendingResume = $state<ScoreSessionSnapshot | null>(null)
  let storageReady = $state(false)
  let sessionPersistenceEnabled = $state(false)
  let inlineGmHost: HTMLElement | null = null
  let inlineGmVisible = $state(true)
  let audioManager: AudioManager | null = null
  let audioStatus = $state<AudioLoadStatus>('loading')
  let previousAudioPhase: Phase = Phase.Setup
  let alarmPlayedForCurrentFinal = false

  onMount(() => {
    let gmObserver: IntersectionObserver | null = null
    let unsubscribeAlarm: (() => void) | null = null
    let unsubscribeAudioStatus: (() => void) | null = null

    const uiSettings = readUiSettings()
    if (uiSettings) {
      activeThemeId = uiSettings.themeId
      floatingGmEnabled = uiSettings.floatingGmEnabled
      floatingGmCollapsed = false
      seEnabled = uiSettings.seEnabled
      bgmEnabled = uiSettings.bgmEnabled
      seVolume = uiSettings.seVolume
      bgmVolume = uiSettings.bgmVolume
    }

    const storedSession = readStoredSession()
    if (storedSession && storedSession.phase !== Phase.Setup && storedSession.players.length > 0) {
      pendingResume = storedSession
      sessionPersistenceEnabled = false
    } else {
      pendingResume = null
      sessionPersistenceEnabled = true
    }
    storageReady = true

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

    if (inlineGmHost && 'IntersectionObserver' in window) {
      gmObserver = new IntersectionObserver(([entry]) => {
        inlineGmVisible = Boolean(entry?.isIntersecting)
      })
      gmObserver.observe(inlineGmHost)
    } else {
      inlineGmVisible = false
    }

    audioManager = new AudioManager(fallbackAudioAssets)
    unsubscribeAudioStatus = audioManager.onStatusChange((status) => {
      audioStatus = status
    })
    audioManager.setSeEnabled(seEnabled)
    audioManager.setBgmEnabled(bgmEnabled)
    audioManager.setSeVolume(seVolume)
    audioManager.setBgmVolume(bgmVolume)
    audioManager.startAutoplay()
    unsubscribeAlarm = session.timer.on('expired', () => playAlarmOnce())

    const onPointerDown = (event: PointerEvent) => {
      const sound = interactiveTapSound(event.target)
      if (sound) audioManager?.playSe(sound)
      audioManager?.resumeMainBgmAfterGesture()
    }
    document.addEventListener('pointerdown', onPointerDown)

    void loadAudioAssets().then((assets) => {
      audioManager?.setAssets(assets)
      audioManager?.startAutoplay()
    })

    return () => {
      gmObserver?.disconnect()
      unsubscribeAlarm?.()
      unsubscribeAudioStatus?.()
      document.removeEventListener('pointerdown', onPointerDown)
      audioManager?.stopBgm('main')
      audioManager = null
    }
  })

  $effect(() => {
    if (!storageReady) return
    writeUiSettings({
      version: UI_STORAGE_VERSION,
      themeId: activeThemeId,
      floatingGmEnabled,
      floatingGmCollapsed,
      seEnabled,
      bgmEnabled,
      seVolume,
      bgmVolume,
    })
  })

  $effect(() => {
    audioManager?.setSeEnabled(seEnabled)
    audioManager?.setBgmEnabled(bgmEnabled)
    audioManager?.setSeVolume(seVolume)
    audioManager?.setBgmVolume(bgmVolume)
  })

  $effect(() => {
    if (!storageReady || !sessionPersistenceEnabled) return
    if (session.phase === Phase.Setup || session.players.length === 0) {
      clearStoredSession()
      return
    }
    writeStoredSession(session.toSnapshot())
  })

  $effect(() => {
    const phase = session.phase
    if (phase === previousAudioPhase) return
    previousAudioPhase = phase
    if (phase === Phase.RoundScore) {
      audioManager?.playSe('roundScore')
    } else if (phase === Phase.GameOver) {
      audioManager?.playSe('finalScore')
    }
    if (phase === Phase.FinalJudgment) {
      alarmPlayedForCurrentFinal = false
    } else {
      alarmPlayedForCurrentFinal = true
    }
  })

  $effect(() => {
    if (session.phase === Phase.FinalJudgment && session.timer.expired) {
      playAlarmOnce()
    }
  })

  function safe(action: () => void): boolean {
    try {
      action()
      runError = ''
      return true
    } catch (e) {
      runError = e instanceof Error ? e.message : String(e)
      return false
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

  function handleResumeSavedGame() {
    const snapshot = pendingResume
    if (!snapshot) return
    safe(() => {
      session.restoreSnapshot(snapshot)
      activeThemeId = session.config.themeId ?? activeThemeId
      pendingResume = null
      sessionPersistenceEnabled = true
    })
  }

  function handleStartNewInsteadOfResume() {
    pendingResume = null
    sessionPersistenceEnabled = true
    clearStoredSession()
    safe(() => session.resetToSetup())
  }

  function handleFloatingGmChange(enabled: boolean) {
    floatingGmEnabled = enabled
  }

  function handleFloatingGmCollapsedChange(collapsed: boolean) {
    floatingGmCollapsed = collapsed
  }

  function handleSeEnabledChange(enabled: boolean) {
    seEnabled = enabled
  }

  function handleBgmEnabledChange(enabled: boolean) {
    bgmEnabled = enabled
  }

  function handleSeVolumeChange(volume: number) {
    seVolume = volume
  }

  function handleBgmVolumeChange(volume: number) {
    bgmVolume = volume
  }

  function handleResetToSetupWithConfirm() {
    const ok = window.confirm(
      'ゲームを初期化してセットアップ画面に戻りますか？現在の進行状況は削除されます。',
    )
    if (ok) handleResetToSetup()
  }

  function handleResetToSetup() {
    pendingResume = null
    sessionPersistenceEnabled = true
    clearStoredSession()
    safe(() => session.resetToSetup())
  }

  function readStoredSession(): ScoreSessionSnapshot | null {
    try {
      const raw = window.localStorage.getItem(SESSION_STORAGE_KEY)
      return raw ? parseScoreSessionSnapshot(JSON.parse(raw)) : null
    } catch {
      return null
    }
  }

  function writeStoredSession(snapshot: ScoreSessionSnapshot) {
    try {
      window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(snapshot))
    } catch {
      // localStorage が使えない環境では、通常の一時セッションとして動かす。
    }
  }

  function clearStoredSession() {
    try {
      window.localStorage.removeItem(SESSION_STORAGE_KEY)
    } catch {
      // localStorage が使えない環境では何もしない。
    }
  }

  function readUiSettings(): UiSettingsSnapshot | null {
    try {
      const raw = window.localStorage.getItem(UI_STORAGE_KEY)
      const parsed = raw ? JSON.parse(raw) : null
      return parseUiSettings(parsed)
    } catch {
      return null
    }
  }

  function writeUiSettings(settings: UiSettingsSnapshot) {
    try {
      window.localStorage.setItem(UI_STORAGE_KEY, JSON.stringify(settings))
    } catch {
      // localStorage が使えない環境ではデフォルト設定で動かす。
    }
  }

  function parseUiSettings(value: unknown): UiSettingsSnapshot | null {
    const obj =
      typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null
    if (
      !obj ||
      obj.version !== UI_STORAGE_VERSION ||
      !isThemeId(obj.themeId) ||
      typeof obj.floatingGmEnabled !== 'boolean' ||
      typeof obj.floatingGmCollapsed !== 'boolean'
    ) {
      return null
    }
    return {
      version: UI_STORAGE_VERSION,
      themeId: obj.themeId,
      floatingGmEnabled: obj.floatingGmEnabled,
      floatingGmCollapsed: obj.floatingGmCollapsed,
      seEnabled: typeof obj.seEnabled === 'boolean' ? obj.seEnabled : true,
      bgmEnabled: typeof obj.bgmEnabled === 'boolean' ? obj.bgmEnabled : true,
      seVolume: typeof obj.seVolume === 'number' ? clampUnit(obj.seVolume) : 1,
      bgmVolume: typeof obj.bgmVolume === 'number' ? clampUnit(obj.bgmVolume) : 0.5,
    }
  }

  function isThemeId(value: unknown): value is ThemeId {
    return typeof value === 'string' && THEME_OPTIONS.some((theme) => theme.id === value)
  }

  function clampUnit(value: number): number {
    return Math.max(0, Math.min(1, value))
  }

  function playAlarmOnce() {
    if (alarmPlayedForCurrentFinal) return
    alarmPlayedForCurrentFinal = true
    audioManager?.playSe('alarm')
  }

  function interactiveTapSound(target: EventTarget | null): 'tap' | 'confirm' | null {
    if (!(target instanceof Element)) return null
    const interactive = target.closest('button, input, label, select, textarea, [role="button"]')
    if (!interactive) return null
    if (interactive instanceof HTMLButtonElement && interactive.disabled) return null
    if (interactive instanceof HTMLInputElement && interactive.disabled) return null
    if (interactive instanceof HTMLSelectElement && interactive.disabled) return null
    if (interactive instanceof HTMLTextAreaElement && interactive.disabled) return null
    return interactive.getAttribute('data-audio') === 'confirm' ? 'confirm' : 'tap'
  }

  let totalRounds = $derived(session.config.totalRounds ?? session.players.length)
  let isLastRound = $derived(session.roundIndex + 1 >= totalRounds)
  let gmMessage = $derived(getGmMessage(gmMessages, session))
</script>

<main
  class="app-shell"
  class:app-shell-floating-gm={floatingGmEnabled && session.phase !== Phase.Setup}
  data-theme={activeThemeId}
>
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

    <div bind:this={inlineGmHost}>
      <GameMasterGuide message={gmMessage} />
    </div>

    {#if session.phase === Phase.Setup}
      {#if pendingResume}
        <section class="ui-card p-5 space-y-4">
          <div class="space-y-1">
            <h2 class="text-xl font-bold ui-text-main">保存されたゲームがあります</h2>
            <p class="text-sm ui-text-muted">
              前回の続きから再開するか、新しくセットアップを始められます。
            </p>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onclick={handleResumeSavedGame}
              data-audio="confirm"
              class="ui-button-primary px-5 py-3 rounded-lg font-bold active:scale-[0.98] transition"
            >
              続きから再開
            </button>
            <button
              type="button"
              onclick={handleStartNewInsteadOfResume}
              data-audio="confirm"
              class="ui-button-secondary px-5 py-3 rounded-lg font-bold active:scale-[0.98] transition"
            >
              新しく始める
            </button>
          </div>
        </section>
      {:else}
        <Setup
          onStart={handleStart}
          selectedThemeId={activeThemeId}
          onThemeChange={(themeId) => (activeThemeId = themeId)}
          {floatingGmEnabled}
          onFloatingGmChange={handleFloatingGmChange}
          {seEnabled}
          {bgmEnabled}
          {seVolume}
          {bgmVolume}
          {audioStatus}
          onSeEnabledChange={handleSeEnabledChange}
          onBgmEnabledChange={handleBgmEnabledChange}
          onSeVolumeChange={handleSeVolumeChange}
          onBgmVolumeChange={handleBgmVolumeChange}
        />
      {/if}
    {:else if session.phase === Phase.GameOver}
      <GameOver players={session.players} onRestart={handleRestart} onSetup={handleResetToSetup} />
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
            data-audio="confirm"
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

  {#if floatingGmEnabled && session.phase !== Phase.Setup && !inlineGmVisible}
    <GameMasterGuide
      message={gmMessage}
      mode="floating"
      collapsed={floatingGmCollapsed}
      onCollapsedChange={handleFloatingGmCollapsedChange}
      onRequestReset={handleResetToSetupWithConfirm}
    />
  {/if}
</main>
