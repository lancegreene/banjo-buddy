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

import { type FretNote, type TabMeta, type NoteDuration, getNoteAtFret } from '../data/fretboardNotes'

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
  meta?: TabMeta
}

// ─── Technique detection helpers ─────────────────────────────────────────────

const TECHNIQUE_CHARS: Record<string, 'hammer' | 'pull' | 'slide'> = {
  'h': 'hammer',
  'p': 'pull',
  '/': 'slide',
  '\\': 'slide',
  's': 'slide',
}

/**
 * Read a fret number starting at position `col` in `content`.
 * Returns the fret number and how many characters it consumed, or null.
 */
function readFret(content: string, col: number): { fret: number; len: number } | null {
  if (col >= content.length) return null
  const ch = content[col]
  if (ch < '0' || ch > '9') return null

  let fretStr = ch
  if (col + 1 < content.length) {
    const next = content[col + 1]
    if (next >= '0' && next <= '9') {
      fretStr += next
    }
  }
  const fret = parseInt(fretStr, 10)
  if (fret > 24) return null
  return { fret, len: fretStr.length }
}

/**
 * Starting after a fret number at `col`, check if there's a technique marker
 * followed by a destination fret (e.g., "h2", "p0", "/4", "\2", "s5").
 * Returns the technique, destination fret, and total chars consumed, or null.
 */
function readTechnique(content: string, col: number): {
  technique: 'hammer' | 'pull' | 'slide'
  slideToFret: number
  len: number
} | null {
  if (col >= content.length) return null
  const marker = content[col]
  const technique = TECHNIQUE_CHARS[marker]
  if (!technique) return null

  const destFret = readFret(content, col + 1)
  if (!destFret) return null

  return { technique, slideToFret: destFret.fret, len: 1 + destFret.len }
}

/**
 * Parse a block of text tablature into a FretNote[] sequence.
 *
 * The parser:
 * 1. Identifies tab lines by their string label prefix
 * 2. Groups consecutive tab lines into "staves" (groups of 5 lines)
 * 3. Reads each column position left-to-right within each stave
 * 4. Extracts fret numbers (0-24) with optional technique markers (h/p/s/\)
 * 5. Groups simultaneous notes (same column across strings) with shared group IDs
 * 6. Orders notes by time position, then outputs as FretNote[]
 *
 * Technique notation:
 *   0h2 = hammer-on from fret 0 to fret 2
 *   2p0 = pull-off from fret 2 to fret 0
 *   2/4 or 2s4 = slide up from fret 2 to fret 4
 *   4\2 = slide down from fret 4 to fret 2
 *
 * Simultaneous notes (pinches):
 *   When multiple strings have fret numbers at the same column, they're grouped
 *   with a shared group ID.
 */
