// ─── Fretboard Note Map — 5-String Banjo in Open G Tuning ───────────────────
//
// Oriented as "looking down at your own banjo" (player's perspective):
//   Left side = String 4 (D3, closest to player's face)
//   Right side = String 1 (D4, furthest from player)
//   String 5 (G4, short drone) starts at fret 5, on the far left
//
// Standard Open G: gDGBD (5-4-3-2-1)

export type NoteDuration = 'whole' | 'half' | 'quarter' | 'eighth' | 'sixteenth'

export interface FretNote {
  string: number   // 1-5
  fret: number     // 0 = open, 1-22
  note: string     // e.g. "D4", "G3"
  finger?: 'T' | 'I' | 'M'
  technique?: 'hammer' | 'pull' | 'slide'
  slideToFret?: number   // destination fret for slides, hammer-ons, and pull-offs
  group?: number         // simultaneous notes share a group ID (pinch = thumb + finger together)
  duration?: NoteDuration  // note length — default 'eighth' for Scruggs-style
  rest?: boolean          // true = rest (silence), fret/string are ignored
}

/** Metadata for a tab sequence — time signature, tempo, etc. */
export interface TabMeta {
  timeSignature?: [number, number]  // [beats, beatUnit] e.g. [4, 4] for 4/4
  bpm?: number                      // suggested tempo
  title?: string
  capo?: number
}

// Open string tuning
export const OPEN_STRINGS: Record<number, { note: string; octave: number; freq: number }> = {
  1: { note: 'D', octave: 4, freq: 293.66 },
  2: { note: 'B', octave: 3, freq: 246.94 },
  3: { note: 'G', octave: 3, freq: 196.00 },
  4: { note: 'D', octave: 3, freq: 146.83 },
  5: { note: 'G', octave: 4, freq: 392.00 },
}

// Note names in chromatic order
const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

/** Get the note name at a given string and fret */
export function getNoteAtFret(string: number, fret: number): string {
  const open = OPEN_STRINGS[string]
  if (!open) return '?'
  const baseIdx = CHROMATIC.indexOf(open.note)
  const semitones = fret
  const noteIdx = (baseIdx + semitones) % 12
  const octaveShift = Math.floor((baseIdx + semitones) / 12)
  return `${CHROMATIC[noteIdx]}${open.octave + octaveShift}`
}

/** Standard fret dot positions */
export const FRET_DOTS = [3, 5, 7, 10, 12, 15, 17, 19]
export const DOUBLE_DOTS = [12] // double dot at 12th fret

/** Number of frets to display */
export const TOTAL_FRETS = 17

/** String 5 starts at fret 5 (short drone string) */
export const STRING_5_START_FRET = 5

// ─── Example Song Sequences ─────────────────────────────────────────────────

/** Forward roll pattern (open strings) */
export const EXAMPLE_FORWARD_ROLL: FretNote[] = [
  { string: 3, fret: 0, note: 'G3', finger: 'T' },
  { string: 2, fret: 0, note: 'B3', finger: 'I' },
  { string: 1, fret: 0, note: 'D4', finger: 'M' },
  { string: 5, fret: 0, note: 'G4', finger: 'T' },
  { string: 3, fret: 0, note: 'G3', finger: 'T' },
  { string: 1, fret: 0, note: 'D4', finger: 'M' },
  { string: 5, fret: 0, note: 'G4', finger: 'T' },
  { string: 1, fret: 0, note: 'D4', finger: 'M' },
]

/** Cripple Creek intro lick (simplified) */
export const EXAMPLE_CRIPPLE_CREEK: FretNote[] = [
  { string: 3, fret: 0, note: 'G3', finger: 'T' },
  { string: 3, fret: 2, note: 'A3', finger: 'T' },  // hammer-on
  { string: 2, fret: 0, note: 'B3', finger: 'I' },
  { string: 1, fret: 0, note: 'D4', finger: 'M' },
  { string: 5, fret: 0, note: 'G4', finger: 'T' },
  { string: 2, fret: 0, note: 'B3', finger: 'I' },
  { string: 1, fret: 2, note: 'E4', finger: 'M' },  // 2nd fret
  { string: 1, fret: 0, note: 'D4', finger: 'M' },
  // 2nd measure
  { string: 3, fret: 0, note: 'G3', finger: 'T' },
  { string: 3, fret: 2, note: 'A3', finger: 'T' },
  { string: 2, fret: 0, note: 'B3', finger: 'I' },
  { string: 1, fret: 0, note: 'D4', finger: 'M' },
  { string: 5, fret: 0, note: 'G4', finger: 'T' },
  { string: 2, fret: 0, note: 'B3', finger: 'I' },
  { string: 3, fret: 0, note: 'G3', finger: 'T' },
  { string: 1, fret: 0, note: 'D4', finger: 'M' },
]

/** Foggy Mountain Breakdown opening (first 8 notes) */
export const EXAMPLE_FOGGY_MOUNTAIN: FretNote[] = [
  { string: 3, fret: 0, note: 'G3', finger: 'T' },
  { string: 2, fret: 1, note: 'C4', finger: 'I' },  // 1st fret
  { string: 1, fret: 0, note: 'D4', finger: 'M' },
  { string: 5, fret: 0, note: 'G4', finger: 'T' },
  { string: 1, fret: 0, note: 'D4', finger: 'M' },
  { string: 2, fret: 1, note: 'C4', finger: 'I' },
  { string: 3, fret: 0, note: 'G3', finger: 'T' },
  { string: 4, fret: 0, note: 'D3', finger: 'T' },
]
