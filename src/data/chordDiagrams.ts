// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Chord Diagram Definitions
// Standard 5-string banjo in open G tuning (gDGBD).
// Open strings: S1=D4, S2=B3, S3=G3, S4=D3, S5=G4
// frets array: index 0 = string 1, index 4 = string 5.
//   0 = open, -1 = muted/don't play, N = fret number
// fingers array: 1=index, 2=middle, 3=ring, 4=pinky, 0=none/open
//
// IMPORTANT: The open strings are NOT uniformly spaced in intervals
//   S1–S2 = minor 3rd, S2–S3 = major 3rd, S3–S4 = perfect 4th
// This means barre shapes produce DIFFERENT chords at each fret:
//   Barre 0=G, 2=A, 4=B, 5=C, 7=D, 9=E, 12=G(8va)
// Every voicing below has been verified note-by-note.
// ─────────────────────────────────────────────────────────────────────────────

export type ChordCategory = 'major' | 'minor' | '7th'

export interface ChordDiagram {
  id: string
  name: string
  root: string                                       // root note label (G, C, D, etc.)
  frets: [number, number, number, number, number]    // strings 1-5
  fingers?: [number, number, number, number, number] // 0 = no label
  baseFret?: number  // fret the diagram starts at (default 1)
  category: ChordCategory
  position?: string  // position label (Open, 5th, 9th, etc.)
}

