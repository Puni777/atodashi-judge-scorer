<script lang="ts">
  import { onMount } from 'svelte'

  type Props = {
    message: string[] | string
    mode?: 'inline' | 'floating'
    collapsed?: boolean
    animateText?: boolean
    onCollapsedChange?: (collapsed: boolean) => void
    onRequestReset?: () => void
    onFloatingHeightChange?: (height: number) => void
    onTypingChange?: (typing: boolean) => void
  }
  let {
    message,
    mode = 'inline',
    collapsed = false,
    animateText = true,
    onCollapsedChange = () => {},
    onRequestReset = () => {},
    onFloatingHeightChange = () => {},
    onTypingChange = () => {},
  }: Props = $props()

  const iconBase = `${import.meta.env.BASE_URL}GM_icon/`
  const idleIcon = `${iconBase}0_ほほえみ.png`
  const mouthClosedIcon = `${iconBase}1_閉じ口.png`
  const mouthOpenIcon = `${iconBase}2_開口.png`

  let displayed = $state('')
  let iconSrc = $state(idleIcon)
  let isTyping = $state(false)
  let reducedMotion = $state(false)

  let typeTimer: number | null = null
  let mouthTimer: number | null = null
  let tapTimer: number | null = null
  let rootEl: HTMLElement | null = null
  let runId = 0
  let mouthFrame = 0
  let typingActive = false
  let typedText = ''
  let activeMessageText: string | null = null
  let lastAvatarTapAt = 0
  let resetMenuOpen = $state(false)

  onMount(() => {
    preloadIcons()
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    let resizeObserver: ResizeObserver | null = null
    reducedMotion = media.matches
    const onChange = () => {
      reducedMotion = media.matches
    }
    const onPointerDown = (event: PointerEvent) => {
      if (mode !== 'floating' || !resetMenuOpen) return
      const target = event.target
      if (target instanceof Node && rootEl?.contains(target)) return
      resetMenuOpen = false
    }
    media.addEventListener('change', onChange)
    document.addEventListener('pointerdown', onPointerDown)

    if (mode === 'floating' && rootEl) {
      const reportHeight = () => {
        onFloatingHeightChange(Math.ceil(rootEl?.getBoundingClientRect().height ?? 0))
      }
      reportHeight()
      if ('ResizeObserver' in window) {
        resizeObserver = new ResizeObserver(reportHeight)
        resizeObserver.observe(rootEl)
      }
    }

    return () => {
      resizeObserver?.disconnect()
      if (mode === 'floating') onFloatingHeightChange(0)
      media.removeEventListener('change', onChange)
      document.removeEventListener('pointerdown', onPointerDown)
      clearTimers()
    }
  })

  $effect(() => {
    const nextMessage = messageToText(message)
    const canAnimate = animateText && !reducedMotion && nextMessage.length > 0
    if (nextMessage !== activeMessageText) {
      activeMessageText = nextMessage
      startTyping(nextMessage)
      return
    }
    if (!canAnimate && (isTyping || displayed !== nextMessage)) {
      showFullText(nextMessage)
    }
  })

  function preloadIcons() {
    for (const src of [idleIcon, mouthClosedIcon, mouthOpenIcon]) {
      const img = new Image()
      img.src = src
    }
  }

  function startTyping(nextMessage: string) {
    clearTimers()
    runId += 1
    const currentRun = runId
    typingActive = false
    typedText = ''

    if (reducedMotion || !animateText || nextMessage.length === 0) {
      showFullText(nextMessage)
      return
    }

    displayed = ''
    mouthFrame = 0
    iconSrc = mouthClosedIcon
    setTypingActive(true)
    scheduleNextMouth(currentRun)
    typeNext(currentRun, Array.from(nextMessage), 0)
  }

  function typeNext(currentRun: number, chars: string[], index: number) {
    if (currentRun !== runId) return
    if (index >= chars.length) {
      finishTyping()
      return
    }

    const char = chars[index] ?? ''
    typedText += char
    displayed = typedText
    const delay = /[、。！？!?\n]/.test(char) ? 120 : 22
    typeTimer = window.setTimeout(() => typeNext(currentRun, chars, index + 1), delay)
  }

  function scheduleNextMouth(currentRun: number) {
    if (currentRun !== runId || !typingActive) return
    const delay = 100 + Math.floor(Math.random() * 41) - 20
    mouthTimer = window.setTimeout(() => {
      if (currentRun !== runId || !typingActive) return
      const frames = [mouthClosedIcon, mouthOpenIcon]
      mouthFrame = (mouthFrame + 1) % frames.length
      iconSrc = frames[mouthFrame] ?? mouthClosedIcon
      scheduleNextMouth(currentRun)
    }, delay)
  }

  function finishTyping() {
    clearMouthTimer()
    iconSrc = idleIcon
    setTypingActive(false)
  }

  function showFullText(nextMessage: string) {
    clearTimers()
    typedText = nextMessage
    displayed = nextMessage
    iconSrc = idleIcon
    setTypingActive(false)
  }

  function clearTimers() {
    if (typeTimer !== null) {
      window.clearTimeout(typeTimer)
      typeTimer = null
    }
    if (tapTimer !== null) {
      window.clearTimeout(tapTimer)
      tapTimer = null
    }
    setTypingActive(false)
    clearMouthTimer()
  }

  function clearMouthTimer() {
    if (mouthTimer !== null) {
      window.clearTimeout(mouthTimer)
      mouthTimer = null
    }
  }

  function handleAvatarClick() {
    if (mode !== 'floating') return
    const now = Date.now()
    if (now - lastAvatarTapAt <= 350) {
      if (tapTimer !== null) {
        window.clearTimeout(tapTimer)
        tapTimer = null
      }
      lastAvatarTapAt = 0
      resetMenuOpen = !resetMenuOpen
      return
    }

    lastAvatarTapAt = now
    tapTimer = window.setTimeout(() => {
      onCollapsedChange(!collapsed)
      resetMenuOpen = false
      tapTimer = null
    }, 260)
  }

  function handleRequestReset() {
    resetMenuOpen = false
    onRequestReset()
  }

  function messageToText(value: string[] | string): string {
    return Array.isArray(value) ? value.filter((line) => line.length > 0).join('\n') : value
  }

  function setTypingActive(active: boolean) {
    const changed = typingActive !== active || isTyping !== active
    typingActive = active
    isTyping = active
    if (changed) onTypingChange(active)
  }

  let ariaText = $derived(messageToText(message))
  let displayedLines = $derived(displayed.split('\n'))
