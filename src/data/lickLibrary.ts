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
