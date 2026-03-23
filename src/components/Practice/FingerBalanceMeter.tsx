// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Finger Balance Meter
// Real-time horizontal bar meter showing T/I/M hit rates during roll practice.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo } from 'react'
import type { NoteEvaluation } from '../../engine/streamingRollMatcher'
import { computeFingerBalance, type Finger } from '../../engine/fingerBalance'
import { ROLL_MAP } from '../../data/rollPatterns'

interface Props {
  evaluations: NoteEvaluation[]
  patternId: string
}

const FINGER_CONFIG: { key: 'thumb' | 'index' | 'middle'; label: string; abbr: string; color: string }[] = [
  { key: 'thumb',  label: 'Thumb',  abbr: 'T', color: '#4a9eff' },
  { key: 'index',  label: 'Index',  abbr: 'I', color: '#4ade80' },
  { key: 'middle', label: 'Middle', abbr: 'M', color: '#f5a623' },
]

export function FingerBalanceMeter({ evaluations, patternId }: Props) {
  const pattern = ROLL_MAP.get(patternId)
  const fingers = pattern?.fingers as Finger[] | undefined

  const balance = useMemo(
    () => computeFingerBalance(evaluations, fingers ?? []),
    [evaluations, fingers]
  )

  if (!fingers || evaluations.length < 4) return null

  return (
    <div className="finger-balance">
      <div className="finger-balance-header">
        <span className="finger-balance-title">Finger Balance</span>
        <span className={`finger-balance-evenness ${balance.evenness >= 80 ? 'fb-even-good' : balance.evenness >= 50 ? 'fb-even-ok' : 'fb-even-poor'}`}>
          {balance.evenness}% even
        </span>
      </div>
      <div className="finger-balance-bars">
        {FINGER_CONFIG.map(({ key, abbr, color }) => {
          const stat = balance[key]
          if (stat.count === 0) return null
          return (
            <div key={key} className="finger-bar-row">
              <span className="finger-bar-label" style={{ color }}>{abbr}</span>
              <div className="finger-bar-track">
                <div
                  className="finger-bar-fill"
                  style={{ width: `${stat.hitRate}%`, backgroundColor: color }}
                />
              </div>
              <span className="finger-bar-value">{stat.hitRate}%</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
