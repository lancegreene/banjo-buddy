// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Weak Spot Drill UI
// Shows procedurally generated drills for weak positions.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { analyzeWeakSpots } from '../../engine/weakSpotAnalysis'
import { generateWeakSpotDrills, type DrillExercise } from '../../engine/weakSpotDrillGenerator'
import { BanjoTabDiagram } from '../BanjoTabDiagram/BanjoTabDiagram'
import { useBanjoSynth } from '../../hooks/useBanjoSynth'

interface Props {
  skillId: string
  patternId: string
  currentBpm: number
}

export function WeakSpotDrills({ skillId, patternId, currentBpm }: Props) {
  const [drills, setDrills] = useState<DrillExercise[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const synth = useBanjoSynth()

  useEffect(() => {
    analyzeWeakSpots(skillId, patternId).then(report => {
      const generated = generateWeakSpotDrills(report, currentBpm)
      setDrills(generated)
    })
  }, [skillId, patternId, currentBpm])

  if (drills.length === 0) return null

  return (
    <div className="wsd-container">
      <div className="wsd-header">
        <span className="wsd-title">Targeted Drills</span>
        <span className="wsd-subtitle">Auto-generated from your weak spots</span>
      </div>
      <div className="wsd-list">
        {drills.map(drill => {
          const isExpanded = expandedId === drill.id
          return (
            <div key={drill.id} className="wsd-card">
              <button
                className="wsd-card-header"
                onClick={() => setExpandedId(isExpanded ? null : drill.id)}
              >
                <div className="wsd-card-info">
                  <span className="wsd-card-title">{drill.title}</span>
                  <span className="wsd-card-meta">{drill.suggestedBpm} BPM · {drill.reps} reps</span>
                </div>
                <span className="wsd-card-expand">{isExpanded ? '▾' : '▸'}</span>
              </button>
              {isExpanded && (
                <div className="wsd-card-body">
                  <p className="wsd-card-desc">{drill.description}</p>
                  <BanjoTabDiagram
                    strings={drill.pattern}
                    fingers={drill.fingers}
                    label={drill.title}
                    highlightPosition={drill.targetPositions[0]}
                  />
                  <button
                    className={`btn btn-sm ${synth.isPlaying ? 'btn-secondary' : 'btn-primary'}`}
                    onClick={() => {
                      if (synth.isPlaying) {
                        synth.stop()
                      } else {
                        synth.playSequence(
                          drill.pattern
                            .filter((s): s is number => s !== null)
                            .map((s, i) => ({ string: s, fret: 0, beat: i, finger: drill.fingers[i] })),
                          drill.suggestedBpm
                        )
                      }
                    }}
                  >
                    {synth.isPlaying ? '■ Stop' : '▶ Listen'}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
