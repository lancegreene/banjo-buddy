// ─── tabParser — Convert text tablature to FretNote[] ───────────────────────
//
// Parses standard 5-string banjo text tab format into structured note sequences.
//
// Supported formats:
//   D|---0---2---|    (note name labels)
//   B|-----0-----|
//   G|-0---------|
//   D|-----------|
//   g|-------0---|
//
//   1|---0---2---|    (string number labels)
//   2|-----0-----|
//   3|-0---------|
//   4|-----------|
//   5|-------0---|
//
// The parser reads columns left-to-right, collecting all fret numbers at each
// beat position across all 5 strings, then outputs them as a time-ordered
// FretNote[] array.

import { type FretNote, getNoteAtFret } from '../data/fretboardNotes'

// ─── String label mapping ───────────────────────────────────────────────────

// Map various label formats to banjo string numbers (1-5)
const LABEL_TO_STRING: Record<string, number> = {
  // Note-based labels (most common in banjo tabs)
  // Looking down: 1=D4(top), 2=B3, 3=G3, 4=D3(bottom long), 5=g4(short drone)
  // But tabs are typically written with string 1 at bottom
  '1': 1, '2': 2, '3': 3, '4': 4, '5': 5,
  // Note name labels — case-sensitive: uppercase D = string 1, lowercase d = string 4
  'D': 1, 'B': 2, 'G': 3,  // Uppercase = higher-pitched strings
  'e': 1,  // Alternative label for string 1
  'd': 4,  // lowercase d = string 4 (D3, low D)
  'g': 5,  // lowercase g = string 5 (G4, short drone)
  // Full note labels
  'D4': 1, 'B3': 2, 'G3': 3, 'D3': 4, 'G4': 5,
}

// ─── Finger assignment ──────────────────────────────────────────────────────

function assignFinger(str: number): 'T' | 'I' | 'M' {
  if (str >= 3) return 'T'  // Strings 3, 4, 5 = Thumb
  if (str === 2) return 'I' // String 2 = Index
  return 'M'                // String 1 = Middle
}

// ─── Line parsing ───────────────────────────────────────────────────────────

interface ParsedLine {
  stringNum: number
  content: string  // The part after the label/pipe
}

/**
 * Try to parse a line as a tab line.
 * Returns the string number and content, or null if not a tab line.
 */
