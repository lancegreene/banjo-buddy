// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Lick Reference Library
// Licks are reusable, role-tagged building blocks played over a chord.
// Stored as TabNote[] (same shape as songs) — rendered by FretboardDiagram.
// ─────────────────────────────────────────────────────────────────────────────

import type { TabNote } from '../engine/banjoSynth'

export type LickRole = 'basic' | 'fill' | 'ending' | 'transition' | 'combination'

export interface LickReference {
  id: string
  name: string
  description: string
  key: string              // 'G' | 'C' | 'D' | ...
  role: LickRole
  leadsTo?: string         // chord name; only for role === 'transition'
  chord?: string           // primary chord context for basic/fill/ending
  measureCount: 1 | 2      // 2 only for 'combination'
  referenceBpm: number
  source?: string          // e.g. 'Splitting the Licks, p.11'
  tab: TabNote[]
}

export const LICK_LIBRARY: LickReference[] = [
  // ── G Chord Licks ────────────────────────────────────────────────────────────
  {
    id: 'g_lick_basic',
    name: 'G-Lick — Basic (the "Godfather")',
    description: 'The classic Scruggs-style phrase-ending lick in G. Pull-off from 3rd to open on string 2, resolve to open G.',
    key: 'G', role: 'ending', chord: 'G',
    measureCount: 1, referenceBpm: 80,
    source: 'Splitting the Licks, p.10',
    tab: [
      { string: 2, fret: 3, beat: 0, finger: 'I', technique: 'pull', slideToFret: 0 },
      { string: 2, fret: 0, beat: 1, finger: 'I' },
      { string: 1, fret: 0, beat: 2, finger: 'M' },
      { string: 5, fret: 0, beat: 3, finger: 'T' },
      { string: 2, fret: 0, beat: 4, finger: 'I' },
      { string: 1, fret: 0, beat: 5, finger: 'M' },
      { string: 5, fret: 0, beat: 6, finger: 'T' },
      { string: 3, fret: 0, beat: 7, finger: 'T' },
    ],
  },
  {
    id: 'g_lick_tag',
    name: 'G-Lick — Tag Ending',
    description: 'Classic Scruggs tag lick — a variation of the G-lick used to end songs.',
    key: 'G', role: 'ending', chord: 'G',
    measureCount: 1, referenceBpm: 80,
    source: 'Earl Scruggs and the 5-String Banjo, vol 1',
    tab: [
      { string: 1, fret: 0, beat: 0, finger: 'M' },
      { string: 2, fret: 0, beat: 1, finger: 'I' },
      { string: 3, fret: 0, beat: 2, finger: 'T' },
      { string: 5, fret: 0, beat: 3, finger: 'T' },
      { string: 1, fret: 0, beat: 4, finger: 'M' },
      { string: 2, fret: 0, beat: 5, finger: 'I' },
      { string: 3, fret: 0, beat: 6, finger: 'T' },
      { string: 3, fret: 0, beat: 7, finger: 'T' },
    ],
  },
  {
    id: 'g_lick_forward_roll',
    name: 'G-Lick — Forward Roll Variation',
    description: 'The G-lick melodic contour played over a forward roll pattern.',
    key: 'G', role: 'basic', chord: 'G',
    measureCount: 1, referenceBpm: 80,
    source: 'Splitting the Licks, p.10',
    tab: [
      { string: 3, fret: 0, beat: 0, finger: 'T' },
      { string: 2, fret: 0, beat: 1, finger: 'I' },
      { string: 1, fret: 0, beat: 2, finger: 'M' },
      { string: 5, fret: 0, beat: 3, finger: 'T' },
      { string: 3, fret: 0, beat: 4, finger: 'T' },
      { string: 1, fret: 0, beat: 5, finger: 'M' },
      { string: 5, fret: 0, beat: 6, finger: 'T' },
      { string: 1, fret: 0, beat: 7, finger: 'M' },
    ],
  },

  // ── G Chord Licks — Wave 1 batch 1 from Splitting the Licks, p.10 ──────────
  {
    id: 'g_lick_slide_roll',
    name: 'G-Lick — Forward Roll with Slide',
    description: 'Forward roll pattern with a slide from fret 2 to 4 on string 3, adding melodic motion over open G.',
    key: 'G', role: 'basic', chord: 'G',
    measureCount: 1, referenceBpm: 80,
    source: 'Splitting the Licks, p.10',
    tab: [
      { string: 2, fret: 0, beat: 0, finger: 'I' },
      { string: 1, fret: 0, beat: 1, finger: 'M' },
      { string: 5, fret: 0, beat: 2, finger: 'T' },
      { string: 3, fret: 2, beat: 3, finger: 'T', technique: 'slide', slideToFret: 4 },
      { string: 2, fret: 0, beat: 4, finger: 'I' },
      { string: 1, fret: 0, beat: 5, finger: 'M' },
      { string: 5, fret: 0, beat: 6, finger: 'T' },
      { string: 3, fret: 0, beat: 7, finger: 'T' },
    ],
  },
  {
    id: 'g_lick_square_variation',
    name: 'G-Lick — Square Roll Variation',
    description: 'Square roll pattern (T-I-M-T) over open G strings with a thumb-lead contour.',
    key: 'G', role: 'basic', chord: 'G',
    measureCount: 1, referenceBpm: 80,
    source: 'Splitting the Licks, p.10',
    tab: [
      { string: 3, fret: 0, beat: 0, finger: 'T' },
      { string: 2, fret: 0, beat: 1, finger: 'I' },
      { string: 1, fret: 0, beat: 2, finger: 'M' },
      { string: 5, fret: 0, beat: 3, finger: 'T' },
      { string: 3, fret: 0, beat: 4, finger: 'T' },
      { string: 1, fret: 0, beat: 5, finger: 'M' },
      { string: 2, fret: 0, beat: 6, finger: 'I' },
      { string: 5, fret: 0, beat: 7, finger: 'T' },
    ],
  },
  {
    id: 'g_lick_hammer_roll',
    name: 'G-Lick — Hammer-On with Roll',
    description: 'G lick featuring a hammer-on from open to fret 2 on string 3 (G to A), woven into a roll pattern.',
    key: 'G', role: 'basic', chord: 'G',
    measureCount: 1, referenceBpm: 80,
    source: 'Splitting the Licks, p.10',
    tab: [
      { string: 3, fret: 0, beat: 0, finger: 'T', technique: 'hammer', slideToFret: 2 },
      { string: 2, fret: 0, beat: 1, finger: 'I' },
      { string: 1, fret: 0, beat: 2, finger: 'M' },
      { string: 5, fret: 0, beat: 3, finger: 'T' },
      { string: 2, fret: 0, beat: 4, finger: 'I' },
      { string: 1, fret: 0, beat: 5, finger: 'M' },
      { string: 5, fret: 0, beat: 6, finger: 'T' },
      { string: 3, fret: 0, beat: 7, finger: 'T' },
    ],
  },
  {
    id: 'g_lick_pull_off_index',
    name: 'G-Lick — Index-Lead with Pull-Off',
    description: 'Thumb-lead on open G then pull-off from D to B on string 2 (fret 3 to open), creating the classic G-lick melodic contour.',
    key: 'G', role: 'basic', chord: 'G',
    measureCount: 1, referenceBpm: 80,
    source: 'Splitting the Licks, p.10',
    tab: [
      { string: 3, fret: 0, beat: 0, finger: 'T' },
      { string: 2, fret: 3, beat: 1, finger: 'I', technique: 'pull', slideToFret: 0 },
      { string: 1, fret: 0, beat: 2, finger: 'M' },
      { string: 5, fret: 0, beat: 3, finger: 'T' },
      { string: 2, fret: 0, beat: 4, finger: 'I' },
      { string: 1, fret: 0, beat: 5, finger: 'M' },
      { string: 5, fret: 0, beat: 6, finger: 'T' },
      { string: 3, fret: 0, beat: 7, finger: 'T' },
    ],
  },
  {
    id: 'g_lick_alternating_thumb',
    name: 'G-Lick — Alternating Thumb with Melody',
    description: 'Alternating thumb pattern between strings 3 and 4, with melody notes on strings 1 and 2 creating a Scruggs-style fill.',
    key: 'G', role: 'basic', chord: 'G',
    measureCount: 1, referenceBpm: 80,
    source: 'Splitting the Licks, p.10',
    tab: [
      { string: 3, fret: 0, beat: 0, finger: 'T' },
      { string: 2, fret: 0, beat: 1, finger: 'I' },
      { string: 4, fret: 0, beat: 2, finger: 'T' },
      { string: 1, fret: 0, beat: 3, finger: 'M' },
      { string: 3, fret: 0, beat: 4, finger: 'T' },
      { string: 2, fret: 0, beat: 5, finger: 'I' },
      { string: 5, fret: 0, beat: 6, finger: 'T' },
      { string: 1, fret: 0, beat: 7, finger: 'M' },
    ],
  },

  // ── C Chord Licks ────────────────────────────────────────────────────────────
  {
    id: 'c_lick_basic',
    name: 'C-Lick — Basic',
    description: 'Basic phrase over C chord. Uses the C chord shape (index on 2nd string 1st fret, middle on 4th string 2nd fret).',
    key: 'C', role: 'basic', chord: 'C',
    measureCount: 1, referenceBpm: 80,
    source: 'Splitting the Licks, p.10',
    tab: [
      { string: 2, fret: 1, beat: 0, finger: 'I' },
      { string: 4, fret: 2, beat: 1, finger: 'T' },
      { string: 3, fret: 0, beat: 2, finger: 'T' },
      { string: 2, fret: 1, beat: 3, finger: 'I' },
      { string: 1, fret: 0, beat: 4, finger: 'M' },
      { string: 4, fret: 2, beat: 5, finger: 'T' },
      { string: 2, fret: 1, beat: 6, finger: 'I' },
      { string: 1, fret: 0, beat: 7, finger: 'M' },
    ],
  },
  {
    id: 'c_lick_hammer',
    name: 'C-Lick — Hammer-On Variation',
    description: 'C chord lick with hammer-on from open B to C on string 2.',
    key: 'C', role: 'basic', chord: 'C',
    measureCount: 1, referenceBpm: 80,
    source: 'Splitting the Licks, p.10',
    tab: [
      { string: 4, fret: 2, beat: 0, finger: 'T' },
      { string: 2, fret: 0, beat: 1, finger: 'I', technique: 'hammer', slideToFret: 1 },
      { string: 1, fret: 0, beat: 2, finger: 'M' },
      { string: 3, fret: 0, beat: 3, finger: 'T' },
      { string: 2, fret: 1, beat: 4, finger: 'I' },
      { string: 4, fret: 2, beat: 5, finger: 'T' },
      { string: 1, fret: 0, beat: 6, finger: 'M' },
      { string: 2, fret: 1, beat: 7, finger: 'I' },
    ],
  },
  {
    id: 'c_lick_fill',
    name: 'C-Lick — Fill-In',
    description: 'Transitional C chord lick used between vocal lines or during chord changes.',
    key: 'C', role: 'fill', chord: 'C',
    measureCount: 1, referenceBpm: 80,
    source: 'Splitting the Licks, p.10',
    tab: [
      { string: 3, fret: 0, beat: 0, finger: 'T' },
      { string: 2, fret: 1, beat: 1, finger: 'I' },
      { string: 1, fret: 0, beat: 2, finger: 'M' },
      { string: 5, fret: 0, beat: 3, finger: 'T' },
      { string: 4, fret: 2, beat: 4, finger: 'T' },
      { string: 3, fret: 0, beat: 5, finger: 'T' },
      { string: 2, fret: 1, beat: 6, finger: 'I' },
      { string: 3, fret: 0, beat: 7, finger: 'T' },
    ],
  },

  // ── C Chord Licks — Wave 1 batch 2 from Splitting the Licks, p.10 ──────────
  {
    id: 'c_lick_forward_hammer',
    name: 'C-Lick — Forward Roll with Hammer',
    description: 'C chord lick leading with thumb on string 4 (E), hammer-on B to C on string 2, then forward roll through chord tones.',
    key: 'C', role: 'basic', chord: 'C',
    measureCount: 1, referenceBpm: 80,
    source: 'Splitting the Licks, p.10',
    tab: [
      { string: 4, fret: 2, beat: 0, finger: 'T' },
      { string: 2, fret: 0, beat: 1, finger: 'I', technique: 'hammer', slideToFret: 1 },
      { string: 1, fret: 0, beat: 2, finger: 'M' },
      { string: 5, fret: 0, beat: 3, finger: 'T' },
      { string: 2, fret: 1, beat: 4, finger: 'I' },
      { string: 1, fret: 0, beat: 5, finger: 'M' },
      { string: 5, fret: 0, beat: 6, finger: 'T' },
      { string: 1, fret: 0, beat: 7, finger: 'M' },
    ],
  },
  {
    id: 'c_lick_slide_root',
    name: 'C-Lick — Slide to Root on String 3',
    description: 'C chord lick featuring a slide from fret 3 to fret 5 on string 3, landing on the root (C4), then rolling through chord tones.',
    key: 'C', role: 'basic', chord: 'C',
    measureCount: 1, referenceBpm: 80,
    source: 'Splitting the Licks, p.10',
    tab: [
      { string: 4, fret: 2, beat: 0, finger: 'T' },
      { string: 2, fret: 1, beat: 1, finger: 'I' },
      { string: 3, fret: 3, beat: 2, finger: 'T', technique: 'slide', slideToFret: 5 },
      { string: 2, fret: 1, beat: 3, finger: 'I' },
      { string: 1, fret: 0, beat: 4, finger: 'M' },
      { string: 5, fret: 0, beat: 5, finger: 'T' },
      { string: 2, fret: 1, beat: 6, finger: 'I' },
      { string: 1, fret: 0, beat: 7, finger: 'M' },
    ],
  },
  {
    id: 'c_lick_alternating_melody',
    name: 'C-Lick — Alternating Thumb Melody',
    description: 'Alternating thumb pattern over C chord shape, bouncing between strings 4 and 3 while melody notes on strings 1 and 2 outline the chord.',
    key: 'C', role: 'basic', chord: 'C',
    measureCount: 1, referenceBpm: 80,
    source: 'Splitting the Licks, p.10',
    tab: [
      { string: 2, fret: 1, beat: 0, finger: 'I' },
      { string: 1, fret: 0, beat: 1, finger: 'M' },
      { string: 5, fret: 0, beat: 2, finger: 'T' },
      { string: 2, fret: 1, beat: 3, finger: 'I' },
      { string: 1, fret: 2, beat: 4, finger: 'M' },
      { string: 5, fret: 0, beat: 5, finger: 'T' },
      { string: 2, fret: 1, beat: 6, finger: 'I' },
      { string: 1, fret: 0, beat: 7, finger: 'M' },
    ],
  },
  {
    id: 'c_lick_pinch_fill',
    name: 'C-Lick — Pull-Off Fill',
    description: 'C chord fill-in lick with pull-off from C to B on string 2, weaving through chord tones for a smooth transitional phrase.',
    key: 'C', role: 'fill', chord: 'C',
    measureCount: 1, referenceBpm: 80,
    source: 'Splitting the Licks, p.10',
    tab: [
      { string: 1, fret: 0, beat: 0, finger: 'M' },
      { string: 2, fret: 1, beat: 1, finger: 'I', technique: 'pull', slideToFret: 0 },
      { string: 5, fret: 0, beat: 2, finger: 'T' },
      { string: 2, fret: 1, beat: 3, finger: 'I' },
      { string: 4, fret: 2, beat: 4, finger: 'T' },
      { string: 2, fret: 1, beat: 5, finger: 'I' },
      { string: 3, fret: 0, beat: 6, finger: 'T' },
      { string: 1, fret: 0, beat: 7, finger: 'M' },
    ],
  },
  {
    id: 'c_lick_ending_resolve',
    name: 'C-Lick — Ending Resolution',
    description: 'C chord ending lick that resolves through chord tones to the 5th (G) on the drone string, providing a strong cadential close.',
    key: 'C', role: 'ending', chord: 'C',
    measureCount: 1, referenceBpm: 80,
    source: 'Splitting the Licks, p.10',
    tab: [
      { string: 4, fret: 2, beat: 0, finger: 'T' },
      { string: 2, fret: 1, beat: 1, finger: 'I' },
      { string: 1, fret: 0, beat: 2, finger: 'M' },
      { string: 5, fret: 0, beat: 3, finger: 'T' },
      { string: 2, fret: 1, beat: 4, finger: 'I' },
      { string: 3, fret: 0, beat: 5, finger: 'T' },
      { string: 5, fret: 0, beat: 6, finger: 'T' },
      { string: 3, fret: 0, beat: 7, finger: 'T' },
    ],
  },

  // ── D Chord Licks ────────────────────────────────────────────────────────────
  {
    id: 'd_lick_basic',
    name: 'D-Lick — Basic',
    description: 'Basic phrase over D/D7 chord. Uses D chord shape and resolves back toward G.',
    key: 'D', role: 'basic', chord: 'D',
    measureCount: 1, referenceBpm: 80,
    source: 'Splitting the Licks, p.11',
    tab: [
      { string: 4, fret: 0, beat: 0, finger: 'T' },
      { string: 3, fret: 2, beat: 1, finger: 'T' },
      { string: 2, fret: 3, beat: 2, finger: 'I' },
      { string: 1, fret: 0, beat: 3, finger: 'M' },
      { string: 5, fret: 0, beat: 4, finger: 'T' },
      { string: 3, fret: 2, beat: 5, finger: 'T' },
      { string: 2, fret: 3, beat: 6, finger: 'I' },
      { string: 1, fret: 0, beat: 7, finger: 'M' },
    ],
  },
  {
    id: 'd_lick_pull_off',
    name: 'D-Lick — Pull-Off Variation',
    description: 'D chord lick featuring a pull-off from A to G on string 3.',
    key: 'D', role: 'basic', chord: 'D',
    measureCount: 1, referenceBpm: 80,
    source: 'Splitting the Licks, p.11',
    tab: [
      { string: 4, fret: 0, beat: 0, finger: 'T' },
      { string: 3, fret: 2, beat: 1, finger: 'T', technique: 'pull', slideToFret: 0 },
      { string: 1, fret: 0, beat: 2, finger: 'M' },
      { string: 5, fret: 0, beat: 3, finger: 'T' },
      { string: 2, fret: 3, beat: 4, finger: 'I' },
      { string: 3, fret: 2, beat: 5, finger: 'T' },
      { string: 1, fret: 0, beat: 6, finger: 'M' },
      { string: 5, fret: 0, beat: 7, finger: 'T' },
    ],
  },
  {
    id: 'd_lick_transition',
    name: 'D-Lick — Transition to G',
    description: 'D7 lick that smoothly resolves back to G — essential for I-IV-V progressions.',
    key: 'D', role: 'transition', chord: 'D', leadsTo: 'G',
    measureCount: 1, referenceBpm: 80,
    source: 'Splitting the Licks, p.11',
    tab: [
      { string: 3, fret: 2, beat: 0, finger: 'T' },
      { string: 2, fret: 3, beat: 1, finger: 'I' },
      { string: 1, fret: 0, beat: 2, finger: 'M' },
      { string: 2, fret: 1, beat: 3, finger: 'I' },
      { string: 2, fret: 0, beat: 4, finger: 'I' },
      { string: 3, fret: 0, beat: 5, finger: 'T' },
      { string: 5, fret: 0, beat: 6, finger: 'T' },
      { string: 3, fret: 0, beat: 7, finger: 'T' },
    ],
  },

  // ── D Chord Licks — Wave 1 batch 3 from Splitting the Licks, p.11 ──────────
  {
    id: 'd_lick_alt_thumb',
    name: 'D-Lick — Alternating Thumb',
    description: 'Alternating thumb pattern over D chord shape, bouncing between strings 4 (D3 root) and 3 (A3 fifth) while index and middle outline the chord on strings 2 and 1.',
    key: 'D', role: 'basic', chord: 'D',
    measureCount: 1, referenceBpm: 80,
    source: 'Splitting the Licks, p.11',
    tab: [
      { string: 4, fret: 0, beat: 0, finger: 'T' },
      { string: 2, fret: 3, beat: 1, finger: 'I' },
      { string: 3, fret: 2, beat: 2, finger: 'T' },
      { string: 1, fret: 4, beat: 3, finger: 'M' },
      { string: 4, fret: 0, beat: 4, finger: 'T' },
      { string: 2, fret: 3, beat: 5, finger: 'I' },
      { string: 3, fret: 2, beat: 6, finger: 'T' },
      { string: 1, fret: 4, beat: 7, finger: 'M' },
    ],
  },
  {
    id: 'd_lick_index_lead',
    name: 'D-Lick — Index Lead Forward Roll',
    description: 'Index finger leads on string 2 fret 3 (D4), followed by a forward-roll contour through D chord tones with the 5th string drone.',
    key: 'D', role: 'basic', chord: 'D',
    measureCount: 1, referenceBpm: 80,
    source: 'Splitting the Licks, p.11',
    tab: [
      { string: 2, fret: 3, beat: 0, finger: 'I' },
      { string: 1, fret: 4, beat: 1, finger: 'M' },
      { string: 5, fret: 0, beat: 2, finger: 'T' },
      { string: 3, fret: 2, beat: 3, finger: 'T' },
      { string: 2, fret: 3, beat: 4, finger: 'I' },
      { string: 1, fret: 4, beat: 5, finger: 'M' },
      { string: 5, fret: 0, beat: 6, finger: 'T' },
      { string: 3, fret: 2, beat: 7, finger: 'T' },
    ],
  },
  {
    id: 'd_lick_forward_desc',
    name: 'D-Lick — Forward Roll Descending',
    description: 'Forward roll pattern descending from F#4 (str 1, fret 4) through D chord tones. Thumb walks down from string 3 to string 4, creating a descending bass line.',
    key: 'D', role: 'basic', chord: 'D',
    measureCount: 1, referenceBpm: 80,
    source: 'Splitting the Licks, p.11',
    tab: [
      { string: 3, fret: 2, beat: 0, finger: 'T' },
      { string: 2, fret: 3, beat: 1, finger: 'I' },
      { string: 1, fret: 4, beat: 2, finger: 'M' },
      { string: 5, fret: 0, beat: 3, finger: 'T' },
      { string: 4, fret: 0, beat: 4, finger: 'T' },
      { string: 2, fret: 3, beat: 5, finger: 'I' },
      { string: 1, fret: 4, beat: 6, finger: 'M' },
      { string: 5, fret: 0, beat: 7, finger: 'T' },
    ],
  },
  {
    id: 'd_lick_pull_fill',
    name: 'D-Lick — Pull-Off Fill with Drone',
    description: 'D chord fill featuring a pull-off from A3 to G3 on string 3 (fret 2 to open), then resolving through the 5th string drone. Uses full D chord shape on strings 1 and 2.',
    key: 'D', role: 'fill', chord: 'D',
    measureCount: 1, referenceBpm: 80,
    source: 'Splitting the Licks, p.11',
    tab: [
      { string: 3, fret: 2, beat: 0, finger: 'T', technique: 'pull', slideToFret: 0 },
      { string: 2, fret: 3, beat: 1, finger: 'I' },
      { string: 1, fret: 4, beat: 2, finger: 'M' },
      { string: 5, fret: 0, beat: 3, finger: 'T' },
      { string: 3, fret: 0, beat: 4, finger: 'T' },
      { string: 2, fret: 3, beat: 5, finger: 'I' },
      { string: 5, fret: 0, beat: 6, finger: 'T' },
      { string: 1, fret: 4, beat: 7, finger: 'M' },
    ],
  },
  {
    id: 'd_lick_ending_to_g',
    name: 'D Ending — Turnaround to G',
    description: 'D chord ending lick that walks from the D shape down through D7 (C natural on string 2) and resolves to open G chord tones. Used at the end of a D measure leading back to G.',
    key: 'D', role: 'ending', chord: 'D', leadsTo: 'G',
    measureCount: 1, referenceBpm: 80,
    source: 'Splitting the Licks, p.11',
    tab: [
      { string: 4, fret: 0, beat: 0, finger: 'T' },
      { string: 2, fret: 3, beat: 1, finger: 'I' },
      { string: 1, fret: 4, beat: 2, finger: 'M' },
      { string: 5, fret: 0, beat: 3, finger: 'T' },
      { string: 2, fret: 1, beat: 4, finger: 'I' },
      { string: 1, fret: 0, beat: 5, finger: 'M' },
      { string: 5, fret: 0, beat: 6, finger: 'T' },
      { string: 3, fret: 0, beat: 7, finger: 'T' },
    ],
  },

  // ── G Fills & Combinations — Wave 1 batch 4 from Splitting the Licks, p.10-11 ──
  {
    id: 'g_lick_vamp_fill',
    name: 'G Fill — Vamping with Open 5th',
    description: 'Open-string G chord vamping fill. Roll pattern weaves through all five open strings, with the 5th string (G4) providing a high drone anchor. Used between vocal lines or during held G sections.',
    key: 'G', role: 'fill', chord: 'G',
    measureCount: 1, referenceBpm: 80,
    source: 'Splitting the Licks, p.10',
    tab: [
      { string: 3, fret: 0, beat: 0, finger: 'T' },
      { string: 2, fret: 0, beat: 1, finger: 'I' },
      { string: 1, fret: 0, beat: 2, finger: 'M' },
      { string: 2, fret: 0, beat: 3, finger: 'I' },
      { string: 1, fret: 0, beat: 4, finger: 'M' },
      { string: 2, fret: 0, beat: 5, finger: 'I' },
      { string: 5, fret: 0, beat: 6, finger: 'T' },
      { string: 1, fret: 0, beat: 7, finger: 'M' },
    ],
  },
  {
    id: 'g_lick_desc_tag_fill',
    name: 'G Fill — Descending Pull-Off Tag',
    description: 'Tag-style G fill that opens with a pull-off from D4 to B3 on string 2 (fret 3 to open), creating a descending melodic contour. Resolves through open G chord tones with the 5th string drone anchoring the rhythm.',
    key: 'G', role: 'fill', chord: 'G',
    measureCount: 1, referenceBpm: 80,
    source: 'Splitting the Licks, p.10',
    tab: [
      { string: 3, fret: 0, beat: 0, finger: 'T' },
      { string: 2, fret: 3, beat: 1, finger: 'I', technique: 'pull', slideToFret: 0 },
      { string: 1, fret: 0, beat: 2, finger: 'M' },
      { string: 5, fret: 0, beat: 3, finger: 'T' },
      { string: 3, fret: 0, beat: 4, finger: 'T' },
      { string: 2, fret: 0, beat: 5, finger: 'I' },
      { string: 5, fret: 0, beat: 6, finger: 'T' },
      { string: 1, fret: 0, beat: 7, finger: 'M' },
    ],
  },
  {
    id: 'g_combo_vamp_to_lick',
    name: 'G Combination — Vamp into G-Lick',
    description: 'Two-measure G phrase combining a forward roll vamp (measure 1) with the classic Scruggs G-lick ending (measure 2). A fundamental building block for bluegrass solos over G.',
    key: 'G', role: 'combination', chord: 'G',
    measureCount: 2, referenceBpm: 80,
    source: 'Splitting the Licks, p.10',
    tab: [
      // Measure 1 — forward roll vamp (beats 0-7)
      { string: 3, fret: 0, beat: 0, finger: 'T' },
      { string: 2, fret: 0, beat: 1, finger: 'I' },
      { string: 1, fret: 0, beat: 2, finger: 'M' },
      { string: 5, fret: 0, beat: 3, finger: 'T' },
      { string: 3, fret: 0, beat: 4, finger: 'T' },
      { string: 2, fret: 0, beat: 5, finger: 'I' },
      { string: 1, fret: 0, beat: 6, finger: 'M' },
      { string: 5, fret: 0, beat: 7, finger: 'T' },
      // Measure 2 — G-lick ending with pull-off (beats 8-15)
      { string: 2, fret: 3, beat: 8, finger: 'I', technique: 'pull', slideToFret: 0 },
      { string: 2, fret: 0, beat: 9, finger: 'I' },
      { string: 1, fret: 0, beat: 10, finger: 'M' },
      { string: 5, fret: 0, beat: 11, finger: 'T' },
      { string: 2, fret: 0, beat: 12, finger: 'I' },
      { string: 1, fret: 0, beat: 13, finger: 'M' },
      { string: 5, fret: 0, beat: 14, finger: 'T' },
      { string: 3, fret: 0, beat: 15, finger: 'T' },
    ],
  },
]