export function parseTab(text: string): ParseResult {
  const warnings: string[] = []
  const rawLines = text.split('\n')
  const meta: TabMeta = {}

  // Pre-scan for metadata lines before parsing tab
  const lines: string[] = []
  for (const line of rawLines) {
    const trimmed = line.trim()

    // Time signature: "4/4", "3/4", or "Time: 4/4"
    const tsMatch = trimmed.match(/^(?:time\s*[:=]\s*)?(\d)\/(\d)\s*$/i)
    if (tsMatch && !meta.timeSignature) {
      meta.timeSignature = [parseInt(tsMatch[1]), parseInt(tsMatch[2])]
      continue
    }

    // BPM: "BPM: 120", "Tempo: 100", "120 BPM"
    const bpmMatch = trimmed.match(/^(?:bpm|tempo)\s*[:=]\s*(\d+)\s*$/i)
      || trimmed.match(/^(\d+)\s*bpm\s*$/i)
    if (bpmMatch && !meta.bpm) {
      meta.bpm = parseInt(bpmMatch[1])
      continue
    }

    // Capo: "Capo: 2", "Capo 2"
    const capoMatch = trimmed.match(/^capo\s*[:=]?\s*(\d+)\s*$/i)
    if (capoMatch && !meta.capo) {
      meta.capo = parseInt(capoMatch[1])
      continue
    }

    // Title: "Title: Cripple Creek" (first occurrence only)
    const titleMatch = trimmed.match(/^title\s*[:=]\s*(.+)$/i)
    if (titleMatch && !meta.title) {
      meta.title = titleMatch[1].trim()
      continue
    }

    lines.push(line)
  }

  // Step 1: Find all tab lines and group them into staves
  // Also collect finger rows (T/I/M) and duration rows (W/H/Q/E/S)
  const staves: ParsedLine[][] = []
  const fingerRows: string[] = []   // raw content of finger annotation rows
  const durationRows: string[] = [] // raw content of duration annotation rows
  let currentStave: ParsedLine[] = []
  let lastWasTab = false

  for (const line of lines) {
    const trimmed = line.trim()

    // Finger row: starts with a finger label prefix or contains only T/I/M/-/| chars
    const fingerMatch = trimmed.match(/^(?:pick|finger|[TIM])\s*[|:]\s*(.+)$/i)
    if (fingerMatch) {
      fingerRows.push(fingerMatch[1])
      continue
    }

    // Duration row: starts with "dur" or "rhythm" label
    const durMatch = trimmed.match(/^(?:dur|rhythm|len)\s*[|:]\s*(.+)$/i)
    if (durMatch) {
      durationRows.push(durMatch[1])
      continue
    }

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
  let nextGroupId = 1

  for (const stave of staves) {
    // Find the longest content line to know how many columns
    const maxLen = Math.max(...stave.map((l) => l.content.length))

    // Track how far each line has been consumed (to handle variable-width tokens like "10h12")
    const linePos = new Map<number, number>()
    for (const line of stave) linePos.set(line.stringNum, 0)

    // Scan each column position
    let col = 0
    while (col < maxLen) {
      const notesAtBeat: FretNote[] = []
      let maxAdvance = 1

      for (const line of stave) {
        // Only process this line if it hasn't been consumed past this column
        const pos = linePos.get(line.stringNum) ?? 0
        if (pos > col) continue

        const fretResult = readFret(line.content, col)
        if (!fretResult) continue

        let advance = fretResult.len
        const note: FretNote = {
          string: line.stringNum,
          fret: fretResult.fret,
          note: getNoteAtFret(line.stringNum, fretResult.fret),
          finger: assignFinger(line.stringNum),
        }

        // Check for technique marker after the fret number
        const techResult = readTechnique(line.content, col + fretResult.len)
        if (techResult) {
          note.technique = techResult.technique
          note.slideToFret = techResult.slideToFret
          advance += techResult.len
        }

        notesAtBeat.push(note)
        linePos.set(line.stringNum, col + advance)
        if (advance > maxAdvance) maxAdvance = advance
      }

      // If we found notes at this column, add them
      if (notesAtBeat.length > 0) {
        // Sort by string number for consistent ordering (thumb strings first)
        notesAtBeat.sort((a, b) => b.string - a.string)

        // Assign group ID if multiple notes are simultaneous (pinch)
        if (notesAtBeat.length > 1) {
          const groupId = nextGroupId++
          for (const n of notesAtBeat) n.group = groupId
        }

        allNotes.push(...notesAtBeat)
      }

      col += maxAdvance
    }
  }

  // Step 3: Apply finger annotations from finger rows
  if (fingerRows.length > 0) {
    // Parse finger row: extract T/I/M characters at each note position
    const fingerChars: ('T' | 'I' | 'M')[] = []
    for (const row of fingerRows) {
      for (const ch of row) {
        if (ch === 'T' || ch === 'I' || ch === 'M') fingerChars.push(ch)
      }
    }
    // Apply to notes in order (skip grouped duplicates)
    const appliedGroups = new Set<number>()
    let fi = 0
    for (const note of allNotes) {
      if (note.group != null && appliedGroups.has(note.group)) continue
      if (note.group != null) appliedGroups.add(note.group)
      if (fi < fingerChars.length) {
        note.finger = fingerChars[fi]
        fi++
      }
    }
  }

  // Step 4: Apply duration annotations from duration rows
  if (durationRows.length > 0) {
    const DURATION_MAP: Record<string, NoteDuration> = {
      'w': 'whole', 'W': 'whole',
      'h': 'half', 'H': 'half',
      'q': 'quarter', 'Q': 'quarter',
      'e': 'eighth', 'E': 'eighth',
      's': 'sixteenth', 'S': 'sixteenth',
    }
    const durations: NoteDuration[] = []
    for (const row of durationRows) {
      for (const ch of row) {
        if (DURATION_MAP[ch]) durations.push(DURATION_MAP[ch])
      }
    }
    const appliedGroups = new Set<number>()
    let di = 0
    for (const note of allNotes) {
      if (note.group != null && appliedGroups.has(note.group)) continue
      if (note.group != null) appliedGroups.add(note.group)
      if (di < durations.length) {
        note.duration = durations[di]
        di++
      }
    }
  }

  // Validation
  const stringsSeen = new Set(staves.flatMap((s) => s.map((l) => l.stringNum)))
  if (stringsSeen.size < 5) {
    const missing = [1, 2, 3, 4, 5].filter((s) => !stringsSeen.has(s))
    warnings.push(`Missing string${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}`)
  }

  const lineCount = staves.reduce((sum, s) => sum + s.length, 0)
  const hasMeta = meta.timeSignature || meta.bpm || meta.capo || meta.title

  return { notes: allNotes, warnings, lineCount, ...(hasMeta ? { meta } : {}) }
}

// ─── Reverse conversion: notes → tab text ────────────────────────────────────

const STRING_LABELS: Record<number, string> = { 1: 'D', 2: 'B', 3: 'G', 4: 'd', 5: 'g' }

const TECHNIQUE_TO_CHAR: Record<string, string> = {
  hammer: 'h',
  pull: 'p',
  slide: '/',
}

/**
 * Convert a FretNote[] back into standard tab text.
 * Handles technique markers (h/p/s), simultaneous notes (groups), and two-digit frets.
 */
export function notesToTabText(notes: FretNote[]): string {
  if (notes.length === 0) return ''

  const SPACING = 4
  const strings = [1, 2, 3, 4, 5] as const
  const lines: Record<number, string> = {}
  for (const s of strings) lines[s] = ''

  // Group simultaneous notes by their group ID
  // Process notes in order, but emit grouped notes together in one column
  const emittedGroups = new Set<number>()
  let i = 0

  while (i < notes.length) {
    const note = notes[i]

    // Collect all notes in this beat (same group, or single note)
    const beatNotes: FretNote[] = []
    if (note.group != null && !emittedGroups.has(note.group)) {
      // Gather all notes with this group ID
      emittedGroups.add(note.group)
      for (let j = i; j < notes.length; j++) {
        if (notes[j].group === note.group) beatNotes.push(notes[j])
      }
    } else if (note.group != null && emittedGroups.has(note.group)) {
      // Already emitted as part of a group, skip
      i++
      continue
    } else {
      beatNotes.push(note)
    }

    // Build the token for each string at this beat
    // Find the longest token to pad others
    const tokens: Record<number, string> = {}
    for (const s of strings) tokens[s] = ''

    for (const bn of beatNotes) {
      let token = String(bn.fret)
      if (bn.technique && bn.slideToFret != null) {
        token += (TECHNIQUE_TO_CHAR[bn.technique] || '/') + String(bn.slideToFret)
      }
      tokens[bn.string] = token
    }

    const maxTokenLen = Math.max(1, ...Object.values(tokens).map((t) => t.length))

    for (const s of strings) {
      if (tokens[s]) {
        lines[s] += tokens[s] + '-'.repeat(maxTokenLen - tokens[s].length)
      } else {
        lines[s] += '-'.repeat(maxTokenLen)
      }
    }

    // Check if there are more notes to emit
    const hasMore = (() => {
      for (let j = i + 1; j < notes.length; j++) {
        if (notes[j].group == null || !emittedGroups.has(notes[j].group)) return true
      }
      return false
    })()

    if (hasMore) {
      for (const s of strings) lines[s] += '-'.repeat(SPACING)
    }

    i++
  }

  // Build finger row if any non-default fingers exist
  const defaultFinger = (str: number) => str >= 3 ? 'T' : str === 2 ? 'I' : 'M'
  const hasNonDefaultFingers = notes.some((n) => n.finger && n.finger !== defaultFinger(n.string))

  let fingerLine = ''
  if (hasNonDefaultFingers) {
    const emittedGroups2 = new Set<number>()
    let j = 0
    while (j < notes.length) {
      const n = notes[j]
      if (n.group != null && emittedGroups2.has(n.group)) { j++; continue }
      if (n.group != null) emittedGroups2.add(n.group)
      fingerLine += n.finger || defaultFinger(n.string)

      // Check for more
      let hasMore2 = false
      for (let k = j + 1; k < notes.length; k++) {
        if (notes[k].group == null || !emittedGroups2.has(notes[k].group)) { hasMore2 = true; break }
      }
      if (hasMore2) fingerLine += '-'.repeat(SPACING)
      j++
    }
  }

  // Build duration row if any non-eighth durations exist
  const hasNonDefaultDuration = notes.some((n) => n.duration && n.duration !== 'eighth')
  let durLine = ''
  if (hasNonDefaultDuration) {
    const DUR_CHAR: Record<string, string> = { whole: 'W', half: 'H', quarter: 'Q', eighth: 'E', sixteenth: 'S' }
    const emittedGroups3 = new Set<number>()
    let j = 0
    while (j < notes.length) {
      const n = notes[j]
      if (n.group != null && emittedGroups3.has(n.group)) { j++; continue }
      if (n.group != null) emittedGroups3.add(n.group)
      durLine += DUR_CHAR[n.duration || 'eighth'] || 'E'

      let hasMore3 = false
      for (let k = j + 1; k < notes.length; k++) {
        if (notes[k].group == null || !emittedGroups3.has(notes[k].group)) { hasMore3 = true; break }
      }
      if (hasMore3) durLine += '-'.repeat(SPACING)
      j++
    }
  }

  let result = strings
    .map((s) => `${STRING_LABELS[s]}|${lines[s]}|`)
    .join('\n')

  if (hasNonDefaultFingers) result += `\n |${fingerLine}|`
  if (hasNonDefaultDuration) result += `\ndur|${durLine}|`

  return result
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