export const CHORD_DIAGRAMS: ChordDiagram[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // MAJOR — root, major 3rd, perfect 5th
  // ═══════════════════════════════════════════════════════════════════════════

  // ── G Major (G, B, D) ──
  { id: 'g_open', root: 'G', name: 'G', position: 'Open',
    frets: [0, 0, 0, 0, 0], category: 'major' },
    // D4, B3, G3, D3, G4 ✓
  { id: 'g_3rd', root: 'G', name: 'G', position: '3rd',
    frets: [5, 3, 4, 5, -1], baseFret: 3, fingers: [3, 1, 2, 4, 0], category: 'major' },
    // G4, D4, B3, G3 ✓
  { id: 'g_9th', root: 'G', name: 'G', position: '7th',
    frets: [9, 8, 7, 9, -1], baseFret: 7, fingers: [3, 2, 1, 4, 0], category: 'major' },
    // B4, G4, D4, B3 ✓
  { id: 'g_12th', root: 'G', name: 'G', position: '12th',
    frets: [12, 12, 12, 12, 0], baseFret: 12, fingers: [1, 1, 1, 1, 0], category: 'major' },
    // D5, B4, G4, D4, G4 ✓

  // ── C Major (C, E, G) ──
  { id: 'c_open', root: 'C', name: 'C', position: 'Open',
    frets: [2, 1, 0, 2, 0], fingers: [3, 1, 0, 2, 0], category: 'major' },
    // E4, C4, G3, E3, G4 ✓
  { id: 'c_5th', root: 'C', name: 'C', position: '5th',
    frets: [5, 5, 5, 5, -1], baseFret: 5, fingers: [1, 1, 1, 1, 0], category: 'major' },
    // G4, E4, C4, G3 ✓
  { id: 'c_8th', root: 'C', name: 'C', position: '8th',
    frets: [10, 8, 9, 10, -1], baseFret: 8, fingers: [3, 1, 2, 4, 0], category: 'major' },
    // C5, G4, E4, C4 ✓
  { id: 'c_12th', root: 'C', name: 'C', position: '12th',
    frets: [14, 13, 12, 14, -1], baseFret: 12, fingers: [3, 2, 1, 4, 0], category: 'major' },
    // E5, C5, G4, E4 ✓

  // ── D Major (D, F#, A) ──
  { id: 'd_open', root: 'D', name: 'D', position: 'Open',
    frets: [4, 3, 2, 0, -1], fingers: [3, 2, 1, 0, 0], category: 'major' },
    // F#4, D4, A3, D3 ✓
  { id: 'd_7th', root: 'D', name: 'D', position: '7th',
    frets: [7, 7, 7, 7, -1], baseFret: 7, fingers: [1, 1, 1, 1, 0], category: 'major' },
    // A4, F#4, D4, A3 ✓
  { id: 'd_10th', root: 'D', name: 'D', position: '10th',
    frets: [12, 10, 11, 12, -1], baseFret: 10, fingers: [3, 1, 2, 4, 0], category: 'major' },
    // D5, A4, F#4, D4 ✓
  { id: 'd_14th', root: 'D', name: 'D', position: '14th',
    frets: [16, 15, 14, 0, -1], baseFret: 14, fingers: [3, 2, 1, 0, 0], category: 'major' },
    // F#5, D5, A4, D3 ✓

  // ── A Major (A, C#, E) ──
  { id: 'a_open', root: 'A', name: 'A', position: 'Open',
    frets: [2, 2, 2, 2, -1], baseFret: 1, fingers: [1, 1, 1, 1, 0], category: 'major' },
    // E4, C#4, A3, E3 ✓
  { id: 'a_5th', root: 'A', name: 'A', position: '5th',
    frets: [7, 5, 6, 7, -1], baseFret: 5, fingers: [3, 1, 2, 4, 0], category: 'major' },
    // A4, E4, C#4, A3 ✓
  { id: 'a_9th', root: 'A', name: 'A', position: '9th',
    frets: [11, 10, 9, 11, -1], baseFret: 9, fingers: [3, 2, 1, 4, 0], category: 'major' },
    // C#5, A4, E4, C#4 ✓
  { id: 'a_14th', root: 'A', name: 'A', position: '14th',
    frets: [14, 14, 14, 14, -1], baseFret: 14, fingers: [1, 1, 1, 1, 0], category: 'major' },
    // E5, C#5, A4, E4 ✓

  // ── E Major (E, G#, B) ──
  { id: 'e_open', root: 'E', name: 'E', position: 'Open',
    frets: [2, 0, 1, 2, -1], fingers: [3, 0, 1, 2, 0], category: 'major' },
    // E4, B3, G#3, E3 ✓
  { id: 'e_4th', root: 'E', name: 'E', position: '4th',
    frets: [6, 5, 4, 6, -1], baseFret: 4, fingers: [2, 1, 1, 3, 0], category: 'major' },
    // G#4, E4, B3, G#3 ✓
  { id: 'e_9th', root: 'E', name: 'E', position: '9th',
    frets: [9, 9, 9, 9, -1], baseFret: 9, fingers: [1, 1, 1, 1, 0], category: 'major' },
    // B4, G#4, E4, B3 ✓

  // ── F Major (F, A, C) ──
  { id: 'f_open', root: 'F', name: 'F', position: 'Open',
    frets: [3, 1, 2, 3, -1], fingers: [3, 1, 2, 4, 0], category: 'major' },
    // F4, C4, A3, F3 ✓
  { id: 'f_10th', root: 'F', name: 'F', position: '10th',
    frets: [10, 10, 10, 10, -1], baseFret: 10, fingers: [1, 1, 1, 1, 0], category: 'major' },
    // C5, A4, F4, C4 ✓

  // ═══════════════════════════════════════════════════════════════════════════
  // MINOR — root, minor 3rd, perfect 5th
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Em (E, G, B) ──
  { id: 'em_open', root: 'Em', name: 'Em', position: 'Open',
    frets: [0, 0, 0, 2, 0], fingers: [0, 0, 0, 2, 0], category: 'minor' },
    // D4, B3, G3, E3, G4 — D makes it Em7, but standard open banjo voicing
  { id: 'em_5th', root: 'Em', name: 'Em', position: '4th',
    frets: [5, 5, 4, 5, -1], baseFret: 4, fingers: [2, 3, 1, 4, 0], category: 'minor' },
    // G4, E4, B3, G3 ✓
  { id: 'em_9th', root: 'Em', name: 'Em', position: '7th',
    frets: [9, 8, 9, 9, -1], baseFret: 7, fingers: [2, 1, 3, 4, 0], category: 'minor' },
    // B4, G4, E4, B3 ✓
  { id: 'em_12th', root: 'Em', name: 'Em', position: '12th',
    frets: [12, 12, 12, 14, -1], baseFret: 12, fingers: [1, 1, 1, 3, 0], category: 'minor' },
    // D5, B4, G4, E4 — D makes it Em7, same as open shape up an octave

  // ── Am (A, C, E) ──
  { id: 'am_open', root: 'Am', name: 'Am', position: 'Open',
    frets: [2, 1, 2, 2, -1], fingers: [3, 1, 2, 4, 0], category: 'minor' },
    // E4, C4, A3, E3 ✓
  { id: 'am_5th', root: 'Am', name: 'Am', position: '5th',
    frets: [7, 5, 5, 7, -1], baseFret: 5, fingers: [3, 1, 1, 4, 0], category: 'minor' },
    // A4, E4, C4, A3 ✓
  { id: 'am_9th', root: 'Am', name: 'Am', position: '9th',
    frets: [10, 10, 9, 10, -1], baseFret: 9, fingers: [2, 3, 1, 4, 0], category: 'minor' },
    // C5, A4, E4, C4 ✓
  { id: 'am_12th', root: 'Am', name: 'Am', position: '12th',
    frets: [14, 13, 14, 14, -1], baseFret: 12, fingers: [2, 1, 3, 4, 0], category: 'minor' },
    // E5, C5, A4, E4 ✓

  // ── Dm (D, F, A) ──
  { id: 'dm_open', root: 'Dm', name: 'Dm', position: 'Open',
    frets: [3, 3, 2, 0, -1], fingers: [3, 4, 1, 0, 0], category: 'minor' },
    // F4, D4, A3, D3 ✓
  { id: 'dm_6th', root: 'Dm', name: 'Dm', position: '6th',
    frets: [7, 6, 7, 7, -1], baseFret: 6, fingers: [2, 1, 3, 4, 0], category: 'minor' },
    // A4, F4, D4, A3 ✓
  { id: 'dm_10th', root: 'Dm', name: 'Dm', position: '10th',
    frets: [10, 10, 10, 12, -1], baseFret: 10, fingers: [1, 1, 1, 3, 0], category: 'minor' },
    // C5, A4, F4, D4 ✓
  { id: 'dm_12th', root: 'Dm', name: 'Dm', position: '12th',
    frets: [15, 15, 14, 12, -1], baseFret: 12, fingers: [3, 4, 2, 1, 0], category: 'minor' },
    // F5, D5, A4, D4 ✓

  // ── Bm (B, D, F#) ──
  { id: 'bm_open', root: 'Bm', name: 'Bm', position: 'Open',
    frets: [4, 3, 4, 4, -1], fingers: [2, 1, 3, 4, 0], category: 'minor' },
    // F#4, D4, B3, F#3 ✓
  { id: 'bm_7th', root: 'Bm', name: 'Bm', position: '7th',
    frets: [9, 7, 7, 9, -1], baseFret: 7, fingers: [3, 1, 1, 4, 0], category: 'minor' },
    // B4, F#4, D4, B3 ✓
  { id: 'bm_9th', root: 'Bm', name: 'Bm', position: '9th',
    frets: [12, 12, 11, 9, -1], baseFret: 9, fingers: [3, 4, 2, 1, 0], category: 'minor' },
    // D5, B4, F#4, B3 ✓

  // ── Gm (G, Bb, D) ──
  { id: 'gm_open', root: 'Gm', name: 'Gm', position: 'Open',
    frets: [0, 3, 3, 0, 0], fingers: [0, 2, 3, 0, 0], category: 'minor' },
    // D4, D4, Bb3, D3, G4 ✓
  { id: 'gm_3rd', root: 'Gm', name: 'Gm', position: '3rd',
    frets: [5, 3, 3, 5, -1], baseFret: 3, fingers: [3, 1, 1, 4, 0], category: 'minor' },
    // G4, D4, Bb3, G3 ✓
  { id: 'gm_7th', root: 'Gm', name: 'Gm', position: '7th',
    frets: [8, 8, 7, 8, -1], baseFret: 7, fingers: [2, 3, 1, 4, 0], category: 'minor' },
    // Bb4, G4, D4, Bb3 ✓

  // ── Cm (C, Eb, G) ──
  { id: 'cm_open', root: 'Cm', name: 'Cm', position: 'Open',
    frets: [1, 1, 0, 1, -1], fingers: [2, 3, 0, 1, 0], category: 'minor' },
    // Eb4, C4, G3, Eb3 ✓
  { id: 'cm_4th', root: 'Cm', name: 'Cm', position: '4th',
    frets: [5, 4, 5, 5, -1], baseFret: 4, fingers: [2, 1, 3, 4, 0], category: 'minor' },
    // G4, Eb4, C4, G3 ✓
  { id: 'cm_8th', root: 'Cm', name: 'Cm', position: '8th',
    frets: [10, 8, 8, 10, -1], baseFret: 8, fingers: [3, 1, 1, 4, 0], category: 'minor' },
    // C5, G4, Eb4, C4 ✓

  // ═══════════════════════════════════════════════════════════════════════════
  // 7TH — root, major 3rd, perfect 5th, minor 7th
  // ═══════════════════════════════════════════════════════════════════════════

  // ── G7 (G, B, D, F) ──
  { id: 'g7_open', root: 'G7', name: 'G7', position: 'Open',
    frets: [3, 0, 0, 0, 0], fingers: [1, 0, 0, 0, 0], category: '7th' },
    // F4, B3, G3, D3, G4 ✓

  // ── D7 (D, F#, A, C) ──
  { id: 'd7_open', root: 'D7', name: 'D7', position: 'Open',
    frets: [4, 1, 2, 0, -1], fingers: [4, 1, 2, 0, 0], category: '7th' },
    // F#4, C4, A3, D3 ✓
  { id: 'd7_7th', root: 'D7', name: 'D7', position: '7th',
    frets: [10, 7, 7, 7, -1], baseFret: 7, fingers: [4, 1, 1, 1, 0], category: '7th' },
    // C5, F#4, D4, A3 ✓
  { id: 'd7_12th', root: 'D7', name: 'D7', position: '12th',
    frets: [12, 13, 14, 12, -1], baseFret: 12, fingers: [1, 2, 3, 1, 0], category: '7th' },
    // D5, C5, A4, D4 ✓ (no F#, but root+5th+7th is standard voicing)

  // ── C7 (C, E, G, Bb) ──
  { id: 'c7_open', root: 'C7', name: 'C7', position: 'Open',
    frets: [2, 1, 3, 2, -1], fingers: [2, 1, 4, 3, 0], category: '7th' },
    // E4, C4, Bb3, E3 ✓ (5th omitted, standard)
  { id: 'c7_5th', root: 'C7', name: 'C7', position: '5th',
    frets: [5, 5, 5, 8, -1], baseFret: 5, fingers: [1, 1, 1, 4, 0], category: '7th' },
    // G4, E4, C4, Bb3 ✓
  { id: 'c7_8th', root: 'C7', name: 'C7', position: '8th',
    frets: [8, 8, 9, 10, -1], baseFret: 8, fingers: [1, 1, 2, 3, 0], category: '7th' },
    // Bb4, G4, E4, C4 ✓

  // ── A7 (A, C#, E, G) ──
  { id: 'a7_open', root: 'A7', name: 'A7', position: 'Open',
    frets: [2, 2, 0, 2, -1], fingers: [2, 3, 0, 1, 0], category: '7th' },
    // E4, C#4, G3, E3 ✓ (root omitted, G is the 7th)
  { id: 'a7_5th', root: 'A7', name: 'A7', position: '5th',
    frets: [5, 5, 6, 7, -1], baseFret: 5, fingers: [1, 1, 2, 3, 0], category: '7th' },
    // G4, E4, C#4, A3 ✓

  // ── E7 (E, G#, B, D) ──
  { id: 'e7_open', root: 'E7', name: 'E7', position: 'Open',
    frets: [2, 0, 1, 0, -1], fingers: [2, 0, 1, 0, 0], category: '7th' },
    // E4, B3, G#3, D3 ✓
  { id: 'e7_7th', root: 'E7', name: 'E7', position: '7th',
    frets: [9, 9, 7, 9, -1], baseFret: 7, fingers: [2, 3, 1, 4, 0], category: '7th' },
    // B4, G#4, D4, B3 ✓
]

