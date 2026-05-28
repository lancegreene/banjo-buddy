// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Concept Tag taxonomy
// Flat taxonomy of pedagogical concepts; replaces SKILLS[] DAG.
// Each library item carries 0-3 concept tags.
// ─────────────────────────────────────────────────────────────────────────────

import type { ConceptTag } from '../types/coach'

export const CONCEPT_TAGS: ConceptTag[] = [
  // Rolls
  { id: 'forward-roll', label: 'Forward Roll', description: 'T-I-M-T or T-M-T-I pattern, foundation of Scruggs style' },
  { id: 'backward-roll', label: 'Backward Roll', description: 'M-I-T-M or M-I-T-T descending pattern' },
  { id: 'alternating-thumb', label: 'Alternating Thumb', description: 'Thumb alternates between bass strings (4-2-3-1 type patterns)' },
  { id: 'forward-reverse', label: 'Forward-Reverse Roll', description: 'Hybrid pattern combining forward and reverse motion' },
  { id: 'foggy-mtn-roll', label: 'Foggy Mountain Roll', description: 'T-I-M-T-M-I-M-I — the signature Scruggs licks roll' },

  // Ornaments
  { id: 'pinch', label: 'Pinch', description: 'Two strings plucked simultaneously, typically T+M' },
  { id: 'hammer-on', label: 'Hammer-On', description: 'Fretting-hand articulation to sound a higher note' },
  { id: 'pull-off', label: 'Pull-Off', description: 'Fretting-hand articulation to sound a lower note' },
  { id: 'slide', label: 'Slide', description: 'Slur between fretted notes' },
  { id: 'choke', label: 'Choke', description: 'Bend at the choke position for blues-style expression' },

  // Phrasing
  { id: 'syncopation', label: 'Syncopation', description: 'Accent off the beat; characteristic of Scruggs phrasing' },
  { id: 'melodic-pivot', label: 'Melodic Pivot', description: 'Linear melody woven into the roll pattern' },
  { id: 'chord-melody', label: 'Chord-Melody', description: 'Single-note melody supported by partial chord shapes' },
  { id: 'drop-thumb', label: 'Drop Thumb', description: 'Thumb crosses to higher strings, e.g. 5th string in clawhammer' },

  // Positions
  { id: 'g-position', label: 'G Position', description: 'Open-G voicings and fingering shapes' },
  { id: 'd-position', label: 'D Position', description: 'D-shape voicings up the neck' },
  { id: 'c-position', label: 'C Position', description: 'C-shape voicings up the neck' },
  { id: 'f-shape', label: 'F Shape', description: 'F-shape closed voicings (barre + fingers)' },
  { id: 'barre', label: 'Barre Chords', description: 'Full-barre fretting across strings' },

  // Performance
  { id: 'fast-tempo-stamina', label: 'Fast-Tempo Stamina', description: 'Sustaining clean technique at 110+ bpm' },
]

export const CONCEPT_TAG_MAP: Record<string, ConceptTag> =
  Object.fromEntries(CONCEPT_TAGS.map(t => [t.id, t]))

export function getConceptTag(id: string): ConceptTag | undefined {
  return CONCEPT_TAG_MAP[id]
}
