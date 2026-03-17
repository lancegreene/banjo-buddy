import { useState, useEffect } from 'react'
import { detectPlateaus, type PlateauInfo } from '../../engine/plateauDetector'
import { SKILL_MAP } from '../../data/curriculum'
import { useStore } from '../../store/useStore'

export function PlateauAlert() {
  const skillRecords = useStore((s) => s.skillRecords)
  const [plateaus, setPlateaus] = useState<PlateauInfo[]>([])
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const ids = Array.from(skillRecords.keys())
    if (ids.length === 0) return
    detectPlateaus(ids).then(setPlateaus)
  }, [skillRecords])

  if (plateaus.length === 0 || dismissed) return null

  return (
    <div className="plateau-alert">
      <div className="plateau-alert-header">
        <h3 className="plateau-alert-title">Plateau Detected</h3>
        <button className="plateau-alert-close" onClick={() => setDismissed(true)}>x</button>
      </div>
      <div className="plateau-alert-list">
        {plateaus.map(p => {
          const skill = SKILL_MAP.get(p.skillId)
          return (
            <div key={p.skillId} className="plateau-alert-item">
              <span className="plateau-skill-name">{skill?.name ?? p.skillId}</span>
              <span className="plateau-detail">
                ~{p.avgBpm} BPM, {p.avgScore}% avg over {p.sessionsAnalyzed} sessions
              </span>
              <span className="plateau-suggestion">{p.suggestion}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
