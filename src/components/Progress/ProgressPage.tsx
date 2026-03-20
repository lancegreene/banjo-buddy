// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Progress Page
// Scrollable page aggregating all analytics: stats, heatmap, BPM trends, history.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { useStore } from '../../store/useStore'
import { OverallStatsCard } from './OverallStatsCard'
import { PracticeHeatmap } from './PracticeHeatmap'
import { BpmTrendChart } from './BpmTrendChart'
import { SkillPicker } from './SkillPicker'
import { SessionHistoryList } from './SessionHistoryList'
import { RadarChart } from '../Charts/RadarChart'

export function ProgressPage() {
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null)
  const lastMetrics = useStore((s) => s.lastMetrics)

  return (
    <div className="progress-page">
      <h1 className="progress-page-title">Your Progress</h1>

      <div data-tour="progress-stats">
        <OverallStatsCard />
      </div>

      {lastMetrics && (
        <div className="progress-section">
          <h3 className="section-title">Performance Overview</h3>
          <RadarChart
            values={[
              lastMetrics.timing,
              lastMetrics.noteAccuracy,
              lastMetrics.rollEvenness,
              lastMetrics.dynamics,
              lastMetrics.tempoStability,
            ]}
            labels={['Timing', 'Notes', 'Rolls', 'Dynamics', 'Tempo']}
            size={220}
          />
        </div>
      )}

      <div data-tour="progress-heatmap">
        <PracticeHeatmap />
      </div>

      <div className="progress-section" data-tour="progress-bpm">
        <h3 className="section-title">BPM Trends</h3>
        <SkillPicker value={selectedSkillId} onChange={setSelectedSkillId} />
        {selectedSkillId && <BpmTrendChart skillId={selectedSkillId} />}
        {!selectedSkillId && (
          <p className="bpm-trend-empty">Select a skill above to view its BPM trend.</p>
        )}
      </div>

      <div data-tour="progress-history">
        <SessionHistoryList />
      </div>
    </div>
  )
}
