// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Banjo Synth Engine
// Real Karplus-Strong via AudioWorklet + studio-grade resonance chain.
//
// Architecture:
//   AudioWorklet (karplus-strong) → per-string gain
//     → rawMix → head resonator bank (4 bandpass) ──┐
//                body resonance 220 Hz ──────────────┤
//                                              resonatorBus
//                                         ┌──── dry path ────┐
//                                         ├─ convolver (IR) ─┤→ master → tone shaping → destination
//                                         └─ early reflections┘
//   + pick noise burst (18 ms shaped noise) per pluck
//
// Pure engine — no React. Wrap with useBanjoSynth hook for React use.
// ─────────────────────────────────────────────────────────────────────────────

import { BANJO_STRINGS } from './noteCapture'
import { ROLL_MAP } from '../data/rollPatterns'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TabNote {
  string: number           // 1-5
  fret: number             // 0 = open
  beat: number             // eighth-note position in measure (0-7)
  finger?: 'T' | 'I' | 'M'
  technique?: 'hammer' | 'pull' | 'slide'
  slideToFret?: number
}

export interface Playback {
  stop: () => void
  promise: Promise<void>
}

export type BeatCallback = (beat: number) => void

// ── Helpers ───────────────────────────────────────────────────────────────────

const STRING_DATA = new Map(BANJO_STRINGS.map((s) => [s.string, s]))

/** Convert string + fret to frequency in Hz */
function stringFretToFreq(stringNum: number, fret: number): number {
  const s = STRING_DATA.get(stringNum)
  if (!s) return 440
  return s.freq * Math.pow(2, fret / 12)
}

// ── Per-String Parameters ───────────────────────────────────────────────────

interface StringParams {
  decay: number           // Karplus-Strong feedback decay (0-1)
  noiseGain: number       // pick noise level
  pluckPos: number        // pluck position (0=bridge, 0.5=middle) — controls comb filter
  brightness: number      // pick noise bandpass center frequency (Hz)
  bridgeFb: number        // bridge/head feedback coupling
  brightnessTilt: number  // excitation noise mix (0=warm/pink, 1=bright/white)
  stringGain: number      // per-string output gain
}

const STRING_PARAMS: Record<number, StringParams> = {
  5: { decay: 0.982, noiseGain: 0.15, pluckPos: 0.15, brightness: 4500, bridgeFb: 0.10, brightnessTilt: 0.45, stringGain: 0.78 },
  4: { decay: 0.990, noiseGain: 0.10, pluckPos: 0.22, brightness: 3800, bridgeFb: 0.14, brightnessTilt: 0.30, stringGain: 0.88 },
  3: { decay: 0.987, noiseGain: 0.12, pluckPos: 0.18, brightness: 4200, bridgeFb: 0.12, brightnessTilt: 0.36, stringGain: 0.88 },
  2: { decay: 0.985, noiseGain: 0.13, pluckPos: 0.18, brightness: 4200, bridgeFb: 0.12, brightnessTilt: 0.38, stringGain: 0.88 },
  1: { decay: 0.983, noiseGain: 0.15, pluckPos: 0.15, brightness: 4500, bridgeFb: 0.10, brightnessTilt: 0.42, stringGain: 0.88 },
}

// ── Synthetic Impulse Response ──────────────────────────────────────────────

/** Generate a synthetic stereo IR simulating banjo body + mic coloration */
function makeIRBuffer(ctx: AudioContext, seconds: number = 0.18): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds)
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate)

  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch)
    for (let i = 0; i < length; i++) {
      const t = i / ctx.sampleRate

      const decay = Math.exp(-t * 18)
      const early = i < 180 ? 1 - (i / 180) : 0
      const noise = Math.random() * 2 - 1

      // Resonant body ridges at key banjo frequencies
      const r1 = Math.sin(2 * Math.PI * 210 * t) * Math.exp(-t * 14)
      const r2 = Math.sin(2 * Math.PI * 720 * t) * Math.exp(-t * 20)
      const r3 = Math.sin(2 * Math.PI * 2850 * t) * Math.exp(-t * 28)

      const stereoOffset = ch === 0 ? 1.0 : 0.96

      data[i] = stereoOffset * (
        0.38 * noise * decay +
        0.22 * early +
        0.18 * r1 +
        0.10 * r2 +
        0.05 * r3
      )
    }
  }
  return buffer
}

// ── BanjoSynth Class ─────────────────────────────────────────────────────────

export class BanjoSynth {
  private ctx: AudioContext | null = null
  private stringNodes: Map<number, AudioWorkletNode> = new Map()
  private rawMixNode: GainNode | null = null
  private ready = false
  private initPromise: Promise<void> | null = null
  private isDisposed = false
  private currentPlayback: Playback | null = null

  constructor() {
    this.initPromise = this.init()
  }

