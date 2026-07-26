let audioContext: AudioContext | null = null

/**
 * Create/resume the AudioContext inside a user gesture (the start click) so
 * the finish beep isn't blocked by the browser autoplay policy.
 */
export const primeAudio = (): void => {
  if (typeof AudioContext === "undefined") return
  audioContext ??= new AudioContext()
  if (audioContext.state === "suspended") void audioContext.resume()
}

/** Three short sine pulses. No audio asset needed. */
export const beep = (): void => {
  if (!audioContext) return
  const now = audioContext.currentTime
  for (const offset of [0, 0.35, 0.7]) {
    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()
    oscillator.type = "sine"
    oscillator.frequency.value = 880
    gain.gain.setValueAtTime(0.0001, now + offset)
    gain.gain.exponentialRampToValueAtTime(0.4, now + offset + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.3)
    oscillator.connect(gain)
    gain.connect(audioContext.destination)
    oscillator.start(now + offset)
    oscillator.stop(now + offset + 0.35)
  }
}