function parseTabLine(line: string): ParsedLine | null {
  // Trim whitespace
  line = line.trim()
  if (!line) return null

  // Match patterns like:  "D|---0---|"  or  "1|---0---|"  or  "G3|---0---|"
  // Also handle:  "D :---0---|"  or  "D  ---0---|" (colon or space separator)
  const match = line.match(/^([A-Ga-g][#b]?\d?)\s*[|:]\s*(.+)$/)
    || line.match(/^(\d)\s*[|:]\s*(.+)$/)

  if (!match) return null

  const label = match[1].trim()
  const content = match[2]

  const stringNum = LABEL_TO_STRING[label]
  if (!stringNum) return null

  return { stringNum, content }
}

// ─── Main parser ────────────────────────────────────────────────────────────

export interface ParseResult {
  notes: FretNote[]
  warnings: string[]
  lineCount: number
}

/**
 * Parse a block of text tablature into a FretNote[] sequence.
 *
 * The parser:
 * 1. Identifies tab lines by their string label prefix
 * 2. Groups consecutive tab lines into "staves" (groups of 5 lines)
 * 3. Reads each column position left-to-right within each stave
 * 4. Extracts fret numbers (0-24) at each position
 * 5. Orders notes by time position, then outputs as FretNote[]
 */
export function parseTab(text: string): ParseResult {
  const warnings: string[] = []
  const lines = text.split('\n')

  // Step 1: Find all tab lines and group them into staves
  const staves: ParsedLine[][] = []
  let currentStave: ParsedLine[] = []
  let lastWasTab = false

  for (const line of lines) {
    const parsed = parseTabLine(line)
    if (parsed) {
      // Check for duplicate string in current stave
      if (currentStave.some((l) => l.stringNum === parsed.stringNum)) {
        // Start a new stave
        if (currentStave.length > 0) staves.push(currentStave)
        currentStave = []
      }
      currentStave.push(parsed)
      lastWasTab = true
    } else {
      if (lastWasTab && currentStave.length > 0) {
        staves.push(currentStave)
        currentStave = []
      }
      lastWasTab = false
    }
  }
  if (currentStave.length > 0) staves.push(currentStave)

  if (staves.length === 0) {
    return { notes: [], warnings: ['No valid tab lines found. Expected format: D|---0---|'], lineCount: 0 }
  }

  // Step 2: For each stave, read columns to extract notes
  const allNotes: FretNote[] = []

  for (const stave of staves) {
    // Find the longest content line to know how many columns
    const maxLen = Math.max(...stave.map((l) => l.content.length))

    // Scan each column position
    let col = 0
    while (col < maxLen) {
      const notesAtBeat: FretNote[] = []

      for (const line of stave) {
        const ch = col < line.content.length ? line.content[col] : '-'

        if (ch >= '0' && ch <= '9') {
          // Check for two-digit fret numbers (10-24)
          let fretStr = ch
          if (col + 1 < line.content.length) {
            const next = line.content[col + 1]
            if (next >= '0' && next <= '9') {
              fretStr += next
            }
          }
          const fret = parseInt(fretStr, 10)
          if (fret <= 24) {
            notesAtBeat.push({
              string: line.stringNum,
              fret,
              note: getNoteAtFret(line.stringNum, fret),
              finger: assignFinger(line.stringNum),
            })
          }
        }
      }

      // If we found notes at this column, add them
      // (For simultaneous notes on multiple strings, add in string order)
      if (notesAtBeat.length > 0) {
        // Sort by string number for consistent ordering (thumb strings first)
        notesAtBeat.sort((a, b) => b.string - a.string)
        allNotes.push(...notesAtBeat)
      }

      // Skip past two-digit fret numbers
      let maxDigits = 1
      for (const line of stave) {
        if (col < line.content.length && col + 1 < line.content.length) {
          const ch = line.content[col]
          const next = line.content[col + 1]
          if (ch >= '0' && ch <= '9' && next >= '0' && next <= '9') {
            maxDigits = 2
          }
        }
      }
      col += maxDigits
    }
  }

  // Validation
  const stringsSeen = new Set(staves.flatMap((s) => s.map((l) => l.stringNum)))
  if (stringsSeen.size < 5) {
    const missing = [1, 2, 3, 4, 5].filter((s) => !stringsSeen.has(s))
    warnings.push(`Missing string${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}`)
  }

  const lineCount = staves.reduce((sum, s) => sum + s.length, 0)

  return { notes: allNotes, warnings, lineCount }
}

// ─── Reverse conversion: notes → tab text ────────────────────────────────────

const STRING_LABELS: Record<number, string> = { 1: 'D', 2: 'B', 3: 'G', 4: 'd', 5: 'g' }

/**
 * Convert a FretNote[] back into standard tab text.
 * Each note gets a column with 4 dashes of spacing between notes.
 */
export function notesToTabText(notes: FretNote[]): string {
  if (notes.length === 0) return ''

  const SPACING = 4  // dashes between note columns
  const strings = [1, 2, 3, 4, 5] as const
  const lines: Record<number, string> = {}
  for (const s of strings) lines[s] = ''

  for (let i = 0; i < notes.length; i++) {
    const note = notes[i]
    const fretStr = String(note.fret)
    // For each string, write the fret number or dashes
    for (const s of strings) {
      if (s === note.string) {
        lines[s] += fretStr
      } else {
        lines[s] += '-'.repeat(fretStr.length)
      }
    }
    // Add spacing after (except last note)
    if (i < notes.length - 1) {
      for (const s of strings) lines[s] += '-'.repeat(SPACING)
    }
  }

  // Add measure bars at start/end
  return strings
    .map((s) => `${STRING_LABELS[s]}|${lines[s]}|`)
    .join('\n')
}

/**
 * Detect if text looks like it contains tablature.
 */
export function looksLikeTab(text: string): boolean {
  const lines = text.split('\n')
  let tabLineCount = 0
  for (const line of lines) {
    if (parseTabLine(line)) tabLineCount++
  }
  return tabLineCount >= 3
}
