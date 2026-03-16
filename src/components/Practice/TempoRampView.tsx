// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Tempo Ramp View (BPM Ladder)
// Visual BPM ladder with current step highlighted.
// ─────────────────────────────────────────────────────────────────────────────

import type { TempoRampState } from '../../engine/tempoRamp'

interface TempoRampViewProps {
  state: TempoRampState
}

const STATUS_COLORS = {
  pending: '#444',
  active: '#4a9eff',
  passed: '#27ae60',
  failed: '#e74c3c',
}

export function TempoRampView({ state }: TempoRampViewProps) {
  return (
    <div className="tempo-ramp">
      <div className="tempo-ramp-header">
        <span className="tempo-ramp-title">BPM Ladder</span>
        <span className="tempo-ramp-target">Target: {state.targetBpm} BPM</span>
      </div>

      <div className="tempo-ramp-ladder">
        {state.steps.map((step, i) => (
          <div
            key={step.bpm}
            className={`tempo-ramp-step ${step.status === 'active' ? 'tempo-ramp-step-active' : ''}`}
          >
            <div
              className="tempo-ramp-bar"
              style={{
                backgroundColor: STATUS_COLORS[step.status],
                width: `${(step.bpm / state.targetBpm) * 100}%`,
              }}
            />
            <span className="tempo-ramp-bpm">{step.bpm}</span>
            <span className="tempo-ramp-status">
              {step.status === 'passed' && '✓'}
              {step.status === 'failed' && '✗'}
              {step.status === 'active' && '▶'}
            </span>
            {step.accuracies.length > 0 && (
              <span className="tempo-ramp-acc">
                {Math.round(step.accuracies.reduce((a, b) => a + b, 0) / step.accuracies.length)}%
              </span>
            )}
          </div>
        ))}
      </div>

      {state.isComplete && (
        <div className="tempo-ramp-complete">
          {state.highestPassed
            ? `Reached ${state.highestPassed} BPM!`
            : 'Drill complete'}
        </div>
      )}
    </div>
  )
}