export const CHORD_MAP = new Map(CHORD_DIAGRAMS.map((c) => [c.id, c]))

// ─── Inversion Detection ──────────────────────────────────────────────────

const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
// Pitch order lowest→highest: S4(D3), S3(G3), S2(B3), S1(D4), S5(G4)
const PITCH_ORDER = [4, 3, 2, 1, 5]

/** Compute chord inversion based on the bass (lowest-pitched) note.
 *  Returns 'Root', '1st inv', '2nd inv', or '3rd inv' (7th chords). */
export function getChordInversion(chord: ChordDiagram): string {
  // Find bass note — first non-muted string in pitch order
  let bassString = 0, bassFret = 0
  for (const s of PITCH_ORDER) {
    const f = chord.frets[s - 1]
    if (f >= 0) { bassString = s; bassFret = f; break }
  }
  if (!bassString) return ''

  // Compute bass note (strip octave)
  const OPEN: Record<number, { note: string; octave: number }> = {
    1: { note: 'D', octave: 4 }, 2: { note: 'B', octave: 3 },
    3: { note: 'G', octave: 3 }, 4: { note: 'D', octave: 3 },
    5: { note: 'G', octave: 4 },
  }
  const open = OPEN[bassString]
  const baseIdx = CHROMATIC.indexOf(open.note)
  const bassNote = CHROMATIC[(baseIdx + bassFret) % 12]

  // Extract root letter: "G" → "G", "Em" → "E", "D7" → "D"
  const rootLetter = chord.root.replace(/[m7].*$/, '')
  const rootIdx = CHROMATIC.indexOf(rootLetter)
  if (rootIdx === -1) return ''

  const interval = ((CHROMATIC.indexOf(bassNote) - rootIdx) + 12) % 12

  if (interval === 0) return 'Root'
  const third = chord.category === 'minor' ? 3 : 4
  if (interval === third) return '1st inv'
  if (interval === 7) return '2nd inv'
  if (chord.category === '7th' && interval === 10) return '3rd inv'
  return ''
}

/** Get unique root names for a given category, in definition order */
export function getChordRoots(category: ChordCategory): string[] {
  const seen = new Set<string>()
  const roots: string[] = []
  for (const c of CHORD_DIAGRAMS) {
    if (c.category === category && !seen.has(c.root)) {
      seen.add(c.root)
      roots.push(c.root)
    }
  }
  return roots
}

/** Get all voicings for a root + category */
export function getChordVoicings(root: string, category: ChordCategory): ChordDiagram[] {
  return CHORD_DIAGRAMS.filter(c => c.category === category && c.root === root)
}

// Legacy — kept for curriculum.ts compatibility
export const CHORD_GROUPS: Record<string, ChordDiagram[]> = {
  g_major: CHORD_DIAGRAMS.filter(c => c.category === 'major' && c.root === 'G'),
  c_major: CHORD_DIAGRAMS.filter(c => c.category === 'major' && c.root === 'C'),
  d7: CHORD_DIAGRAMS.filter(c => c.category === '7th' && c.root === 'D7'),
}
