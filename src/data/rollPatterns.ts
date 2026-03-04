// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Roll Pattern Definitions
// Static data. string numbers 1-5, null = wildcard (any string).
// ─────────────────────────────────────────────────────────────────────────────

export interface RollPattern {
  id: string
  name: string
  strings: (number | null)[]  // Expected string sequence (length = one full roll)
  fingers?: ('T' | 'I' | 'M')[]  // Explicit finger labels; if absent, derived automatically
  description: string
}

export const ROLL_PATTERNS: RollPattern[] = [
  {
    id: 'forward_roll',
    name: 'Forward Roll',
    strings: [3, 2, 1, 5, 3, 1, 5, 1],
    fingers: ['T', 'I', 'M', 'T', 'I', 'M', 'T', 'M'],
    description: 'Classic Scruggs T-I-M roll: 3-2-1-5 cycling pattern',
  },
  {
    id: 'forward_roll_alt',
    name: 'Forward Roll 2',
    strings: [3, 1, 5, 3, 1, 5, 3, 1],
    fingers: ['T', 'M', 'T', 'I', 'M', 'T', 'I', 'M'],
    description: 'Forward Roll variation: T-M-T-I-M cycling with drone string',
  },
  {
    id: 'alternating_thumb',
    name: 'Alternating Thumb Roll',
    strings: [3, 1, 3, 1, 3, 1, 3, 1],
    description: 'Third string (thumb) alternating with first string — T I T M pattern',
  },
  {
    id: 'backward_roll',
    name: 'Backward Roll',
    strings: [1, 2, 3, 1, 2, 3, 1, 2],
    description: 'I M T cycling: 1st-2nd-3rd string repeating',
  },
  {
    id: 'mixed_roll',
    name: 'Foggy Mountain Roll',
    strings: [5, 5, 1, 2, 5, 1, 2, 1],
    description: 'T-T-I-M-T-I-M-I — signature Foggy Mountain Breakdown roll, double thumb at start',
  },
  {
    id: 'square_roll',
    name: 'Square Roll',
    strings: [5, 1, 2, 1, 5, 1, 2, 1],
    description: 'Square roll — thumb alternates with a two-finger pattern',
  },
]

export const ROLL_MAP = new Map(ROLL_PATTERNS.map((r) => [r.id, r]))
