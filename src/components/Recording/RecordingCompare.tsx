// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Recording Compare
// Side-by-side playback with waveform visualization and stat comparison.
// ─────────────────────────────────────────────────────────────────────────────

import type { Recording } from '../../db/db'
import { WaveformDisplay } from './WaveformDisplay'
import { RecordingPlayer } from './RecordingPlayer'

interface RecordingCompareProps {
  recordingA: Recording
  recordingB: Recording
  onClose: () => void
}

export function RecordingCompare({ recordingA, recordingB, onClose }: RecordingCompareProps) {
  const dateA = new Date(recordingA.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const dateB = new Date(recordingB.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

  return (
    <div className="recording-compare">
      <div className="recording-compare-header">
        <h3>Compare Recordings</h3>
        <button className="recording-player-close" onClick={onClose}>✕</button>
      </div>

      <div className="recording-compare-grid">
        <div className="recording-compare-side">
          <h4>{dateA}</h4>
          <WaveformDisplay audioBlob={recordingA.audioBlob} color="#4a9eff" />
          <RecordingPlayer recording={recordingA} onClose={() => {}} />
          <div className="recording-compare-stats">
            {recordingA.bpm && <span>BPM: {recordingA.bpm}</span>}
            <span>Duration: {Math.round(recordingA.durationSeconds)}s</span>
          </div>
        </div>

        <div className="recording-compare-side">
          <h4>{dateB}</h4>
          <WaveformDisplay audioBlob={recordingB.audioBlob} color="#27ae60" />
          <RecordingPlayer recording={recordingB} onClose={() => {}} />
          <div className="recording-compare-stats">
            {recordingB.bpm && <span>BPM: {recordingB.bpm}</span>}
            <span>Duration: {Math.round(recordingB.durationSeconds)}s</span>
          </div>
        </div>
      </div>

      {/* BPM improvement indicator */}
      {recordingA.bpm && recordingB.bpm && (
        <div className="recording-compare-diff">
          {recordingB.bpm > recordingA.bpm
            ? `+${recordingB.bpm - recordingA.bpm} BPM improvement`
            : recordingB.bpm < recordingA.bpm
            ? `${recordingB.bpm - recordingA.bpm} BPM`
            : 'Same BPM'}
        </div>
      )}
    </div>
  )
}