  private async init(): Promise<void> {
    const ctx = new AudioContext()
    this.ctx = ctx

    await ctx.audioWorklet.addModule(
      new URL('/karplusStrongProcessor.js', import.meta.url).href
    )

    // ── Raw mix: all strings feed into here ──
    const rawMix = ctx.createGain()
    rawMix.gain.value = 0.95
    this.rawMixNode = rawMix

    // ── Resonator bus: head + body filters feed into here ──
    const resonatorBus = ctx.createGain()

    // ── Head resonator bank (4 bandpass filters) ──
    const headConfig = [
      { freq: 2300, Q: 1.35, gain: 0.32 },
      { freq: 3050, Q: 1.55, gain: 0.38 },
      { freq: 3950, Q: 1.65, gain: 0.30 },
      { freq: 4850, Q: 1.45, gain: 0.18 },
    ]
    for (const h of headConfig) {
      const bp = ctx.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = h.freq
      bp.Q.value = h.Q

      const g = ctx.createGain()
      g.gain.value = h.gain

      rawMix.connect(bp)
      bp.connect(g)
      g.connect(resonatorBus)
    }

    // ── Body resonance ──
    const body = ctx.createBiquadFilter()
    body.type = 'bandpass'
    body.frequency.value = 220
    body.Q.value = 0.95

    const bodyGain = ctx.createGain()
    bodyGain.gain.value = 0.42

    rawMix.connect(body)
    body.connect(bodyGain)
    bodyGain.connect(resonatorBus)

    // ── Dry path ──
    const dryOut = ctx.createGain()
    dryOut.gain.value = 0.92
    resonatorBus.connect(dryOut)

    // ── Wet path: synthetic IR convolver for body/mic coloration ──
    const convolver = ctx.createConvolver()
    convolver.normalize = true
    convolver.buffer = makeIRBuffer(ctx, 0.18)

    const wetOut = ctx.createGain()
    wetOut.gain.value = 0.17

    resonatorBus.connect(convolver)
    convolver.connect(wetOut)

    // ── Master output ──
    const master = ctx.createGain()
    master.gain.value = 0.9

    dryOut.connect(master)
    wetOut.connect(master)

    // ── Early reflections (4-tap banjo head ring) ──
    const reflectionTaps = [
      { time: 0.0028, gain: 0.12 },
      { time: 0.0059, gain: 0.10 },
      { time: 0.0093, gain: 0.08 },
      { time: 0.0137, gain: 0.06 },
    ]
    for (const tap of reflectionTaps) {
      const d = ctx.createDelay()
      d.delayTime.value = tap.time
      const g = ctx.createGain()
      g.gain.value = tap.gain
      resonatorBus.connect(d)
      d.connect(g)
      g.connect(master)
    }

    // ── Output tone shaping ──
    const toneLP = ctx.createBiquadFilter()
    toneLP.type = 'lowpass'
    toneLP.frequency.value = 7200

    const toneHP = ctx.createBiquadFilter()
    toneHP.type = 'highpass'
    toneHP.frequency.value = 70

    master.connect(toneLP)
    toneLP.connect(toneHP)
    toneHP.connect(ctx.destination)

    // ── One AudioWorkletNode per string ──
    for (const s of BANJO_STRINGS) {
      const node = new AudioWorkletNode(ctx, 'karplus-strong')
      const params = STRING_PARAMS[s.string]

      const g = ctx.createGain()
      g.gain.value = params?.stringGain ?? 0.88

      node.connect(g)
      g.connect(rawMix)
      this.stringNodes.set(s.string, node)
    }

    this.ready = true
  }

  /** Fire a shaped pick noise burst (18 ms) */
  private pickNoise(time: number, gain: number, brightness: number = 4000): void {
    if (!this.ctx || !this.rawMixNode) return

    const ctx = this.ctx
    const bufferSize = Math.floor(ctx.sampleRate * 0.018) // 18 ms
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)

