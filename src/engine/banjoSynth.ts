// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Banjo Synth Engine
// Physically-informed banjo synthesis: Karplus-Strong (PluckSynth) through a
// formant chain modeled on the banjo's drum-head membrane resonances.
//
// Key acoustic insights (Woodhouse et al., Acta Acustica 2021):
//   - Banjo has 3 formant peaks at ~700 Hz, ~3 kHz, ~5 kHz from the membrane
//   - Membrane is 10x lighter than guitar top → 20-30 dB higher bridge
//     admittance → louder attack, faster decay (100-200 ms vs 300-400 ms)
//   - Each note onset excites a brief pitch-independent body transient (the
//     drum-head "thump") lasting 50-400 ms
//   - String 5 is 3/4 length, terminates at 5th fret peg → less body coupling
//
// Pure engine — no React. Wrap with useBanjoSynth hook for React use.
// ─────────────────────────────────────────────────────────────────────────────

import * as Tone from 'tone'
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

// ── Per-String Karplus-Strong Voicing ─────────────────────────────────────────
//
// attackNoise  — length/amplitude of initial noise burst (pick transient)
// dampening    — lowpass cutoff in feedback loop (higher = brighter)
// resonance    — feedback gain (lower = faster decay, more banjo-like)
// release      — envelope release time
// bodyGain     — how much drum-head body impulse to mix in (0-1)

const STRING_PARAMS: Record<number, {
  attackNoise: number
  dampening: number
  resonance: number
  release: number
  bodyGain: number
}> = {
  // String 5 (G4 drone): 3/4 length, bright "ping" with longer ring
  5: { attackNoise: 16, dampening: 7000, resonance: 0.92, release: 0.6,  bodyGain: 0.10 },
  // String 4 (D3): lowest, warm with sustain
  4: { attackNoise: 6,  dampening: 2200, resonance: 0.95, release: 0.9,  bodyGain: 0.22 },
  // String 3 (G3): main thumb melody string, full sustain
  3: { attackNoise: 8,  dampening: 3200, resonance: 0.94, release: 0.8,  bodyGain: 0.20 },
  // String 2 (B3): index finger, bright with ring
  2: { attackNoise: 10, dampening: 4500, resonance: 0.93, release: 0.7,  bodyGain: 0.16 },
  // String 1 (D4): thinnest, bright with sustain
  1: { attackNoise: 14, dampening: 6000, resonance: 0.92, release: 0.6,  bodyGain: 0.14 },
}

// ── Body Impulse (Drum-Head Thump) ────────────────────────────────────────────
//
// Short burst of filtered pink noise simulating the membrane's transient
// response at each note onset. This is what gives banjo its percussive punch
// that guitars lack entirely.

class BodyImpulse {
  private noise: Tone.NoiseSynth
  private bodyFilter: Tone.Filter
  private gainNode: Tone.Gain

  constructor(output: Tone.InputNode) {
    this.noise = new Tone.NoiseSynth({
      noise: { type: 'white' },   // white noise → sharper transient than pink
      envelope: {
        attack: 0.001,     // instant — the membrane responds immediately
        decay: 0.045,      // ~45 ms body ring — tight, percussive thump
        sustain: 0,
        release: 0.025,
      },
    })

    // Bandpass at membrane fundamental region — slightly wider for more "boing"
    this.bodyFilter = new Tone.Filter({
      type: 'bandpass',
      frequency: 480,      // higher center → more metallic membrane ring
      Q: 2.2,
    })

    this.gainNode = new Tone.Gain(0.18)   // louder body impulse
    this.noise.chain(this.bodyFilter, this.gainNode, output)
  }

  trigger(time: number, gain: number = 0.12) {
    this.gainNode.gain.setValueAtTime(gain, time)
    this.noise.triggerAttackRelease('32n', time)
  }

  dispose() {
    this.noise.dispose()
    this.bodyFilter.dispose()
    this.gainNode.dispose()
  }
}

// ── BanjoSynth Class ─────────────────────────────────────────────────────────

export class BanjoSynth {
  private synths: Map<number, Tone.PluckSynth> = new Map()
  private bodyImpulse: BodyImpulse | null = null
  private fxNodes: Tone.ToneAudioNode[] = []
  private isDisposed = false
  private currentPlayback: Playback | null = null

