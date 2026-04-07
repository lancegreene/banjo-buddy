// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Scale Library
// FretNote[] sequences for common banjo scales in open G tuning.
// Includes positional (Scruggs), melodic (Keith), pentatonic, and blues scales.
// ─────────────────────────────────────────────────────────────────────────────

import type { FretNote } from './fretboardNotes'

export interface ScalePattern {
  id: string
  name: string
  description: string
  category: 'major' | 'melodic' | 'pentatonic' | 'blues'
  key: string
  notes: FretNote[]
  defaultBpm: number
}

export const SCALE_LIBRARY: ScalePattern[] = [
  // ── G Major (Positional / Scruggs) ─────────────────────────────────────────

  {
    id: 'g_major_asc',
    name: 'G Major — Ascending',
    description: 'G major scale ascending one octave in first position (G3→G4)',
    category: 'major',
    key: 'G',
    defaultBpm: 80,
    notes: [
      { string: 3, fret: 0, note: 'G3', finger: 'T' },
      { string: 3, fret: 2, note: 'A3', finger: 'T' },
      { string: 2, fret: 0, note: 'B3', finger: 'I' },
      { string: 2, fret: 1, note: 'C4', finger: 'I' },
      { string: 1, fret: 0, note: 'D4', finger: 'M' },
      { string: 1, fret: 2, note: 'E4', finger: 'M' },
      { string: 1, fret: 4, note: 'F#4', finger: 'M' },
      { string: 5, fret: 0, note: 'G4', finger: 'T' },
    ],
  },
  {
    id: 'g_major_desc',
    name: 'G Major — Descending',
    description: 'G major scale descending one octave (G4→G3)',
    category: 'major',
    key: 'G',
    defaultBpm: 80,
    notes: [
      { string: 5, fret: 0, note: 'G4', finger: 'T' },
      { string: 1, fret: 4, note: 'F#4', finger: 'M' },
      { string: 1, fret: 2, note: 'E4', finger: 'M' },
      { string: 1, fret: 0, note: 'D4', finger: 'M' },
      { string: 2, fret: 1, note: 'C4', finger: 'I' },
      { string: 2, fret: 0, note: 'B3', finger: 'I' },
      { string: 3, fret: 2, note: 'A3', finger: 'T' },
      { string: 3, fret: 0, note: 'G3', finger: 'T' },
    ],
  },
  {
    id: 'g_major_up_down',
    name: 'G Major — Up & Down',
    description: 'G major scale ascending then descending (2 measures)',
    category: 'major',
    key: 'G',
    defaultBpm: 80,
    notes: [
      // Ascending
      { string: 3, fret: 0, note: 'G3', finger: 'T' },
      { string: 3, fret: 2, note: 'A3', finger: 'T' },
      { string: 2, fret: 0, note: 'B3', finger: 'I' },
      { string: 2, fret: 1, note: 'C4', finger: 'I' },
      { string: 1, fret: 0, note: 'D4', finger: 'M' },
      { string: 1, fret: 2, note: 'E4', finger: 'M' },
      { string: 1, fret: 4, note: 'F#4', finger: 'M' },
      { string: 5, fret: 0, note: 'G4', finger: 'T' },
      // Descending
      { string: 1, fret: 4, note: 'F#4', finger: 'M' },
      { string: 1, fret: 2, note: 'E4', finger: 'M' },
      { string: 1, fret: 0, note: 'D4', finger: 'M' },
      { string: 2, fret: 1, note: 'C4', finger: 'I' },
      { string: 2, fret: 0, note: 'B3', finger: 'I' },
      { string: 3, fret: 2, note: 'A3', finger: 'T' },
      { string: 3, fret: 0, note: 'G3', finger: 'T' },
      { string: 3, fret: 0, note: 'G3', finger: 'T' },  // resolve
    ],
  },
  {
    id: 'c_major_asc',
    name: 'C Major — Ascending',
    description: 'C major scale ascending one octave (C4→C5) — reaches 10th fret',
    category: 'major',
    key: 'C',
    defaultBpm: 70,
    notes: [
      { string: 2, fret: 1, note: 'C4', finger: 'I' },
      { string: 1, fret: 0, note: 'D4', finger: 'M' },
      { string: 1, fret: 2, note: 'E4', finger: 'M' },
      { string: 1, fret: 3, note: 'F4', finger: 'M' },
      { string: 5, fret: 0, note: 'G4', finger: 'T' },
      { string: 5, fret: 2, note: 'A4', finger: 'T' },
      { string: 5, fret: 4, note: 'B4', finger: 'T' },
      { string: 1, fret: 10, note: 'C5', finger: 'M' },
    ],
  },
  {
    id: 'd_major_asc',
    name: 'D Major — Ascending',
    description: 'D major scale ascending one octave (D3→D4) — all in first position',
    category: 'major',
    key: 'D',
    defaultBpm: 70,
    notes: [
      { string: 4, fret: 0, note: 'D3', finger: 'T' },
      { string: 4, fret: 2, note: 'E3', finger: 'T' },
      { string: 4, fret: 4, note: 'F#3', finger: 'T' },
      { string: 3, fret: 0, note: 'G3', finger: 'T' },
      { string: 3, fret: 2, note: 'A3', finger: 'T' },
      { string: 2, fret: 0, note: 'B3', finger: 'I' },
      { string: 2, fret: 2, note: 'C#4', finger: 'I' },
      { string: 1, fret: 0, note: 'D4', finger: 'M' },
    ],
  },

  // ── G Major Melodic (Keith Style) ──────────────────────────────────────────
  // Each note on a different string than the previous — enables continuous
  // right-hand picking flow without repeating strings.

  {
    id: 'g_melodic_asc',
    name: 'G Melodic (Keith) — Ascending',
    description: 'Bill Keith-style G major: no consecutive notes on the same string',
    category: 'melodic',
    key: 'G',
    defaultBpm: 70,
    notes: [
      { string: 4, fret: 5, note: 'G3', finger: 'T' },   // G3 on string 4
      { string: 3, fret: 2, note: 'A3', finger: 'T' },   // A3 on string 3
      { string: 2, fret: 0, note: 'B3', finger: 'I' },   // B3 on string 2
      { string: 3, fret: 5, note: 'C4', finger: 'T' },   // C4 on string 3
      { string: 1, fret: 0, note: 'D4', finger: 'M' },   // D4 on string 1
      { string: 2, fret: 5, note: 'E4', finger: 'I' },   // E4 on string 2
      { string: 1, fret: 4, note: 'F#4', finger: 'M' },  // F#4 on string 1
      { string: 5, fret: 0, note: 'G4', finger: 'T' },   // G4 on string 5
    ],
  },
  {
    id: 'g_melodic_desc',
    name: 'G Melodic (Keith) — Descending',
    description: 'Bill Keith-style G major descending: alternating strings throughout',
    category: 'melodic',
    key: 'G',
    defaultBpm: 70,
    notes: [
      { string: 5, fret: 0, note: 'G4', finger: 'T' },
      { string: 1, fret: 4, note: 'F#4', finger: 'M' },
      { string: 2, fret: 5, note: 'E4', finger: 'I' },
      { string: 1, fret: 0, note: 'D4', finger: 'M' },
      { string: 3, fret: 5, note: 'C4', finger: 'T' },
      { string: 2, fret: 0, note: 'B3', finger: 'I' },
      { string: 3, fret: 2, note: 'A3', finger: 'T' },
      { string: 4, fret: 5, note: 'G3', finger: 'T' },
    ],
  },
  {
    id: 'g_melodic_up_down',
    name: 'G Melodic (Keith) — Up & Down',
    description: 'Full Keith-style G major scale up and down (2 measures)',
    category: 'melodic',
    key: 'G',
    defaultBpm: 70,
    notes: [
      // Ascending
      { string: 4, fret: 5, note: 'G3', finger: 'T' },
      { string: 3, fret: 2, note: 'A3', finger: 'T' },
      { string: 2, fret: 0, note: 'B3', finger: 'I' },
      { string: 3, fret: 5, note: 'C4', finger: 'T' },
      { string: 1, fret: 0, note: 'D4', finger: 'M' },
      { string: 2, fret: 5, note: 'E4', finger: 'I' },
      { string: 1, fret: 4, note: 'F#4', finger: 'M' },
      { string: 5, fret: 0, note: 'G4', finger: 'T' },
      // Descending
      { string: 1, fret: 4, note: 'F#4', finger: 'M' },
      { string: 2, fret: 5, note: 'E4', finger: 'I' },
      { string: 1, fret: 0, note: 'D4', finger: 'M' },
      { string: 3, fret: 5, note: 'C4', finger: 'T' },
      { string: 2, fret: 0, note: 'B3', finger: 'I' },
      { string: 3, fret: 2, note: 'A3', finger: 'T' },
      { string: 4, fret: 5, note: 'G3', finger: 'T' },
      { string: 4, fret: 5, note: 'G3', finger: 'T' },  // resolve
    ],
  },

  // ── Pentatonic & Blues ─────────────────────────────────────────────────────

  {
    id: 'g_pentatonic',
    name: 'G Major Pentatonic',
    description: 'G A B D E — the bread-and-butter bluegrass scale (up and back)',
    category: 'pentatonic',
    key: 'G',
    defaultBpm: 80,
    notes: [
      { string: 3, fret: 0, note: 'G3', finger: 'T' },
      { string: 3, fret: 2, note: 'A3', finger: 'T' },
      { string: 2, fret: 0, note: 'B3', finger: 'I' },
      { string: 1, fret: 0, note: 'D4', finger: 'M' },
      { string: 1, fret: 2, note: 'E4', finger: 'M' },
      { string: 5, fret: 0, note: 'G4', finger: 'T' },
      { string: 1, fret: 2, note: 'E4', finger: 'M' },
      { string: 1, fret: 0, note: 'D4', finger: 'M' },
    ],
  },
  {
    id: 'g_minor_pentatonic',
    name: 'G Minor Pentatonic',
    description: 'G Bb C D F — minor feel for bluesy passages (up and back)',
    category: 'pentatonic',
    key: 'Gm',
    defaultBpm: 70,
    notes: [
      { string: 3, fret: 0, note: 'G3', finger: 'T' },
      { string: 3, fret: 3, note: 'A#3', finger: 'T' },
      { string: 2, fret: 1, note: 'C4', finger: 'I' },
      { string: 1, fret: 0, note: 'D4', finger: 'M' },
      { string: 1, fret: 3, note: 'F4', finger: 'M' },
      { string: 5, fret: 0, note: 'G4', finger: 'T' },
      { string: 1, fret: 3, note: 'F4', finger: 'M' },
      { string: 1, fret: 0, note: 'D4', finger: 'M' },
    ],
  },
  {
    id: 'g_blues',
    name: 'G Blues Scale',
    description: 'G Bb C C# D F — adds the "blue note" (C#/Db) for that bluesy bend',
    category: 'blues',
    key: 'G',
    defaultBpm: 70,
    notes: [
      { string: 3, fret: 0, note: 'G3', finger: 'T' },
      { string: 3, fret: 3, note: 'A#3', finger: 'T' },
      { string: 2, fret: 1, note: 'C4', finger: 'I' },
      { string: 2, fret: 2, note: 'C#4', finger: 'I' },  // blue note
      { string: 1, fret: 0, note: 'D4', finger: 'M' },
      { string: 1, fret: 3, note: 'F4', finger: 'M' },
      { string: 5, fret: 0, note: 'G4', finger: 'T' },
      { string: 1, fret: 3, note: 'F4', finger: 'M' },
    ],
  },
]

export const SCALE_MAP = new Map(SCALE_LIBRARY.map(s => [s.id, s]))
