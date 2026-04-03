// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Chord Diagram Definitions
// Standard 5-string banjo in open G tuning (gDGBD).
// frets array: index 0 = string 1, index 4 = string 5.
//   0 = open, -1 = muted/don't play, N = fret number
// fingers array: 1=index, 2=middle, 3=ring, 4=pinky, 0=none/open
// ─────────────────────────────────────────────────────────────────────────────

export interface ChordDiagram {
  id: string
  name: string
  frets: [number, number, number, number, number]   // strings 1-5
  fingers?: [number, number, number, number, number] // 0 = no label
  baseFret?: number  // fret the diagram starts at (default 1)
}

export const CHORD_DIAGRAMS: ChordDiagram[] = [
  {
    id: 'g_major',
    name: 'G',
    frets: [0, 0, 0, 0, 0],
    // Open G tuning — G chord is all open strings
  },
  {
    id: 'c_major',
    name: 'C',
    frets: [2, 1, 0, 2, 0],
    fingers: [3, 1, 0, 2, 0],
    // s1=fret2(E), s2=fret1(C), s3=open(G), s4=fret2(E), s5=open(g) → C major
  },
  {
    id: 'd7',
    name: 'D7',
    frets: [2, 1, 2, 0, -1],
    fingers: [3, 1, 2, 0, 0],
    // s1=fret2(E), s2=fret1(C), s3=fret2(A), s4=open(D), s5=muted → D7
  },
  {
    id: 'g7',
    name: 'G7',
    frets: [3, 0, 0, 0, 0],
    fingers: [1, 0, 0, 0, 0],
    // s1=fret3(F4), s2=open(B3), s3=open(G3), s4=open(D3), s5=open(G4) → G7 (G,B,D,F)
  },
]

export const CHORD_MAP = new Map(CHORD_DIAGRAMS.map((c) => [c.id, c]))

// Multiple voicings per chord root, ordered open → up the neck.
// Keys match the chordId values used in curriculum.ts.
export const CHORD_GROUPS: Record<string, ChordDiagram[]> = {
  g_major: [
    {
      id: 'g_open',
      name: 'G',
      frets: [0, 0, 0, 0, 0],
      // All open strings — G chord in open G tuning
    },
    {
      id: 'g_5th',
      name: 'G (5th)',
      frets: [5, 0, 7, 5, 0],
      baseFret: 5,
      fingers: [2, 0, 3, 1, 0],
      // s1=G4, s2=B3 open, s3=D4, s4=G3 — index on s4, middle on s1, ring on s3
    },
    {
      id: 'g_7th',
      name: 'G (7th)',
      frets: [9, 8, 7, 9, 0],
      baseFret: 7,
      fingers: [3, 2, 1, 4, 0],
      // s1=B4, s2=G4, s3=D4, s4=B3 — C-shape at 7th fret (advanced)
    },
  ],

  c_major: [
    {
      id: 'c_open',
      name: 'C',
      frets: [2, 1, 0, 2, 0],
      fingers: [3, 1, 0, 2, 0],
      // s1=E4, s2=C4, s3=G3 open, s4=E3, s5=G4 open
    },
    {
      id: 'c_5th',
      name: 'C (5th)',
      frets: [5, 5, 5, 5, -1],
      baseFret: 5,
      fingers: [1, 1, 1, 1, 0],
      // Full barre at 5th: s1=G4, s2=E4, s3=C4, s4=G3 — G-shape barre
    },
    {
      id: 'c_12th',
      name: 'C (12th)',
      frets: [14, 13, 12, 14, -1],
      baseFret: 12,
      fingers: [4, 2, 1, 3, 0],
      // s1=E5, s2=C5, s3=G4, s4=E4 — open C shape an octave up
    },
  ],

  d7: [
    {
      id: 'd7_open',
      name: 'D7',
      frets: [2, 1, 2, 0, -1],
      fingers: [3, 1, 2, 0, 0],
      // s1=E4, s2=C4, s3=A3, s4=D3 open — standard D7
    },
    {
      id: 'd7_7th',
      name: 'D7 (7th)',
      frets: [10, 7, 7, 7, -1],
      baseFret: 7,
      fingers: [4, 1, 1, 1, 0],
      // s1=C5, s2=F#4, s3=D4, s4=A3 — barre at 7th with pinky on s1
    },
    {
      id: 'd7_12th',
      name: 'D7 (12th)',
      frets: [14, 13, 14, 12, -1],
      baseFret: 12,
      fingers: [4, 2, 3, 1, 0],
      // s1=E5, s2=C5, s3=A4, s4=D4 — open D7 shape at 12th
    },
  ],
}