    // Shaped noise: mix white + pinkish with exponential envelope
    let s = 0
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1
      s = 0.72 * s + 0.28 * white
      const env = Math.exp(-i / (bufferSize / 4.2))
      data[i] = (0.55 * white + 0.45 * s) * env
    }

    const src = ctx.createBufferSource()
    src.buffer = buffer

    const bandpass = ctx.createBiquadFilter()
    bandpass.type = 'bandpass'
    bandpass.frequency.value = brightness
    bandpass.Q.value = 1.3

    const highpass = ctx.createBiquadFilter()
    highpass.type = 'highpass'
    highpass.frequency.value = 1600

    const gainNode = ctx.createGain()
    gainNode.gain.value = gain

    src.connect(bandpass)
    bandpass.connect(highpass)
    highpass.connect(gainNode)
    gainNode.connect(this.rawMixNode)

    src.start(time)
  }

  /** Play a single note on a given string/fret */
  playNote(stringNum: number, fret: number = 0): void {
    if (this.isDisposed || !this.ready || !this.ctx) return
    const node = this.stringNodes.get(stringNum)
    if (!node) return

    if (this.ctx.state === 'suspended') this.ctx.resume()

    const freq = stringFretToFreq(stringNum, fret)
    const params = STRING_PARAMS[stringNum]

    node.port.postMessage({
      type: 'pluck',
      frequency: freq,
      decay: params?.decay ?? 0.987,
      pluckPos: params?.pluckPos ?? 0.18,
      bridgeFb: params?.bridgeFb ?? 0.12,
      brightnessTilt: params?.brightnessTilt ?? 0.38,
    })

    this.pickNoise(this.ctx.currentTime, params?.noiseGain ?? 0.12, params?.brightness ?? 4000)
  }

  /** Play an arbitrary sequence of TabNotes at a given BPM */
  playSequence(notes: TabNote[], bpm: number, onBeat?: BeatCallback): Playback {
    this.stopCurrent()

    let cancelled = false
    const timers: ReturnType<typeof setTimeout>[] = []
    const eighthNoteDuration = 60 / (bpm * 2) // seconds per eighth note

    const promise = new Promise<void>((resolve) => {
      const doPlay = () => {
        if (cancelled || this.isDisposed || !this.ready || !this.ctx) {
          resolve()
          return
        }

        if (this.ctx.state === 'suspended') this.ctx.resume()

        const now = this.ctx.currentTime + 0.05 // small lookahead

        for (let i = 0; i < notes.length; i++) {
          const note = notes[i]
          const time = now + note.beat * eighthNoteDuration
          const freq = stringFretToFreq(note.string, note.fret)
          const node = this.stringNodes.get(note.string)
          const params = STRING_PARAMS[note.string]

          if (node && !this.isDisposed) {
            // Schedule the pluck via setTimeout to hit the worklet at the right time
            const delayMs = (time - this.ctx!.currentTime) * 1000
            const pluckTimer = setTimeout(() => {
              if (!cancelled && !this.isDisposed) {
                node.port.postMessage({
                  type: 'pluck',
                  frequency: freq,
                  decay: params?.decay ?? 0.987,
                  pluckPos: params?.pluckPos ?? 0.18,
                  bridgeFb: params?.bridgeFb ?? 0.12,
                  brightnessTilt: params?.brightnessTilt ?? 0.38,
                })
              }
            }, Math.max(0, delayMs))
            timers.push(pluckTimer)

            // Pick noise scheduled at audio time
            const noiseGain = note.technique === 'hammer'
              ? (params?.noiseGain ?? 0.12) * 0.3
              : (params?.noiseGain ?? 0.12)
            this.pickNoise(time, noiseGain, params?.brightness ?? 4000)
          }

          if (onBeat) {
            const beatDelayMs = (note.beat * eighthNoteDuration) * 1000
            const tid = setTimeout(() => {
              if (!cancelled) onBeat(note.beat)
            }, beatDelayMs)
            timers.push(tid)
          }
        }

        // Resolve after the last note + ring time
        const totalDuration = (notes.length > 0
          ? (notes[notes.length - 1].beat + 1) * eighthNoteDuration
          : 0) + 0.5

        const endTimer = setTimeout(() => {
          if (!cancelled) resolve()
        }, totalDuration * 1000)
        timers.push(endTimer)
      }

      // Wait for init if needed
      if (this.ready) {
        doPlay()
      } else {
        this.initPromise?.then(doPlay)
      }
    })

    const playback: Playback = {
      stop: () => {
        cancelled = true
        for (const t of timers) clearTimeout(t)
      },
      promise,
    }
    this.currentPlayback = playback
    return playback
  }

  /** Play a roll pattern by ID at a given BPM for N cycles */
  playRoll(patternId: string, bpm: number, cycles: number = 2, onBeat?: BeatCallback): Playback {
    const pattern = ROLL_MAP.get(patternId)
    if (!pattern) {
      return { stop: () => {}, promise: Promise.resolve() }
    }

    const notes: TabNote[] = []
    for (let cycle = 0; cycle < cycles; cycle++) {
      for (let i = 0; i < pattern.strings.length; i++) {
        const stringNum = pattern.strings[i]
        if (stringNum === null) continue
        notes.push({
          string: stringNum,
          fret: 0,
          beat: cycle * pattern.strings.length + i,
          finger: pattern.fingers?.[i],
        })
      }
    }

    return this.playSequence(notes, bpm, onBeat)
  }

  /** Play a song section at a given BPM */
  playSection(measures: { notes: TabNote[] }[], bpm: number, onBeat?: BeatCallback): Playback {
    const allNotes: TabNote[] = []
    for (let m = 0; m < measures.length; m++) {
      for (const note of measures[m].notes) {
        allNotes.push({
          ...note,
          beat: m * 8 + note.beat,
        })
      }
    }
    return this.playSequence(allNotes, bpm, onBeat)
  }

  /** Stop current playback */
  stopCurrent(): void {
    if (this.currentPlayback) {
      this.currentPlayback.stop()
      this.currentPlayback = null
    }
  }

  /** Clean up all nodes */
  dispose(): void {
    this.stopCurrent()
    this.isDisposed = true
    for (const node of this.stringNodes.values()) {
      node.disconnect()
    }
    this.stringNodes.clear()
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close()
    }
    this.ctx = null
    this.rawMixNode = null
  }
}
