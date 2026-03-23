// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Tempo Mode Selector
// Segmented control: Fixed / Adaptive / Interleaved tempo modes.
// ─────────────────────────────────────────────────────────────────────────────

export type TempoMode = 'fixed' | 'adaptive' | 'interleaved'

interface Props {
  mode: TempoMode
  onChange: (mode: TempoMode) => void
  currentBpm: number | null
  disabled?: boolean
}

const MODES: { id: TempoMode; label: string; desc: string }[] = [
  { id: 'fixed',        label: 'Fixed',        desc: 'Constant BPM' },
  { id: 'adaptive',     label: 'Adaptive',     desc: 'Auto-adjust based on accuracy' },
  { id: 'interleaved',  label: 'Interleaved',  desc: 'Random BPM variation for deeper learning' },
]

export function TempoModeSelector({ mode, onChange, currentBpm, disabled }: Props) {
  return (
    <div className="tempo-mode-selector">
      <div className="tempo-mode-btns">
        {MODES.map((m) => (
          <button
            key={m.id}
            className={`tempo-mode-btn ${mode === m.id ? 'tempo-mode-btn-active' : ''}`}
            onClick={() => onChange(m.id)}
            disabled={disabled}
            title={m.desc}
          >
            {m.label}
          </button>
        ))}
      </div>
      {mode !== 'fixed' && currentBpm && (
        <span className="tempo-mode-bpm">
          {currentBpm} BPM
        </span>
      )}
    </div>
  )
}
