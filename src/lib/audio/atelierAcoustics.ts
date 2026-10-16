// Native Web Audio Synthesizer for ZenFlow Atelier acoustics
// Zero external sound assets - sub-millisecond physical feedback

class AtelierAcoustics {
  private ctx: AudioContext | null = null
  private enabled: boolean = true

  constructor() {
    // AudioContext will be initialized on first user gesture
  }

  private initContext() {
    if (typeof window === "undefined") return null
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      if (AudioContextClass) {
        this.ctx = new AudioContextClass()
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {})
    }
    return this.ctx
  }

  public isEnabled(): boolean {
    return this.enabled
  }

  public toggleAcoustics(): boolean {
    this.enabled = !this.enabled
    return this.enabled
  }

  public setEnabled(val: boolean) {
    this.enabled = val
  }

  // Soft, warm paper settling rustle
  public playPaperDrop() {
    if (!this.enabled) return
    const ctx = this.initContext()
    if (!ctx) return

    try {
      const bufferSize = ctx.sampleRate * 0.05 // 50ms buffer
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i++) {
        // Soft pink noise
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3))
      }

      const noise = ctx.createBufferSource()
      noise.buffer = buffer

      // Warm low-pass filter
      const filter = ctx.createBiquadFilter()
      filter.type = "bandpass"
      filter.frequency.setValueAtTime(650, ctx.currentTime)
      filter.Q.setValueAtTime(1.2, ctx.currentTime)

      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0.045, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05)

      noise.connect(filter)
      filter.connect(gain)
      gain.connect(ctx.destination)

      noise.start()
    } catch {
      // Graceful fallback if audio is blocked
    }
  }

  // Wooden anchor snap / magnetic detent click
  public playAnchorSnap() {
    if (!this.enabled) return
    const ctx = this.initContext()
    if (!ctx) return

    try {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = "sine"
      osc.frequency.setValueAtTime(520, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.02)

      gain.gain.setValueAtTime(0.07, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.02)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start()
      osc.stop(ctx.currentTime + 0.025)
    } catch {
      // Gracefully ignore
    }
  }

  // Gentle fling off desk (brushing paper scrap away)
  public playFlingDisintegrate() {
    if (!this.enabled) return
    const ctx = this.initContext()
    if (!ctx) return

    try {
      const bufferSize = ctx.sampleRate * 0.08
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize)
      }

      const noise = ctx.createBufferSource()
      noise.buffer = buffer

      const filter = ctx.createBiquadFilter()
      filter.type = "highpass"
      filter.frequency.setValueAtTime(1200, ctx.currentTime)
      filter.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.08)

      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0.035, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08)

      noise.connect(filter)
      filter.connect(gain)
      gain.connect(ctx.destination)

      noise.start()
    } catch {
      // Gracefully ignore
    }
  }
}

export const acoustics = new AtelierAcoustics()
