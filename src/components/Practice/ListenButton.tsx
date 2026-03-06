// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Listen Button
// Reusable play/stop button for audio demos. Speaker icon, toggles state.
// ─────────────────────────────────────────────────────────────────────────────

interface ListenButtonProps {
  onPlay: () => void
  onStop: () => void
  isPlaying: boolean
  label?: string
  small?: boolean
}

export function ListenButton({ onPlay, onStop, isPlaying, label, small }: ListenButtonProps) {
  return (
    <button
      className={`listen-btn ${isPlaying ? 'listen-btn-playing' : ''} ${small ? 'listen-btn-sm' : ''}`}
      onClick={isPlaying ? onStop : onPlay}
      title={isPlaying ? 'Stop demo' : (label ?? 'Listen to demo')}
    >
      {isPlaying ? (
        <>
          <span className="listen-icon">&#9632;</span>
          <span className="listen-text">Stop</span>
        </>
      ) : (
        <>
          <span className="listen-icon">&#9835;</span>
          <span className="listen-text">{label ?? 'Listen'}</span>
        </>
      )}
    </button>
  )
}