  constructor() {
    // ── Formant chain ──
    // Resonant peaking filters at the three banjo formant frequencies.
    // These are the #1 perceptual cue for "banjo-ness" (Woodhouse 2021).

    // Primary formant: the core nasal twang (membrane + bridge interaction)
    const formant1 = new Tone.Filter({
      type: 'peaking' as BiquadFilterType,
      frequency: 800,       // slightly higher center for more "honk"
      Q: 3,                 // narrower peak = more focused twang
      gain: 10,             // boosted — this is the #1 banjo cue
    })

    // Bridge hill 1: metallic brightness — the "boing" ring
    const formant2 = new Tone.Filter({
      type: 'peaking' as BiquadFilterType,
      frequency: 2800,
      Q: 3.5,
      gain: 7,              // stronger metallic character
    })

    // Bridge hill 2: pick attack "tink" and shimmer
    const formant3 = new Tone.Filter({
      type: 'peaking' as BiquadFilterType,
      frequency: 5500,
      Q: 2.5,
      gain: 4,
    })

    // High-pass: membrane doesn't resonate below ~180 Hz — tighter than guitar
    const hipass = new Tone.Filter({
      type: 'highpass',
      frequency: 180,
      Q: 0.8,
    })

    // Low shelf: aggressively thin out the low end (drum head, not bass guitar)
    const lowShelf = new Tone.Filter({
      type: 'lowshelf' as BiquadFilterType,
      frequency: 220,
      gain: -10,
    })

    // Compressor: fast attack catches pick transient, quick release preserves ring
    const comp = new Tone.Compressor({
      threshold: -18,
      ratio: 4,
      attack: 0.002,
      release: 0.08,
    })

    // Chain: formants → hipass → low shelf → compressor → speakers
    formant1.chain(formant2, formant3, hipass, lowShelf, comp, Tone.getDestination())
    this.fxNodes = [formant1, formant2, formant3, hipass, lowShelf, comp]

    // Body impulse feeds into the same formant chain (before formant1)
    this.bodyImpulse = new BodyImpulse(formant1)

    // One PluckSynth per string with research-informed parameters
    for (const s of BANJO_STRINGS) {
      const params = STRING_PARAMS[s.string]
      const synth = new Tone.PluckSynth({
        attackNoise: params.attackNoise,
        dampening: params.dampening,
        resonance: params.resonance,
        release: params.release,
      }).connect(formant1)
      this.synths.set(s.string, synth)
    }
  }

  /** Play a single note on a given string/fret */
  playNote(stringNum: number, fret: number = 0): void {
    if (this.isDisposed) return
    const synth = this.synths.get(stringNum)
    if (!synth) return

    Tone.start()

    const freq = stringFretToFreq(stringNum, fret)
    const now = Tone.now()
    synth.triggerAttack(freq, now)

    // Fire drum-head body impulse with per-string gain
    const bodyGain = STRING_PARAMS[stringNum]?.bodyGain ?? 0.12
    this.bodyImpulse?.trigger(now, bodyGain)
  }

  /** Play an arbitrary sequence of TabNotes at a given BPM */
  playSequence(notes: TabNote[], bpm: number, onBeat?: BeatCallback): Playback {
    this.stopCurrent()

    let cancelled = false
    const timers: ReturnType<typeof setTimeout>[] = []
    const eighthNoteDuration = 60 / (bpm * 2) // seconds per eighth note

    const promise = new Promise<void>((resolve) => {
      Tone.start().then(() => {
        if (cancelled) { resolve(); return }

        const now = Tone.now() + 0.05 // small lookahead

        for (let i = 0; i < notes.length; i++) {
          const note = notes[i]
          const time = now + note.beat * eighthNoteDuration
          const freq = stringFretToFreq(note.string, note.fret)
          const synth = this.synths.get(note.string)

          if (synth && !this.isDisposed) {
            synth.triggerAttack(freq, time)

            // Body impulse per note (with per-string gain)
            const bodyGain = STRING_PARAMS[note.string]?.bodyGain ?? 0.12
            // Hammer-ons get less body thump (finger lands on fretboard, not plucked)
            const impulseGain = note.technique === 'hammer' ? bodyGain * 0.3 : bodyGain
            this.bodyImpulse?.trigger(time, impulseGain)
          }

          if (onBeat) {
            const delayMs = (note.beat * eighthNoteDuration) * 1000
            const tid = setTimeout(() => {
              if (!cancelled) onBeat(note.beat)
            }, delayMs)
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
      })
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

  /** Clean up all synths, body impulse, and FX */
  dispose(): void {
    this.stopCurrent()
    this.isDisposed = true
    for (const synth of this.synths.values()) {
      synth.dispose()
    }
    this.synths.clear()
    this.bodyImpulse?.dispose()
    this.bodyImpulse = null
    for (const node of this.fxNodes) {
      node.dispose()
    }
    this.fxNodes = []
  }
}