export const LICK_MAP = new Map(LICK_LIBRARY.map((l) => [l.id, l]))

/** Get unique keys present in the lick library, in definition order. */
export function getLickKeys(): string[] {
  const seen = new Set<string>()
  const keys: string[] = []
  for (const l of LICK_LIBRARY) {
    if (!seen.has(l.key)) { seen.add(l.key); keys.push(l.key) }
  }
  return keys
}

/** Get unique roles present in the lick library, in definition order. */
export function getLickRoles(): LickRole[] {
  const seen = new Set<LickRole>()
  const roles: LickRole[] = []
  for (const l of LICK_LIBRARY) {
    if (!seen.has(l.role)) { seen.add(l.role); roles.push(l.role) }
  }
  return roles
}

/** Get unique `leadsTo` targets from transition licks. */
export function getLickLeadsToTargets(): string[] {
  const seen = new Set<string>()
  const targets: string[] = []
  for (const l of LICK_LIBRARY) {
    if (l.leadsTo && !seen.has(l.leadsTo)) { seen.add(l.leadsTo); targets.push(l.leadsTo) }
  }
  return targets
}

export const LICK_ROLES: { id: LickRole; label: string }[] = [
  { id: 'basic', label: 'Basic' },
  { id: 'fill', label: 'Fill-In' },
  { id: 'ending', label: 'Ending' },
  { id: 'transition', label: 'Transition' },
  { id: 'combination', label: 'Combination' },
]
