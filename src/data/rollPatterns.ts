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
  // ── Forward Rolls ─────────────────────────────────────────────────────────
  {
    id: 'forward_roll',
    name: 'Forward Roll',
    strings: [5, 2, 1, 5, 2, 1, 5, 2, 1, 5, 2, 1, 5, 2, 1, 5],
    fingers: ['T', 'I', 'M', 'T', 'I', 'M', 'T', 'I', 'M', 'T', 'I', 'M', 'T', 'I', 'M', 'T'],
    description: 'Classic Scruggs forward roll: T-I-M repeating, two measures (Scruggs Ch. 7)',
  },
  {
    id: 'forward_roll_alt',
    name: 'Forward Roll (5th string lead)',
    strings: [5, 2, 1, 5, 2, 1, 5, 2],
    fingers: ['T', 'I', 'M', 'T', 'I', 'M', 'T', 'I'],
    description: 'Forward roll variation: thumb leads on 5th string (Scruggs Exercise II)',
  },
  // ── Backward Roll ─────────────────────────────────────────────────────────
  {
    id: 'backward_roll',
    name: 'Backward Roll',
    strings: [1, 2, 5, 1, 2, 5, 1, 2],
    fingers: ['M', 'I', 'T', 'M', 'I', 'T', 'M', 'I'],
    description: 'M-I-T repeating: 1st-2nd-5th string cycling (Scruggs Ch. 7)',
  },
  // ── Reverse Roll ──────────────────────────────────────────────────────────
  {
    id: 'reverse_roll',
    name: 'Reverse Roll',
    strings: [3, 2, 1, 5, 1, 2, 3, 5],
    fingers: ['T', 'I', 'M', 'T', 'M', 'I', 'T', 'T'],
    description: 'Forward into backward: T-I-M-T then M-I-T-T (Scruggs Ch. 7)',
  },
  // ── Alternating Thumb ─────────────────────────────────────────────────────
  {
    id: 'alternating_thumb',
    name: 'Alternating Thumb Roll',
    strings: [3, 2, 5, 1, 4, 2, 5, 1],
    fingers: ['T', 'I', 'T', 'M', 'T', 'I', 'T', 'M'],
    description: 'T-I-T-M: thumb alternates between 3/5/4/5 strings (Scruggs Ch. 7)',
  },
  // ── Foggy Mountain Roll ───────────────────────────────────────────────────
  {
    id: 'mixed_roll',
    name: 'Foggy Mountain Roll',
    strings: [2, 1, 2, 1, 5, 2, 1, 5],
    fingers: ['I', 'M', 'T', 'M', 'T', 'I', 'M', 'T'],
    description: 'I-M-T-M-T-I-M-T: signature Foggy Mountain Breakdown roll (Scruggs Ch. 7)',
  },
  // ── Forward-Reverse Roll (Janet Davis) ────────────────────────────────────
  {
    id: 'forward_reverse',
    name: 'Forward-Reverse Roll',
    strings: [3, 2, 1, 5, 1, 2, 5, 1],
    fingers: ['T', 'I', 'M', 'T', 'M', 'I', 'T', 'M'],
    description: 'T-I-M-T-M-I-T-M: forward then reverse direction (Davis, Splitting the Licks)',
  },
  // ── Square Roll ───────────────────────────────────────────────────────────
  {
    id: 'square_roll',
    name: 'Square Roll',
    strings: [5, 1, 2, 1, 5, 1, 2, 1],
    fingers: ['T', 'M', 'I', 'M', 'T', 'M', 'I', 'M'],
    description: 'Square roll: thumb on 5th string alternates with index-middle pattern',
  },
]

export const ROLL_MAP = new Map(ROLL_PATTERNS.map((r) => [r.id, r]))

/** Reload ROLL_MAP with defaults + any custom patterns from IndexedDB. */
export async function refreshRollMap(): Promise<void> {
  const { db } = await import('../db/db')
  const custom = await db.customRollPatterns.toArray()

  ROLL_MAP.clear()
  for (const p of ROLL_PATTERNS) ROLL_MAP.set(p.id, p)
  for (const c of custom) {
    ROLL_MAP.set(c.id, {
      id: c.id,
      name: c.name,
      strings: c.strings,
      fingers: c.fingers,
      description: c.description,
    })
  }
}

/** Get all patterns (default + custom) as an array. */
export function getAllPatterns(): RollPattern[] {
  return Array.from(ROLL_MAP.values())
}
