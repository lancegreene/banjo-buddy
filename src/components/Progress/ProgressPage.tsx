// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Progress Page
// Scrollable page aggregating all analytics: stats, heatmap, BPM trends, history.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { OverallStatsCard } from './OverallStatsCard'
import { PracticeHeatmap } from './PracticeHeatmap'
import { BpmTrendChart } from './BpmTrendChart'
import { SkillPicker } from './SkillPicker'
import { SessionHistoryList } from './SessionHistoryList'

export function ProgressPage() {
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null)

  return (
    <div className="progress-page">
      <h1 className="progress-page-title">Your Progress</h1>

      <OverallStatsCard />
      <PracticeHeatmap />

      <div className="progress-section">
        <h3 className="section-title">BPM Trends</h3>
        <SkillPicker value={selectedSkillId} onChange={setSelectedSkillId} />
        {selectedSkillId && <BpmTrendChart skillId={selectedSkillId} />}
        {!selectedSkillId && (
          <p className="bpm-trend-empty">Select a skill above to view its BPM trend.</p>
        )}
      </div>

      <SessionHistoryList />
    </div>
  )
}
