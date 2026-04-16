// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Lick Reference Library
// Static note sequences for lick detection. durationRatio is relative —
// 1.0 = one beat, 0.5 = eighth note, 2.0 = half note. DTW handles alignment.
// ─────────────────────────────────────────────────────────────────────────────

export interface ReferenceNote {
  note: string        // 'C', 'D', 'E', etc.
  octave: number
  durationRatio: number
}

export type LickType = 'song' | 'chord'

export interface LickReference {
  id: string
  name: string
  description: string
  referenceBpm: number
  key: string
  lickType: LickType
  notes: ReferenceNote[]
}

export const LICK_LIBRARY: LickReference[] = [
  {
    id: 'foggy_mountain_a1',
    name: 'Foggy Mountain — A Part (phrase 1)',
    description: 'Opening 7-note melodic phrase of the A part in G tuning',
    key: 'G', lickType: 'song',
    referenceBpm: 100,
    // Foggy Mountain Breakdown A-part opening melodic skeleton (Scruggs G tuning)
    // The melody notes that stand out over the roll: E4 B3 G3 B3 E4 D4 G4
    notes: [
      { note: 'E', octave: 4, durationRatio: 1.0 },
      { note: 'B', octave: 3, durationRatio: 1.0 },
      { note: 'G', octave: 3, durationRatio: 1.0 },
      { note: 'B', octave: 3, durationRatio: 0.5 },
      { note: 'E', octave: 4, durationRatio: 0.5 },
      { note: 'D', octave: 4, durationRatio: 1.0 },
      { note: 'G', octave: 4, durationRatio: 2.0 },
    ],
  },
  {
    id: 'foggy_mountain_a2',
    name: 'Foggy Mountain — A Part (phrase 2)',
    description: 'Second melodic phrase of the A part',
    key: 'G', lickType: 'song',
    referenceBpm: 100,
    notes: [
      { note: 'E', octave: 4, durationRatio: 1.0 },
      { note: 'B', octave: 3, durationRatio: 1.0 },
      { note: 'G', octave: 3, durationRatio: 1.0 },
      { note: 'B', octave: 3, durationRatio: 0.5 },
      { note: 'G', octave: 3, durationRatio: 0.5 },
      { note: 'D', octave: 3, durationRatio: 1.0 },
      { note: 'G', octave: 3, durationRatio: 2.0 },
    ],
  },
  {
    id: 'cripple_creek_intro',
    name: 'Cripple Creek — Intro Lick',
    description: 'Classic G-tuning Cripple Creek opening phrase',
    key: 'G', lickType: 'song',
    referenceBpm: 100,
    notes: [
      { note: 'D', octave: 4, durationRatio: 0.5 },
      { note: 'B', octave: 3, durationRatio: 0.5 },
      { note: 'G', octave: 3, durationRatio: 1.0 },
      { note: 'D', octave: 4, durationRatio: 0.5 },
      { note: 'B', octave: 3, durationRatio: 0.5 },
      { note: 'G', octave: 3, durationRatio: 2.0 },
    ],
  },
  {
    id: 'cripple_creek_a',
    name: 'Cripple Creek — A Part Melody',
    description: 'A Part melodic skeleton: G-based forward roll with melody on string 3 (fret 2 = A)',
    key: 'G', lickType: 'song',
    referenceBpm: 70,
    notes: [
      { note: 'A', octave: 3, durationRatio: 0.5 },
      { note: 'B', octave: 3, durationRatio: 0.5 },
      { note: 'D', octave: 4, durationRatio: 0.5 },
      { note: 'G', octave: 4, durationRatio: 0.5 },
      { note: 'G', octave: 3, durationRatio: 0.5 },
      { note: 'B', octave: 3, durationRatio: 0.5 },
      { note: 'D', octave: 4, durationRatio: 0.5 },
      { note: 'G', octave: 4, durationRatio: 0.5 },
    ],
  },
  {
    id: 'cripple_creek_b',
    name: 'Cripple Creek — B Part Melody',
    description: 'B Part: C chord with hammer-on (open B → C) then resolve to G',
    key: 'G', lickType: 'song',
    referenceBpm: 70,
    notes: [
      { note: 'E', octave: 3, durationRatio: 0.5 },
      { note: 'B', octave: 3, durationRatio: 0.5 },
      { note: 'C', octave: 4, durationRatio: 0.5 },
      { note: 'G', octave: 4, durationRatio: 0.5 },
      { note: 'G', octave: 3, durationRatio: 0.5 },
      { note: 'C', octave: 4, durationRatio: 0.5 },
      { note: 'E', octave: 4, durationRatio: 0.5 },
      { note: 'G', octave: 4, durationRatio: 0.5 },
    ],
  },

  // ── G Licks ──────────────────────────────────────────────────────────────────

  {
    id: 'g_lick_basic',
    name: 'G-Lick — Basic (the "Godfather")',
    description: 'The classic Scruggs-style phrase-ending lick in G. Pull-off from 3rd to open on string 2, resolve to open G.',
    key: 'G', lickType: 'chord',
    referenceBpm: 80,
    // Tab: 0-h2-0 pull to 0 on str 2, str 1 open, str 5, str 1, str 5
    // Melodic contour: G3 → B3 → D4 → G4 → D4 → B3 → G3 → G4
    notes: [
      { note: 'G', octave: 3, durationRatio: 0.5 },
      { note: 'A', octave: 3, durationRatio: 0.5 },
      { note: 'B', octave: 3, durationRatio: 0.5 },
      { note: 'D', octave: 4, durationRatio: 0.5 },
      { note: 'G', octave: 4, durationRatio: 0.5 },
      { note: 'B', octave: 3, durationRatio: 0.5 },
      { note: 'D', octave: 4, durationRatio: 0.5 },
      { note: 'G', octave: 4, durationRatio: 0.5 },
    ],
  },
  {
    id: 'g_lick_tag',
    name: 'G-Lick — Tag Ending',
    description: 'Classic Scruggs tag lick — a variation of the G-lick used to end songs.',
    key: 'G', lickType: 'chord',
    referenceBpm: 80,
    notes: [
      { note: 'D', octave: 4, durationRatio: 0.5 },
      { note: 'B', octave: 3, durationRatio: 0.5 },
      { note: 'G', octave: 3, durationRatio: 0.5 },
      { note: 'G', octave: 4, durationRatio: 0.5 },
      { note: 'D', octave: 4, durationRatio: 0.5 },
      { note: 'B', octave: 3, durationRatio: 0.5 },
      { note: 'G', octave: 3, durationRatio: 1.0 },
      { note: 'G', octave: 3, durationRatio: 1.0 },
    ],
  },
  {
    id: 'g_lick_forward_roll',
    name: 'G-Lick — Forward Roll Variation',
    description: 'The G-lick melodic contour played over a forward roll pattern.',
    key: 'G', lickType: 'chord',
    referenceBpm: 80,
    notes: [
      { note: 'G', octave: 3, durationRatio: 0.5 },
      { note: 'B', octave: 3, durationRatio: 0.5 },
      { note: 'D', octave: 4, durationRatio: 0.5 },
      { note: 'G', octave: 4, durationRatio: 0.5 },
      { note: 'G', octave: 3, durationRatio: 0.5 },
      { note: 'D', octave: 4, durationRatio: 0.5 },
      { note: 'G', octave: 4, durationRatio: 0.5 },
      { note: 'D', octave: 4, durationRatio: 0.5 },
    ],
  },

  // ── C Licks ──────────────────────────────────────────────────────────────────

  {
    id: 'c_lick_basic',
    name: 'C-Lick — Basic',
    description: 'Basic phrase over C chord. Uses the C chord shape (index on 2nd string 1st fret, middle on 4th string 2nd fret).',
    key: 'C', lickType: 'chord',
    referenceBpm: 80,
    // C chord tones: C E G — string 4 fret 2 = E3, string 2 fret 1 = C4
    notes: [
      { note: 'C', octave: 4, durationRatio: 0.5 },
      { note: 'E', octave: 3, durationRatio: 0.5 },
      { note: 'G', octave: 3, durationRatio: 0.5 },
      { note: 'C', octave: 4, durationRatio: 0.5 },
      { note: 'G', octave: 4, durationRatio: 0.5 },
      { note: 'E', octave: 3, durationRatio: 0.5 },
      { note: 'C', octave: 4, durationRatio: 0.5 },
      { note: 'G', octave: 4, durationRatio: 0.5 },
    ],
  },
  {
    id: 'c_lick_hammer',
    name: 'C-Lick — Hammer-On Variation',
    description: 'C chord lick with hammer-on from open B to C on string 2.',
    key: 'C', lickType: 'chord',
    referenceBpm: 80,
    notes: [
      { note: 'E', octave: 3, durationRatio: 0.5 },
      { note: 'B', octave: 3, durationRatio: 0.25 },
      { note: 'C', octave: 4, durationRatio: 0.25 },
      { note: 'G', octave: 4, durationRatio: 0.5 },
      { note: 'G', octave: 3, durationRatio: 0.5 },
      { note: 'C', octave: 4, durationRatio: 0.5 },
      { note: 'E', octave: 4, durationRatio: 0.5 },
      { note: 'G', octave: 4, durationRatio: 0.5 },
    ],
  },
  {
    id: 'c_lick_fill',
    name: 'C-Lick — Fill-In',
    description: 'Transitional C chord lick used between vocal lines or during chord changes.',
    key: 'C', lickType: 'chord',
    referenceBpm: 80,
    notes: [
      { note: 'G', octave: 3, durationRatio: 0.5 },
      { note: 'C', octave: 4, durationRatio: 0.5 },
      { note: 'E', octave: 4, durationRatio: 0.5 },
      { note: 'G', octave: 4, durationRatio: 0.5 },
      { note: 'E', octave: 3, durationRatio: 0.5 },
      { note: 'G', octave: 3, durationRatio: 0.5 },
      { note: 'C', octave: 4, durationRatio: 0.5 },
      { note: 'G', octave: 3, durationRatio: 0.5 },
    ],
  },

  // ── D Licks ──────────────────────────────────────────────────────────────────

  {
    id: 'd_lick_basic',
    name: 'D-Lick — Basic',
    description: 'Basic phrase over D/D7 chord. Uses D chord shape and resolves back toward G.',
    key: 'D', lickType: 'chord',
    referenceBpm: 80,
    // D chord tones: D F# A — string 4 open = D3, string 3 fret 2 = A3, string 2 fret 3 = D4
    notes: [
      { note: 'D', octave: 3, durationRatio: 0.5 },
      { note: 'F#', octave: 3, durationRatio: 0.5 },
      { note: 'A', octave: 3, durationRatio: 0.5 },
      { note: 'D', octave: 4, durationRatio: 0.5 },
      { note: 'G', octave: 4, durationRatio: 0.5 },
      { note: 'A', octave: 3, durationRatio: 0.5 },
      { note: 'D', octave: 4, durationRatio: 0.5 },
      { note: 'G', octave: 4, durationRatio: 0.5 },
    ],
  },
  {
    id: 'd_lick_pull_off',
    name: 'D-Lick — Pull-Off Variation',
    description: 'D chord lick featuring a pull-off from A to G on string 3.',
    key: 'D', lickType: 'chord',
    referenceBpm: 80,
    notes: [
      { note: 'D', octave: 3, durationRatio: 0.5 },
      { note: 'A', octave: 3, durationRatio: 0.25 },
      { note: 'G', octave: 3, durationRatio: 0.25 },
      { note: 'D', octave: 4, durationRatio: 0.5 },
      { note: 'G', octave: 4, durationRatio: 0.5 },
      { note: 'F#', octave: 3, durationRatio: 0.5 },
      { note: 'D', octave: 4, durationRatio: 0.5 },
      { note: 'G', octave: 4, durationRatio: 0.5 },
    ],
  },
  {
    id: 'd_lick_transition',
    name: 'D-Lick — Transition to G',
    description: 'D7 lick that smoothly resolves back to G — essential for I-IV-V progressions.',
    key: 'D', lickType: 'chord',
    referenceBpm: 80,
    notes: [
      { note: 'F#', octave: 3, durationRatio: 0.5 },
      { note: 'A', octave: 3, durationRatio: 0.5 },
      { note: 'D', octave: 4, durationRatio: 0.5 },
      { note: 'C', octave: 4, durationRatio: 0.5 },
      { note: 'B', octave: 3, durationRatio: 0.5 },
      { note: 'D', octave: 4, durationRatio: 0.5 },
      { note: 'G', octave: 3, durationRatio: 0.5 },
      { note: 'G', octave: 4, durationRatio: 0.5 },
    ],
  },
]

export const LICK_MAP = new Map(LICK_LIBRARY.map((l) => [l.id, l]))

/** Get unique keys from lick library, in definition order */
export function getLickKeys(): string[] {
  const seen = new Set<string>()
  const keys: string[] = []
  for (const l of LICK_LIBRARY) {
    if (!seen.has(l.key)) { seen.add(l.key); keys.push(l.key) }
  }
  return keys
}

/** Get unique lick types */
export const LICK_TYPES: { id: LickType; label: string }[] = [
  { id: 'chord', label: 'Chord Licks' },
  { id: 'song', label: 'Song Phrases' },
]
