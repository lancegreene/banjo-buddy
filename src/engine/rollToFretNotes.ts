// ─── rollToFretNotes — Convert a RollPattern to FretNote[] for FretboardDiagram ─
import type { RollPattern } from '../data/rollPatterns'
import type { FretNote } from '../data/fretboardNotes'
import { OPEN_STRINGS } from '../data/fretboardNotes'

const STRING_TO_FINGER: Record<number, 'T' | 'I' | 'M'> = {
  3: 'T', 4: 'T', 5: 'T',
  2: 'I',
  1: 'M',
}

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
