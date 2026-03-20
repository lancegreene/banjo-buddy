// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Audio Recorder for Teacher Clips
// Record + trim + save audio-only demo clips.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useEffect } from 'react'
import { useAudioRecorderTeacher } from '../../hooks/useAudioRecorderTeacher'
import { saveClip, updateClip } from '../../engine/teacherClipService'
import { useStore } from '../../store/useStore'
import { SKILLS } from '../../data/curriculum'
import { ROLL_PATTERNS } from '../../data/rollPatterns'
import type { TeacherClip } from '../../db/db'

interface AudioRecorderTeacherProps {
  skillId?: string | null
  rollPatternId?: string | null
  editClip?: TeacherClip
  onSaved?: (clipId: string) => void
  onCancel?: () => void
}

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function AudioRecorderTeacher({ skillId, rollPatternId, editClip, onSaved, onCancel }: AudioRecorderTeacherProps) {
  const user = useStore((s) => s.user)
  const {
    isRecording, durationMs, audioBlob, audioUrl, micLevel,
    startMic, stopMic, startRecording, stopRecording, clearRecording, error,
  } = useAudioRecorderTeacher()

  const [title, setTitle] = useState(editClip?.title ?? '')
  const [selectedSkillId, setSelectedSkillId] = useState<string>(skillId ?? editClip?.skillId ?? '')
  const [selectedPatternId, setSelectedPatternId] = useState<string>(rollPatternId ?? editClip?.rollPatternId ?? '')
  const [trimStart, setTrimStart] = useState(editClip?.trimStart ?? 0)
  const [trimEnd, setTrimEnd] = useState(editClip?.trimEnd ?? 0)
  const [saving, setSaving] = useState(false)

  const playbackRef = useRef<HTMLAudioElement>(null)

  // Edit mode URL
  const [editAudioUrl] = useState<string | null>(() => {
    if (editClip?.audioBlob) return URL.createObjectURL(editClip.audioBlob)
    return null
  })

  const effectiveUrl = editClip ? editAudioUrl : audioUrl
  const effectiveDuration = editClip ? editClip.durationSeconds : durationMs / 1000

  useEffect(() => {
    if (editClip) {
      setTrimEnd(editClip.trimEnd)
      setTrimStart(editClip.trimStart)
    } else if (audioBlob && durationMs > 0) {
      setTrimEnd(durationMs / 1000)
      setTrimStart(0)
    }
  }, [audioBlob, durationMs, editClip])

  // Auto-start mic on mount (unless editing)
  useEffect(() => {
    if (!editClip) startMic()
    return () => { if (!editClip) stopMic() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    return () => { if (editAudioUrl) URL.revokeObjectURL(editAudioUrl) }
  }, [editAudioUrl])

  // Trimmed playback enforcement
  useEffect(() => {
    const el = playbackRef.current
    if (!el || !effectiveUrl) return

    function handleTimeUpdate() {
      if (el && el.currentTime >= trimEnd) {
        el.pause()
        el.currentTime = trimStart
      }
    }
    function handlePlay() {
      if (el && el.currentTime < trimStart) {
        el.currentTime = trimStart
      }
    }
    el.addEventListener('timeupdate', handleTimeUpdate)
    el.addEventListener('play', handlePlay)
    return () => {
      el.removeEventListener('timeupdate', handleTimeUpdate)
      el.removeEventListener('play', handlePlay)
    }
  }, [effectiveUrl, trimStart, trimEnd])

  async function handleSave() {
    if (!user) return
    setSaving(true)

    if (editClip) {
      await updateClip(editClip.id, {
        title: title || 'Untitled Audio',
        trimStart,
        trimEnd,
        skillId: selectedSkillId || null,
        rollPatternId: selectedPatternId || null,
      })
      setSaving(false)
      onSaved?.(editClip.id)
      return
    }

    if (!audioBlob) return

    const clipId = await saveClip({
      teacherId: user.id,
      skillId: selectedSkillId || null,
      rollPatternId: selectedPatternId || null,
      mediaType: 'audio',
      videoBlob: null,
      audioBlob,
      imageBlob: null,
      thumbnailBlob: null,
      sourceImageId: null,
      cropRect: null,
      sortOrder: null,
      durationSeconds: durationMs / 1000,
      trimStart,
      trimEnd,
      title: title || 'Untitled Audio',
    })
    setSaving(false)
    stopMic()
    onSaved?.(clipId)
  }

  function handleDiscard() {
    clearRecording()
    onCancel?.()
    if (!editClip) stopMic()
  }

  const hasAudio = !!effectiveUrl

  return (
    <div className="video-recorder">
      <h3 className="video-recorder-title">{editClip ? 'Edit Audio Clip' : 'Record Audio Clip'}</h3>

      {error && <div className="video-recorder-error">{error}</div>}

      {/* Mic level indicator */}
      {!hasAudio && !editClip && (
        <div className="audio-recorder-level-wrap">
          <div className="audio-recorder-level-bar">
            <div
              className="audio-recorder-level-fill"
              style={{ width: `${Math.min(100, micLevel * 400)}%` }}
            />
          </div>
          {isRecording && (
            <div className="video-recorder-indicator">
              <span className="video-recorder-dot" />
              <span>{formatDuration(durationMs)}</span>
            </div>
          )}
        </div>
      )}

      {/* Playback */}
      {hasAudio && (
        <div className="audio-recorder-playback">
          <audio
            ref={playbackRef}
            src={effectiveUrl!}
            controls
            className="audio-recorder-audio"
          />
        </div>
      )}

      {/* Record controls */}
      {!hasAudio && !editClip && (
        <div className="video-recorder-controls">
          {!isRecording ? (
            <button className="btn btn-primary" onClick={startRecording}>
              {'\u25CF'} Record
            </button>
          ) : (
            <button className="btn btn-stop-detect" onClick={stopRecording}>
              {'\u25A0'} Stop
            </button>
          )}
          <button className="btn btn-secondary" onClick={handleDiscard}>Cancel</button>
        </div>
      )}

      {/* Trim + metadata */}
      {hasAudio && (
        <div className="video-recorder-meta">
          <div className="video-recorder-trim">
            <label className="video-recorder-trim-label">Trim</label>
            <div className="video-recorder-trim-sliders">
              <div className="video-recorder-trim-row">
                <span className="video-recorder-trim-text">Start: {trimStart.toFixed(1)}s</span>
                <input
                  type="range"
                  className="video-recorder-trim-slider"
                  min={0}
                  max={effectiveDuration}
                  step={0.1}
                  value={trimStart}
                  onChange={(e) => setTrimStart(Math.min(parseFloat(e.target.value), trimEnd - 0.5))}
                />
              </div>
              <div className="video-recorder-trim-row">
                <span className="video-recorder-trim-text">End: {trimEnd.toFixed(1)}s</span>
                <input
                  type="range"
                  className="video-recorder-trim-slider"
                  min={0}
                  max={effectiveDuration}
                  step={0.1}
                  value={trimEnd}
                  onChange={(e) => setTrimEnd(Math.max(parseFloat(e.target.value), trimStart + 0.5))}
                />
              </div>
            </div>
          </div>

          <div className="video-recorder-field">
            <label className="video-recorder-field-label">Title</label>
            <input
              type="text"
              className="video-recorder-input"
              placeholder="e.g. Forward roll demo"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="video-recorder-field">
            <label className="video-recorder-field-label">Attach to Skill</label>
            <select className="video-recorder-select" value={selectedSkillId} onChange={(e) => setSelectedSkillId(e.target.value)}>
              <option value="">None</option>
              {SKILLS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div className="video-recorder-field">
            <label className="video-recorder-field-label">Attach to Roll Pattern</label>
            <select className="video-recorder-select" value={selectedPatternId} onChange={(e) => setSelectedPatternId(e.target.value)}>
              <option value="">None</option>
              {ROLL_PATTERNS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div className="video-recorder-controls">
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Clip'}
            </button>
            <button className="btn btn-secondary" onClick={handleDiscard}>Discard</button>
          </div>
        </div>
      )}
    </div>
  )
}
