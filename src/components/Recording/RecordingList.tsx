// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Recording List
// Lists saved recordings for a skill with playback and delete.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react'
import { getRecordingsForSkill, deleteRecording } from '../../engine/recordingService'
import type { Recording } from '../../db/db'

interface RecordingListProps {
  skillId: string
  onCompare?: (a: Recording, b: Recording) => void
}

export function RecordingList({ skillId, onCompare }: RecordingListProps) {
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const urlRef = useRef<string | null>(null)

  useEffect(() => {
    loadRecordings()
  }, [skillId])

  async function loadRecordings() {
    const recs = await getRecordingsForSkill(skillId)
    setRecordings(recs)
  }

  function playRecording(rec: Recording) {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)

    const url = URL.createObjectURL(rec.audioBlob)
    urlRef.current = url

    if (audioRef.current) {
      audioRef.current.src = url
      audioRef.current.play()
      setPlayingId(rec.id)
    }
  }

  function stopPlayback() {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    setPlayingId(null)
  }

  async function handleDelete(id: string) {
    await deleteRecording(id)
    await loadRecordings()
    if (playingId === id) stopPlayback()
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev.slice(-1), id]
    )
  }

  if (recordings.length === 0) return null

  const canCompare = selectedIds.length === 2 && onCompare

  return (
    <div className="recording-list">
      <h4 className="recording-list-title">Saved Recordings</h4>
      <audio
        ref={audioRef}
        onEnded={() => setPlayingId(null)}
        style={{ display: 'none' }}
      />

      <div className="recording-list-items">
        {recordings.map((rec) => {
          const dateStr = new Date(rec.createdAt).toLocaleDateString(undefined, {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
          })
          const isPlaying = playingId === rec.id
          const isSelected = selectedIds.includes(rec.id)

          return (
            <div key={rec.id} className={`recording-list-item ${isSelected ? 'recording-list-item-selected' : ''}`}>
              {onCompare && (
                <button
                  className={`recording-select-btn ${isSelected ? 'recording-select-btn-active' : ''}`}
                  onClick={() => toggleSelect(rec.id)}
                  title="Select for comparison"
                >
                  {isSelected ? '●' : '○'}
                </button>
              )}
              <span className="recording-date">{dateStr}</span>
              <span className="recording-duration">{Math.round(rec.durationSeconds)}s</span>
              {rec.bpm && <span className="recording-bpm">{rec.bpm} BPM</span>}
              <button
                className="recording-play-btn"
                onClick={() => isPlaying ? stopPlayback() : playRecording(rec)}
              >
                {isPlaying ? '■' : '▶'}
              </button>
              <button
                className="recording-delete-btn"
                onClick={() => handleDelete(rec.id)}
                title="Delete recording"
              >
                ✕
              </button>
            </div>
          )
        })}
      </div>

      {canCompare && (
        <button
          className="btn btn-secondary"
          onClick={() => {
            const a = recordings.find((r) => r.id === selectedIds[0])
            const b = recordings.find((r) => r.id === selectedIds[1])
            if (a && b) onCompare!(a, b)
          }}
        >
          Compare Selected
        </button>
      )}
    </div>
  )
}
