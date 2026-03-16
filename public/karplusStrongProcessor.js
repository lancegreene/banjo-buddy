// ─────────────────────────────────────────────────────────────────────────────
// Karplus-Strong AudioWorklet Processor
// Physical-model string synthesis running in the audio thread.
// Features: pluck-position comb filter, frequency-dependent damping,
// stiffness/inharmonicity, bridge feedback, shaped noise excitation.
// ─────────────────────────────────────────────────────────────────────────────

class KarplusStrongProcessor extends AudioWorkletProcessor {
  constructor() {
    super()

    this.buffer = new Float32Array(1)
    this.index = 0
    this.decay = 0.987
    this.active = false
    this.last = 0              // one-pole lowpass state for frequency-dependent damping
    this.prev = 0              // previous output for stiffness/inharmonicity
    this.pluckPos = 0.18       // pluck position (0=bridge, 0.5=middle)
    this.bridgeFb = 0.12       // bridge/head feedback coupling
    this.brightnessTilt = 0.38 // excitation mix: 0=warm/pink, 1=bright/white

    this.port.onmessage = (e) => {
      if (e.data.type === 'pluck') {
        const freq = Math.max(40, e.data.frequency || 392)
        const dec = e.data.decay ?? 0.987
        const delay = Math.max(8, Math.floor(sampleRate / freq))
        const pluckPos = e.data.pluckPos ?? 0.18

        this.buffer = new Float32Array(delay)
        this.decay = dec
        this.last = 0
        this.prev = 0
        this.pluckPos = pluckPos
        this.bridgeFb = e.data.bridgeFb ?? 0.12
        this.brightnessTilt = e.data.brightnessTilt ?? 0.38

        // Shaped noise excitation with pluck-position comb filter.
        // Mix pinkish + white noise controlled by brightnessTilt,
        // then subtract a delayed copy for comb notch at 1/pluckPos harmonics.
        const combDelay = Math.max(1, Math.floor(delay * pluckPos))
        let lastExcite = 0

        for (let i = 0; i < delay; i++) {
          const white = Math.random() * 2 - 1
          const pinkish = 0.78 * lastExcite + 0.22 * white
          lastExcite = pinkish

          const delayed = i >= combDelay ? this.buffer[i - combDelay] : 0
          const shaped = pinkish * (1 - this.brightnessTilt) + white * this.brightnessTilt
          this.buffer[i] = shaped - delayed * 0.62
        }

        this.index = 0
        this.active = true
      }
    }
  }

  process(inputs, outputs) {
    const output = outputs[0][0]

    if (!this.active || this.buffer.length <= 1) {
      for (let i = 0; i < output.length; i++) {
        output[i] = 0
      }
      return true
    }

    for (let i = 0; i < output.length; i++) {
      const curr = this.buffer[this.index]
      const next = this.buffer[(this.index + 1) % this.buffer.length]
      const avg = (curr + next) * 0.5

      // Frequency-dependent damping: one-pole lowpass
      this.last = this.last + 0.33 * (avg - this.last)

      // Stiffness / inharmonicity: pushes partials slightly sharp
      let stiff = this.last + 0.00085 * (this.last - this.prev)
      this.prev = stiff

      // Bridge/head feedback: adds subtle energy coupling
      stiff += stiff * this.bridgeFb * 0.055

      this.buffer[this.index] = stiff * this.decay
      output[i] = stiff

      this.index = (this.index + 1) % this.buffer.length
    }

    return true
  }
}

registerProcessor('karplus-strong', KarplusStrongProcessor)
