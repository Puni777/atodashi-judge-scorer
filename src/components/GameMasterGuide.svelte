<script lang="ts">
  import { onMount } from 'svelte'

  type Props = {
    message: string
  }
  let { message }: Props = $props()

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
  let runId = 0
  let mouthFrame = 0
  let typingActive = false
  let typedText = ''

  onMount(() => {
    preloadIcons()
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    reducedMotion = media.matches
    const onChange = () => {
      reducedMotion = media.matches
    }
    media.addEventListener('change', onChange)
    return () => {
      media.removeEventListener('change', onChange)
      clearTimers()
    }
  })

  $effect(() => {
    startTyping(message)
    return clearTimers
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

    if (reducedMotion || nextMessage.length === 0) {
      displayed = nextMessage
      iconSrc = idleIcon
      isTyping = false
      return
    }

    displayed = ''
    isTyping = true
    typingActive = true
    mouthFrame = 0
    iconSrc = mouthClosedIcon
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
    const delay = /[、。！？!?]/.test(char) ? 120 : 22
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
    typingActive = false
    iconSrc = idleIcon
    isTyping = false
  }

  function clearTimers() {
    if (typeTimer !== null) {
      window.clearTimeout(typeTimer)
      typeTimer = null
    }
    typingActive = false
    clearMouthTimer()
  }

  function clearMouthTimer() {
    if (mouthTimer !== null) {
      window.clearTimeout(mouthTimer)
      mouthTimer = null
    }
  }
</script>

<section class="gm-guide" aria-label={`Game Master: ${message}`}>
  <div class="gm-avatar-frame" aria-hidden="true">
    <img class="gm-avatar" src={iconSrc} alt="" width="256" height="256" />
  </div>
  <div class="gm-bubble">
    <p class="gm-label">Game Master</p>
    <p class="gm-message" aria-hidden="true">
      {displayed}<span class="gm-cursor" class:gm-cursor-hidden={!isTyping}>▍</span>
    </p>
    <p class="sr-only">{message}</p>
  </div>
</section>
