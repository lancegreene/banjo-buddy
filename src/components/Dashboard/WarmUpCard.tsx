// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Warm-Up Card
// "Warm Up" button on Dashboard → generates 5-min routine.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { useStore } from '../../store/useStore'
import { generateWarmUp, type WarmUpItem } from '../../engine/warmupEngine'

export function WarmUpCard() {
  const user = useStore((s) => s.user)
  const skillRecords = useStore((s) => s.skillRecords)
  const practiceSkill = useStore((s) => s.practiceSkill)
  const setPage = useStore((s) => s.setPage)
  const [warmUp, setWarmUp] = useState<WarmUpItem[] | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleGenerate() {
    if (!user) return
    setLoading(true)
    const items = await generateWarmUp(skillRecords, user.id)
    setWarmUp(items)
    setLoading(false)
  }

  function handleStart(skillId: string) {
    setPage('skill-tree')
    practiceSkill(skillId)
  }

  return (
    <div className="warmup-card" data-tour="warmup-card">
      <div className="warmup-card-header">
        <h3 className="section-title">Warm Up</h3>
        {!warmUp && (
          <button
            className="btn btn-secondary"
            onClick={handleGenerate}
            disabled={loading}
          >
            {loading ? 'Generating...' : 'Generate 5-min Warm Up'}
          </button>
        )}
      </div>

      {warmUp && warmUp.length > 0 && (
        <div className="warmup-items">
          {warmUp.map((item) => (
            <button
              key={item.skill.id}
              className="warmup-item"
              onClick={() => handleStart(item.skill.id)}
            >
              <span className="warmup-item-name">{item.skill.name}</span>
              <span className="warmup-item-bpm">{item.suggestedBpm} BPM</span>
              <span className="warmup-item-duration">{Math.round(item.durationSeconds / 60)}min</span>
            </button>
          ))}
        </div>
      )}

      {warmUp && warmUp.length === 0 && (
        <p className="warmup-empty">Unlock some roll/technique skills first!</p>
      )}
    </div>
  )
}