</script>

<section
  bind:this={rootEl}
  class="gm-guide"
  class:gm-guide-floating={mode === 'floating'}
  class:gm-guide-collapsed={mode === 'floating' && collapsed}
  aria-label={`Game Master: ${ariaText}`}
>
  {#if mode === 'floating'}
    <button
      type="button"
      class="gm-avatar-button"
      onclick={handleAvatarClick}
      aria-label={collapsed ? 'GMを開く' : 'GMを閉じる'}
    >
      <span class="gm-avatar-frame" aria-hidden="true">
        <img class="gm-avatar" src={iconSrc} alt="" width="256" height="256" />
      </span>
    </button>
    {#if resetMenuOpen}
      <div class="gm-floating-menu">
        <button type="button" onclick={handleRequestReset} data-audio="confirm">
          セットアップに戻る
        </button>
      </div>
    {/if}
  {:else}
    <div class="gm-avatar-frame" aria-hidden="true">
      <img class="gm-avatar" src={iconSrc} alt="" width="256" height="256" />
    </div>
  {/if}

  <div class="gm-bubble" hidden={mode === 'floating' && collapsed}>
    <p class="gm-label">Game Master</p>
    <p class="gm-message" aria-hidden="true">
      {#each displayedLines as line, index}
        {line}{#if index < displayedLines.length - 1}<br />{/if}
      {/each}<span class="gm-cursor" class:gm-cursor-hidden={!isTyping}>▍</span>
    </p>
    <p class="sr-only">{ariaText}</p>
  </div>
</section>
