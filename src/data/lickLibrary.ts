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

export interface LickReference {
  id: string
  name: string
  description: string
  referenceBpm: number
  notes: ReferenceNote[]
}

export const LICK_LIBRARY: LickReference[] = [
  {
    id: 'foggy_mountain_a1',
    name: 'Foggy Mountain — A Part (phrase 1)',
    description: 'Opening 7-note melodic phrase of the A part in G tuning',
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
]

export const LICK_MAP = new Map(LICK_LIBRARY.map((l) => [l.id, l]))
