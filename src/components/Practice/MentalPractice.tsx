import { useState } from 'react'
import type { Skill } from '../../data/curriculum'
import { useBanjoSynth } from '../../hooks/useBanjoSynth'
import { ROLL_MAP } from '../../data/rollPatterns'
import { SECTION_MAP } from '../../data/songLibrary'

type Mode = 'watch' | 'shadow' | 'perform'

interface Props {
  skill: Skill
  suggestedBpm: number
  onSwitchToPerform?: () => void
}

export function MentalPractice({ skill, suggestedBpm, onSwitchToPerform }: Props) {
  const [mode, setMode] = useState<Mode>('watch')
  const synth = useBanjoSynth()

  function handlePlay() {
    if (skill.rollPatternId) {
      synth.playRoll(skill.rollPatternId, suggestedBpm, 2)
    } else if (skill.songSectionId) {
      const sec = SECTION_MAP.get(skill.songSectionId)
      if (sec) synth.playSection(sec.measures, suggestedBpm)
    }
  }

  return (
    <div className="mental-practice">
      <div className="mental-practice-modes">
        <button
          className={`mental-mode-btn ${mode === 'watch' ? 'mental-mode-active' : ''}`}
          onClick={() => setMode('watch')}
        >
          Watch
        </button>
        <button
          className={`mental-mode-btn ${mode === 'shadow' ? 'mental-mode-active' : ''}`}
          onClick={() => setMode('shadow')}
        >
          Shadow
        </button>
        <button
          className={`mental-mode-btn ${mode === 'perform' ? 'mental-mode-active' : ''}`}
          onClick={() => {
            setMode('perform')
            onSwitchToPerform?.()
          }}
        >
          Perform
        </button>
      </div>

      {mode === 'watch' && (
        <div className="mental-practice-watch">
          <p className="mental-practice-desc">
            Watch and listen to the pattern. Visualize your fingers moving.
          </p>
          <button
            className="btn btn-primary"
            onClick={synth.isPlaying ? () => synth.stop() : handlePlay}
          >
            {synth.isPlaying ? 'Stop' : 'Play Demo'}
          </button>
        </div>
      )}

      {mode === 'shadow' && (
        <div className="mental-practice-shadow">
          <p className="mental-practice-desc">
            Play along with the synth — no scoring. Focus on feel and timing.
          </p>
          <button
            className="btn btn-primary"
            onClick={synth.isPlaying ? () => synth.stop() : handlePlay}
          >
            {synth.isPlaying ? 'Stop' : 'Play Along (No Score)'}
          </button>
        </div>
      )}

      {mode === 'perform' && (
        <div className="mental-practice-perform">
          <p className="mental-practice-desc">
            Ready for scoring. Switch to the regular practice view.
          </p>
        </div>
      )}
    </div>
  )
}
