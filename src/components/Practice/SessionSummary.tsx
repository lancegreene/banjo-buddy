import type { PerformanceMetrics } from '../../types/performance'
import { CoachingCards } from './CoachingCards'

interface Props {
  metrics: PerformanceMetrics
  previousMetrics?: PerformanceMetrics | null
  nextReviewDate?: string | null
  skillName: string
  onContinue: () => void
}

export function SessionSummary({ metrics, previousMetrics, nextReviewDate, skillName, onContinue }: Props) {
  const metricLabels: { key: keyof Omit<PerformanceMetrics, 'composite'>; label: string }[] = [
    { key: 'timing', label: 'Timing' },
    { key: 'noteAccuracy', label: 'Notes' },
    { key: 'rollEvenness', label: 'Evenness' },
    { key: 'dynamics', label: 'Dynamics' },
    { key: 'tempoStability', label: 'Tempo' },
  ]

  return (
    <div className="session-summary">
      <h3 className="session-summary-title">{skillName}</h3>

      <div className="session-summary-composite">
        <span className="summary-composite-value">{metrics.composite}</span>
        <span className="summary-composite-label">Overall Score</span>
        {previousMetrics && (
          <span className={`summary-delta ${metrics.composite >= previousMetrics.composite ? 'summary-delta-up' : 'summary-delta-down'}`}>
            {metrics.composite >= previousMetrics.composite ? '+' : ''}{metrics.composite - previousMetrics.composite}
          </span>
        )}
      </div>

      <div className="session-summary-metrics">
        {metricLabels.map(({ key, label }) => {
          const value = metrics[key]
          const prev = previousMetrics?.[key] ?? null
          const delta = prev !== null ? value - prev : null
          return (
            <div key={key} className="summary-metric-row">
              <span className="summary-metric-label">{label}</span>
              <div className="summary-metric-bar-track">
                <div
                  className="summary-metric-bar-fill"
                  style={{ width: `${value}%` }}
                />
                {prev !== null && (
                  <div
                    className="summary-metric-bar-ghost"
                    style={{ width: `${prev}%` }}
                  />
                )}
              </div>
              <span className="summary-metric-value">{value}</span>
              {delta !== null && (
                <span className={`summary-metric-delta ${delta >= 0 ? 'summary-delta-up' : 'summary-delta-down'}`}>
                  {delta >= 0 ? '+' : ''}{delta}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Coaching tips based on weak metrics */}
      <CoachingCards metrics={metrics} />

      {nextReviewDate && (
        <div className="session-summary-review">
          Next review: {nextReviewDate}
        </div>
      )}

      <button className="btn btn-primary" onClick={onContinue}>
        Continue
      </button>
    </div>
  )
}
