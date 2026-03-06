// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Banjo Synth Engine
// Real Karplus-Strong via AudioWorklet + banjo resonance filters.
//
// Architecture:
//   AudioWorklet (karplus-strong) → per-string
//     ├→ head1 bandpass 2500 Hz ─┐
//     ├→ head2 bandpass 3200 Hz ─┼→ mix → body resonance 220 Hz → destination
//     └→ head3 bandpass 4100 Hz ─┘
//   + pick noise burst (20 ms filtered white noise) per pluck
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
  decay: number        // Karplus-Strong feedback decay (0-1)
  noiseGain: number    // pick noise level
}

const STRING_PARAMS: Record<number, StringParams> = {
  5: { decay: 0.982, noiseGain: 0.15 },  // G4 drone: bright, slightly shorter
  4: { decay: 0.990, noiseGain: 0.10 },  // D3: lowest, longer ring
  3: { decay: 0.987, noiseGain: 0.12 },  // G3: thumb melody
  2: { decay: 0.985, noiseGain: 0.13 },  // B3: index
  1: { decay: 0.983, noiseGain: 0.15 },  // D4: thinnest, bright
}

// ── BanjoSynth Class ─────────────────────────────────────────────────────────

export class BanjoSynth {
  private ctx: AudioContext | null = null
  private stringNodes: Map<number, AudioWorkletNode> = new Map()
  private mixNode: GainNode | null = null
  private ready = false
  private initPromise: Promise<void> | null = null
  private isDisposed = false
  private currentPlayback: Playback | null = null

  constructor() {
    // Kick off async init immediately
    this.initPromise = this.init()
  }

  private async init(): Promise<void> {
    const ctx = new AudioContext()
    this.ctx = ctx

    // Load the Karplus-Strong AudioWorklet processor
    await ctx.audioWorklet.addModule(
      new URL('/karplusStrongProcessor.js', import.meta.url).href
    )

    // ── Banjo head resonators (3 bandpass filters) ──
    const head1 = ctx.createBiquadFilter()
    head1.type = 'bandpass'
    head1.frequency.value = 2500
    head1.Q.value = 1.5

    const head2 = ctx.createBiquadFilter()
    head2.type = 'bandpass'
    head2.frequency.value = 3200
    head2.Q.value = 1.5

    const head3 = ctx.createBiquadFilter()
    head3.type = 'bandpass'
    head3.frequency.value = 4100
    head3.Q.value = 1.5

    // ── Body resonance ──
    const body = ctx.createBiquadFilter()
    body.type = 'bandpass'
    body.frequency.value = 220
    body.Q.value = 1

    // ── Mix node ──
    const mix = ctx.createGain()
    mix.gain.value = 1.0
    this.mixNode = mix

    // Routing: head filters → mix → body → destination
    head1.connect(mix)
    head2.connect(mix)
    head3.connect(mix)
    mix.connect(body)
    body.connect(ctx.destination)

    // One AudioWorkletNode per string, each connected to all 3 head filters
    for (const s of BANJO_STRINGS) {
      const node = new AudioWorkletNode(ctx, 'karplus-strong')
      node.connect(head1)
      node.connect(head2)
      node.connect(head3)
      this.stringNodes.set(s.string, node)
    }

    this.ready = true
  }

  /** Fire a pick noise burst (20 ms filtered white noise) */
  private pickNoise(time: number, gain: number): void {
    if (!this.ctx || !this.mixNode) return

    const ctx = this.ctx
    const bufferSize = Math.floor(ctx.sampleRate * 0.02) // 20 ms
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }

    const src = ctx.createBufferSource()
    src.buffer = buffer

    const bandpass = ctx.createBiquadFilter()
    bandpass.type = 'bandpass'
    bandpass.frequency.value = 4000

    const gainNode = ctx.createGain()
    gainNode.gain.value = gain

    src.connect(bandpass)
    bandpass.connect(gainNode)
    gainNode.connect(this.mixNode)

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
      decay: params?.decay ?? 0.985,
    })

    this.pickNoise(this.ctx.currentTime, params?.noiseGain ?? 0.12)
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
                  decay: params?.decay ?? 0.985,
                })
              }
            }, Math.max(0, delayMs))
            timers.push(pluckTimer)

            // Pick noise scheduled at audio time
            const noiseGain = note.technique === 'hammer'
              ? (params?.noiseGain ?? 0.12) * 0.3
              : (params?.noiseGain ?? 0.12)
            this.pickNoise(time, noiseGain)
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
    this.mixNode = null
  }
}
