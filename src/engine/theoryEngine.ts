// Banjo Buddy — Music Theory Engine (tonal wrapper)
// Lazy-loaded chord detection, scale identification, interval naming.

let tonalModule: typeof import('tonal') | null = null

async function getTonal() {
  if (tonalModule) return tonalModule
  tonalModule = await import('tonal')
  return tonalModule
}

export interface ChordDetection {
  name: string           // e.g. "G major"
  symbol: string         // e.g. "G"
  notes: string[]        // e.g. ["G", "B", "D"]
  quality: string        // e.g. "Major"
}

export interface ScaleDetection {
  name: string           // e.g. "G major"
  notes: string[]
  type: string           // e.g. "major"
}

export async function detectChord(pitches: string[]): Promise<ChordDetection | null> {
  const tonal = await getTonal()
  const detected = tonal.Chord.detect(pitches)
  if (detected.length === 0) return null

  const chordName = detected[0]
  const chord = tonal.Chord.get(chordName)

  return {
    name: chord.name || chordName,
    symbol: chord.symbol || chordName,
    notes: chord.notes,
    quality: chord.quality || 'unknown',
  }
}

export async function detectScale(pitches: string[]): Promise<ScaleDetection[]> {
  const tonal = await getTonal()
  const detected = tonal.Scale.detect(pitches)

  return detected.slice(0, 3).map((scaleName) => {
    const scale = tonal.Scale.get(scaleName)
    return {
      name: scale.name || scaleName,
      notes: scale.notes,
      type: scale.type || 'unknown',
    }
  })
}

export async function getInterval(note1: string, note2: string): Promise<string> {
  const tonal = await getTonal()
  return tonal.Interval.distance(note1, note2)
}

export async function getChordNotes(chordSymbol: string): Promise<string[]> {
  const tonal = await getTonal()
  const chord = tonal.Chord.get(chordSymbol)
  return chord.notes
}

export async function getNoteFrequency(note: string): Promise<number | null> {
  const tonal = await getTonal()
  const freq = tonal.Note.freq(note)
  return freq ?? null
}
