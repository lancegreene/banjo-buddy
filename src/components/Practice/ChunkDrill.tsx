import { useState } from 'react'
import type { ChunkDrill } from '../../engine/autoChunker'

interface Props {
  chunks: ChunkDrill[]
  patternName: string
  onDismiss: () => void
  onDrill: (chunk: ChunkDrill) => void
}

export function ChunkDrillPrompt({ chunks, patternName, onDismiss, onDrill }: Props) {
  const [selectedIdx, setSelectedIdx] = useState(0)

  if (chunks.length === 0) return null

  return (
    <div className="chunk-drill">
      <h3 className="chunk-drill-title">Trouble Spots Detected</h3>
      <p className="chunk-drill-desc">
        Some parts of {patternName} need extra work. Drill them at a slower tempo?
      </p>

      <div className="chunk-drill-list">
        {chunks.map((chunk, i) => (
          <button
            key={i}
            className={`chunk-drill-item ${selectedIdx === i ? 'chunk-drill-item-selected' : ''}`}
            onClick={() => setSelectedIdx(i)}
          >
            <span className="chunk-drill-positions">
              Beats {chunk.startPosition + 1}–{chunk.endPosition}
            </span>
            <span className="chunk-drill-accuracy">
              {chunk.accuracy}% accuracy
            </span>
            <span className="chunk-drill-bpm">
              Drill at {chunk.suggestedBpm} BPM x{chunk.repetitions}
            </span>
          </button>
        ))}
      </div>

      <div className="chunk-drill-actions">
        <button className="btn btn-primary" onClick={() => onDrill(chunks[selectedIdx])}>
          Start Drill
        </button>
        <button className="btn btn-secondary" onClick={onDismiss}>
          Skip
        </button>
      </div>
    </div>
  )
}
