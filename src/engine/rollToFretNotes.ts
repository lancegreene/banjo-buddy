// ─── rollToFretNotes — Convert patterns/licks to FretNote[] for FretboardDiagram
import type { RollPattern } from '../data/rollPatterns'
import type { FretNote } from '../data/fretboardNotes'
import { OPEN_STRINGS } from '../data/fretboardNotes'
import type { ReferenceNote } from '../data/lickLibrary'

const STRING_TO_FINGER: Record<number, 'T' | 'I' | 'M'> = {
  3: 'T', 4: 'T', 5: 'T',
  2: 'I',
  1: 'M',
}

const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

/** Convert a roll pattern's string sequence into FretNote[] (open strings). */
export function rollPatternToFretNotes(pattern: RollPattern): FretNote[] {
  return pattern.strings
    .filter((s): s is number => s !== null)
    .map((s, i) => {
      const open = OPEN_STRINGS[s]
      return {
        string: s,
        fret: 0,
        note: `${open.note}${open.octave}`,
        finger: pattern.fingers?.[i] ?? STRING_TO_FINGER[s] ?? 'T',
      }
    })
}

/** Convert a note name + octave to a MIDI-like semitone number for comparison. */
function noteToSemitone(note: string, octave: number): number {
  return CHROMATIC.indexOf(note) + octave * 12
}

/** Find the best string + fret for a given note name and octave on the banjo. */
function findStringAndFret(note: string, octave: number): { string: number; fret: number } | null {
  const target = noteToSemitone(note, octave)
  let best: { string: number; fret: number; dist: number } | null = null

  for (const [sStr, open] of Object.entries(OPEN_STRINGS)) {
    const s = Number(sStr)
    const openSemi = noteToSemitone(open.note, open.octave)
    const fret = target - openSemi
    // String 5 starts at fret 5, so max reachable frets is fewer
    const maxFret = s === 5 ? 5 : 17
    if (fret < 0 || fret > maxFret) continue
    // Prefer lower fret positions
    if (!best || fret < best.dist) {
      best = { string: s, fret, dist: fret }
    }
  }
  return best ? { string: best.string, fret: best.fret } : null
}

/** Convert lick reference notes into FretNote[] for the fretboard diagram. */
export function lickToFretNotes(notes: ReferenceNote[]): FretNote[] {
  const result: FretNote[] = []
  for (const rn of notes) {
    const pos = findStringAndFret(rn.note, rn.octave)
    if (!pos) continue
    result.push({
      string: pos.string,
      fret: pos.fret,
      note: `${rn.note}${rn.octave}`,
      finger: STRING_TO_FINGER[pos.string] ?? 'T',
    })
  }
  return result
}
