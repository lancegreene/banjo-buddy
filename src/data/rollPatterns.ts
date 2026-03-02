// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Roll Pattern Definitions
// Static data. string numbers 1-5, null = wildcard (any string).
// ─────────────────────────────────────────────────────────────────────────────

export interface RollPattern {
  id: string
  name: string
  strings: (number | null)[]  // Expected string sequence (length = one full roll)
  description: string
}

export const ROLL_PATTERNS: RollPattern[] = [
  {
    id: 'forward_roll',
    name: 'Forward Roll',
    strings: [5, 1, 2, 3, 1, 2, 1, 2],
    description: 'Classic Scruggs roll: thumb on 5th, then ascending index-middle pattern',
  },
  {
    id: 'forward_roll_alt',
    name: 'Forward Roll (alt)',
    strings: [5, 1, 2, 5, 1, 2, 1, 2],
    description: 'Alternating thumb variation of the forward roll',
  },
  {
    id: 'alternating_thumb',
    name: 'Alternating Thumb Roll',
    strings: [5, 1, 5, 1, 5, 1, 5, 1],
    description: 'Fifth string alternating with first string — very common in bluegrass',
  },
  {
    id: 'alternating_thumb_3',
    name: 'Alternating Thumb (3rd)',
    strings: [3, 1, 3, 1, 3, 1, 3, 1],
    description: 'Third string alternating with first string',
  },
  {
    id: 'backward_roll',
    name: 'Backward Roll',
    strings: [1, 2, 5, 1, 2, 5, 1, 2],
    description: 'Reverse of forward roll — descending then repeating',
  },
  {
    id: 'mixed_roll',
    name: 'Mixed Roll',
    strings: [5, 1, 2, 1, 5, 1, 2, 1],
    description: 'Mixed forward-backward pattern, common in Foggy Mountain Breakdown',
  },
  {
    id: 'square_roll',
    name: 'Square Roll',
    strings: [5, 1, 2, 1, 5, 1, 2, 1],
    description: 'Square roll — thumb alternates with a two-finger pattern',
  },
]

export const ROLL_MAP = new Map(ROLL_PATTERNS.map((r) => [r.id, r]))
