// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — VideoRecorder Component
// Record + trim + save teacher demo clips. Used in modals from PracticeSession
// and SettingsPage.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useEffect, useCallback } from 'react'
import { useVideoRecorder } from '../../hooks/useVideoRecorder'
import { saveClip, updateClip } from '../../engine/teacherClipService'
import { useStore } from '../../store/useStore'
import { SKILLS } from '../../data/curriculum'
import { ROLL_PATTERNS } from '../../data/rollPatterns'
import type { TeacherClip } from '../../db/db'

interface VideoRecorderProps {
  skillId?: string | null
  rollPatternId?: string | null
  editClip?: TeacherClip       // if set, editing an existing clip (trim/title only)
  onSaved?: (clipId: string) => void
  onCancel?: () => void
}

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function VideoRecorder({ skillId, rollPatternId, editClip, onSaved, onCancel }: VideoRecorderProps) {
  const user = useStore((s) => s.user)
  const {
    isRecording, durationMs, videoBlob, videoUrl, previewStream,
    startCamera, stopCamera, startRecording, stopRecording, clearRecording, error,
  } = useVideoRecorder()

  const [title, setTitle] = useState(editClip?.title ?? '')
  const [selectedSkillId, setSelectedSkillId] = useState<string>(skillId ?? editClip?.skillId ?? '')
  const [selectedPatternId, setSelectedPatternId] = useState<string>(rollPatternId ?? editClip?.rollPatternId ?? '')
  const [trimStart, setTrimStart] = useState(editClip?.trimStart ?? 0)
  const [trimEnd, setTrimEnd] = useState(editClip?.trimEnd ?? 0)
  const [saving, setSaving] = useState(false)
  const [thumbnailBlob, setThumbnailBlob] = useState<Blob | null>(null)

  const previewRef = useRef<HTMLVideoElement>(null)
  const playbackRef = useRef<HTMLVideoElement>(null)

  // If editing, use existing clip's blob URL
  const [editVideoUrl] = useState<string | null>(() => {
    if (editClip?.videoBlob) return URL.createObjectURL(editClip.videoBlob)
    return null
  })

  const effectiveUrl = editClip ? editVideoUrl : videoUrl
  const effectiveDuration = editClip ? editClip.durationSeconds : durationMs / 1000

  // Initialize trimEnd when we get a video
  useEffect(() => {
    if (editClip) {
      setTrimEnd(editClip.trimEnd)
      setTrimStart(editClip.trimStart)
    } else if (videoBlob && durationMs > 0) {
      setTrimEnd(durationMs / 1000)
      setTrimStart(0)
    }
  }, [videoBlob, durationMs, editClip])

  // Wire up preview stream
  useEffect(() => {
    const el = previewRef.current
    if (el && previewStream) {
      el.srcObject = previewStream
    }
  }, [previewStream])

  // Auto-start camera on mount (unless editing)
  useEffect(() => {
    if (!editClip) startCamera()
    return () => { if (!editClip) stopCamera() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Cleanup edit URL on unmount
  useEffect(() => {
    return () => { if (editVideoUrl) URL.revokeObjectURL(editVideoUrl) }
  }, [editVideoUrl])

  // Capture thumbnail from video at 0.5s
  const captureThumbnail = useCallback((url: string) => {
    const video = document.createElement('video')
    video.src = url
    video.muted = true
    video.currentTime = 0.5
    video.onloadeddata = () => {
      video.currentTime = 0.5
    }
    video.onseeked = () => {
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth || 320
      canvas.height = video.videoHeight || 240
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        canvas.toBlob((blob) => {
          setThumbnailBlob(blob)
          video.remove()
        }, 'image/jpeg', 0.7)
      }
    }
  }, [])

  // Capture thumbnail when we get a recording
  useEffect(() => {
    if (videoUrl && !editClip) captureThumbnail(videoUrl)
  }, [videoUrl, editClip, captureThumbnail])

  // Trimmed playback: enforce trim bounds
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
        title: title || 'Untitled Clip',
        trimStart,
        trimEnd,
        skillId: selectedSkillId || null,
        rollPatternId: selectedPatternId || null,
      })
      setSaving(false)
      onSaved?.(editClip.id)
      return
    }

    if (!videoBlob) return

    const clipId = await saveClip({
      teacherId: user.id,
      skillId: selectedSkillId || null,
      rollPatternId: selectedPatternId || null,
      mediaType: 'video',
      videoBlob,
      audioBlob: null,
      imageBlob: null,
      thumbnailBlob,
      sourceImageId: null,
      cropRect: null,
      sortOrder: null,
      durationSeconds: durationMs / 1000,
      trimStart,
      trimEnd,
      title: title || 'Untitled Clip',
    })
    setSaving(false)
    stopCamera()
    onSaved?.(clipId)
  }

  function handleDiscard() {
    clearRecording()
    onCancel?.()
    if (!editClip) stopCamera()
  }

  const hasVideo = !!effectiveUrl
  const showPreview = !hasVideo && !editClip

  return (
    <div className="video-recorder">
      <h3 className="video-recorder-title">{editClip ? 'Edit Clip' : 'Record Demo Clip'}</h3>

      {error && <div className="video-recorder-error">{error}</div>}

      {/* Camera preview */}
      {showPreview && (
        <div className="video-recorder-preview">
          <video ref={previewRef} autoPlay muted playsInline className="video-recorder-video" />
          {isRecording && (
            <div className="video-recorder-indicator">
              <span className="video-recorder-dot" />
              <span>{formatDuration(durationMs)}</span>
            </div>
          )}
        </div>
      )}

      {/* Playback */}
      {hasVideo && (
        <div className="video-recorder-preview">
          <video
            ref={playbackRef}
            src={effectiveUrl!}
            controls
            playsInline
            className="video-recorder-video"
          />
        </div>
      )}

      {/* Record controls */}
      {showPreview && (
        <div className="video-recorder-controls">
          {!isRecording ? (
            <button className="btn btn-primary" onClick={startRecording} disabled={!previewStream}>
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

      {/* Trim + metadata (after recording or when editing) */}
      {hasVideo && (
        <div className="video-recorder-meta">
          {/* Trim sliders */}
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
                  onChange={(e) => {
                    const v = parseFloat(e.target.value)
                    setTrimStart(Math.min(v, trimEnd - 0.5))
                  }}
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
                  onChange={(e) => {
                    const v = parseFloat(e.target.value)
                    setTrimEnd(Math.max(v, trimStart + 0.5))
                  }}
                />
              </div>
            </div>
          </div>

          {/* Title */}
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

          {/* Skill picker */}
          <div className="video-recorder-field">
            <label className="video-recorder-field-label">Attach to Skill</label>
            <select
              className="video-recorder-select"
              value={selectedSkillId}
              onChange={(e) => setSelectedSkillId(e.target.value)}
            >
              <option value="">None</option>
              {SKILLS.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Pattern picker */}
          <div className="video-recorder-field">
            <label className="video-recorder-field-label">Attach to Roll Pattern</label>
            <select
              className="video-recorder-select"
              value={selectedPatternId}
              onChange={(e) => setSelectedPatternId(e.target.value)}
            >
              <option value="">None</option>
              {ROLL_PATTERNS.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Save/Discard */}
          <div className="video-recorder-controls">
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Clip'}
            </button>
            <button className="btn btn-secondary" onClick={handleDiscard}>
              Discard
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
