// ─────────────────────────────────────────────────────────────────────────────
// Karplus-Strong AudioWorklet Processor
// Real physical-model string synthesis running in the audio thread.
// Delay line filled with noise on pluck, averaged + decayed each sample.
// ─────────────────────────────────────────────────────────────────────────────

class KarplusStrongProcessor extends AudioWorkletProcessor {
  constructor() {
    super()

    this.buffer = new Float32Array(1)
    this.index = 0
    this.decay = 0.985
    this.active = false

    this.port.onmessage = (e) => {
      if (e.data.type === 'pluck') {
        const freq = e.data.frequency
        const dec = e.data.decay ?? 0.985
        const delay = Math.floor(sampleRate / freq)

        this.buffer = new Float32Array(delay)
        this.decay = dec

        // Fill delay line with noise — this IS the initial excitation
        for (let i = 0; i < delay; i++) {
          this.buffer[i] = Math.random() * 2 - 1
        }

        this.index = 0
        this.active = true
      }
    }
  }

  process(inputs, outputs) {
    const output = outputs[0][0]

    if (!this.active || this.buffer.length <= 1) {
      // Silence
      for (let i = 0; i < output.length; i++) {
        output[i] = 0
      }
      return true
    }

    for (let i = 0; i < output.length; i++) {
      // Karplus-Strong: average adjacent samples, apply decay
      const curr = this.buffer[this.index]
      const next = this.buffer[(this.index + 1) % this.buffer.length]
      const averaged = (curr + next) * 0.5

      this.buffer[this.index] = averaged * this.decay
      output[i] = averaged

      this.index = (this.index + 1) % this.buffer.length
    }

    return true
  }
}

registerProcessor('karplus-strong', KarplusStrongProcessor)
