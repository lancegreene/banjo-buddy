// ─── RecordingStudio — Record, import, and manage reference audio ─────────────
// Lives under Settings. Provides a standalone recorder (independent of practice
// session mic), file import for external recordings, and a browsable library
// of all saved recordings with playback, labeling, and delete.

import { useState, useEffect, useRef, useCallback } from 'react'
import { db, newId, nowISO } from '../../db/db'
import type { Recording } from '../../db/db'
import { SKILL_MAP, getAllSkills } from '../../data/curriculum'
import { ROLL_MAP } from '../../data/rollPatterns'
import { useStore } from '../../store/useStore'
import {
  getStorageUsage,
  deleteRecording,
  type StorageUsage,
} from '../../engine/recordingService'

type StudioView = 'library' | 'record' | 'import'

export function RecordingStudio() {
  const user = useStore((s) => s.user)
  const [view, setView] = useState<StudioView>('library')
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [storage, setStorage] = useState<StorageUsage | null>(null)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [filterSkill, setFilterSkill] = useState<string>('all')
  const audioUrlsRef = useRef<Map<string, string>>(new Map())

  const loadRecordings = useCallback(async () => {
    const all = await db.recordings.orderBy('createdAt').reverse().toArray()
    setRecordings(all)
    const usage = await getStorageUsage()
    setStorage(usage)
    // Build object URLs for playback
    const oldUrls = audioUrlsRef.current
    oldUrls.forEach((url) => URL.revokeObjectURL(url))
    const urls = new Map<string, string>()
    all.forEach((r) => urls.set(r.id, URL.createObjectURL(r.audioBlob)))
    audioUrlsRef.current = urls
  }, [])

  useEffect(() => {
    loadRecordings()
    return () => {
      audioUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [loadRecordings])

  async function handleDelete(id: string) {
    await deleteRecording(id)
    setConfirmDeleteId(null)
    setPlayingId(null)
    loadRecordings()
  }

  const filtered = filterSkill === 'all'
    ? recordings
    : recordings.filter((r) => r.skillId === filterSkill)

  // Unique skill IDs that have recordings
  const skillsWithRecordings = [...new Set(recordings.map((r) => r.skillId))]

  if (view === 'record') {
    return (
      <div className="recording-studio">
        <button className="btn btn-sm settings-back-btn" onClick={() => { setView('library'); loadRecordings() }}>
          &larr; Back to Library
        </button>
        <StudioRecorder onSaved={() => { setView('library'); loadRecordings() }} />
      </div>
    )
  }

  if (view === 'import') {
    return (
      <div className="recording-studio">
        <button className="btn btn-sm settings-back-btn" onClick={() => { setView('library'); loadRecordings() }}>
          &larr; Back to Library
        </button>
        <FileImporter onSaved={() => { setView('library'); loadRecordings() }} />
      </div>
    )
  }

  return (
    <div className="recording-studio">
      <div className="rs-header">
        <h3 className="rs-title">Recording Studio</h3>
        <p className="rs-desc">Record reference tracks, import audio files, and review your playing over time.</p>
      </div>

      <div className="rs-actions">
        <button className="btn btn-primary btn-sm" onClick={() => setView('record')}>
          ● Record
        </button>
        <button className="btn btn-secondary btn-sm" onClick={() => setView('import')}>
          ↑ Import File
        </button>
      </div>

      {/* Recording guide — show when library is empty */}
      {recordings.length === 0 && <RecordingGuide />}

      {/* Storage indicator */}
      {storage && (
        <div className="rs-storage">
          <div className="rs-storage-bar">
            <div
              className={`rs-storage-fill ${storage.isNearLimit ? 'rs-storage-warn' : ''}`}
              style={{ width: `${Math.min(100, (storage.totalBytes / (500 * 1024 * 1024)) * 100)}%` }}
            />
          </div>
          <span className="rs-storage-text">
            {(storage.totalBytes / (1024 * 1024)).toFixed(1)} MB · {storage.recordingCount} recording{storage.recordingCount !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Filter */}
      {skillsWithRecordings.length > 1 && (
        <div className="rs-filter">
          <select
            className="rs-filter-select"
            value={filterSkill}
            onChange={(e) => setFilterSkill(e.target.value)}
          >
            <option value="all">All skills</option>
            {skillsWithRecordings.map((sid) => (
              <option key={sid} value={sid}>{SKILL_MAP.get(sid)?.name ?? sid}</option>
            ))}
          </select>
        </div>
      )}

      {/* Recording list */}
      {filtered.length > 0 ? (
        <div className="rs-list">
          {filtered.map((rec) => {
            const skillName = SKILL_MAP.get(rec.skillId)?.name ?? rec.skillId
            const isPlaying = playingId === rec.id
            const url = audioUrlsRef.current.get(rec.id)
            const date = new Date(rec.createdAt)
            const duration = rec.durationSeconds

            return (
              <div key={rec.id} className={`rs-card ${isPlaying ? 'rs-card-playing' : ''}`}>
                <div className="rs-card-info">
                  <span className="rs-card-skill">{skillName}</span>
                  <span className="rs-card-meta">
                    {duration > 0 && <>{Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, '0')} · </>}
                    {rec.bpm && <>{rec.bpm} BPM · </>}
                    {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="rs-card-actions">
                  <button
                    className="btn btn-sm"
                    onClick={() => setPlayingId(isPlaying ? null : rec.id)}
                  >
                    {isPlaying ? '■ Stop' : '▶ Play'}
                  </button>
                  {confirmDeleteId === rec.id ? (
                    <span className="rs-card-confirm">
                      <button className="btn btn-sm settings-delete-btn" onClick={() => handleDelete(rec.id)}>Confirm</button>
                      <button className="btn btn-sm" onClick={() => setConfirmDeleteId(null)}>Cancel</button>
                    </span>
                  ) : (
                    <button className="btn btn-sm settings-delete-btn" onClick={() => setConfirmDeleteId(rec.id)}>Delete</button>
                  )}
                </div>
                {isPlaying && url && (
                  <div className="rs-card-player">
                    <audio src={url} controls autoPlay onEnded={() => setPlayingId(null)} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="settings-empty">
          {recordings.length === 0
            ? 'No recordings yet. Hit "Record" to capture your first take, or "Import" to add an audio file.'
            : 'No recordings match this filter.'}
        </div>
      )}
    </div>
  )
}

// ── Standalone Recorder (owns its own mic stream) ────────────────────────────

function StudioRecorder({ onSaved }: { onSaved: () => void }) {
  const user = useStore((s) => s.user)
  const [state, setState] = useState<'idle' | 'recording' | 'recorded'>('idle')
  const [duration, setDuration] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [skillId, setSkillId] = useState('')
  const [bpm, setBpm] = useState<string>('')
  const [label, setLabel] = useState('')
  const [error, setError] = useState<string | null>(null)

  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef(0)

  // Waveform
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const rafRef = useRef<number>(0)

  const skills = getAllSkills().filter((s) =>
    user ? (s.path === user.path || s.path === 'all') : true
  )

  async function startRecording() {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Set up analyser for waveform
      const ctx = new AudioContext()
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 2048
      source.connect(analyser)
      analyserRef.current = analyser

      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      })
      chunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType })
        setAudioBlob(blob)
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
        setState('recorded')
      }
      recorderRef.current = recorder
      recorder.start(250)

      startTimeRef.current = Date.now()
      setDuration(0)
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }, 500)

      setState('recording')
      drawWaveform()
    } catch {
      setError('Could not access microphone. Check permissions.')
    }
  }

  function stopRecording() {
    recorderRef.current?.stop()
    streamRef.current?.getTracks().forEach((t) => t.stop())
    if (timerRef.current) clearInterval(timerRef.current)
    cancelAnimationFrame(rafRef.current)
  }

  function discard() {
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setAudioBlob(null)
    setAudioUrl(null)
    setDuration(0)
    setState('idle')
  }

  async function save() {
    if (!audioBlob) return
    const sid = skillId || 'general'
    const recording: Recording = {
      id: newId(),
      sessionItemId: '',
      skillId: sid,
      audioBlob,
      durationSeconds: duration,
      bpm: bpm ? parseInt(bpm) : null,
      createdAt: nowISO(),
    }
    await db.recordings.add(recording)
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    onSaved()
  }

  function drawWaveform() {
    const canvas = canvasRef.current
    const analyser = analyserRef.current
    if (!canvas || !analyser) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const bufferLength = analyser.frequencyBinCount
    const data = new Uint8Array(bufferLength)

    function draw() {
      rafRef.current = requestAnimationFrame(draw)
      analyser!.getByteTimeDomainData(data)

      ctx!.fillStyle = 'var(--bg-secondary, #1a1a2e)'
      ctx!.fillRect(0, 0, canvas!.width, canvas!.height)

      ctx!.lineWidth = 2
      ctx!.strokeStyle = state === 'recording' ? '#ef4444' : '#4a9eff'
      ctx!.beginPath()

      const sliceWidth = canvas!.width / bufferLength
      let x = 0
      for (let i = 0; i < bufferLength; i++) {
        const v = data[i] / 128.0
        const y = (v * canvas!.height) / 2
        if (i === 0) ctx!.moveTo(x, y)
        else ctx!.lineTo(x, y)
        x += sliceWidth
      }
      ctx!.lineTo(canvas!.width, canvas!.height / 2)
      ctx!.stroke()
    }
    draw()
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
      if (timerRef.current) clearInterval(timerRef.current)
      cancelAnimationFrame(rafRef.current)
      if (audioUrl) URL.revokeObjectURL(audioUrl)
    }
  }, [])

  const mm = Math.floor(duration / 60)
  const ss = String(duration % 60).padStart(2, '0')

  return (
    <div className="sr-recorder">
      <h3 className="sr-recorder-title">Record Audio</h3>

      {/* Waveform */}
      <canvas ref={canvasRef} className="sr-waveform" width={600} height={100} />

      {/* Timer */}
      <div className="sr-timer">{mm}:{ss}</div>

      {/* Controls */}
      <div className="sr-controls">
        {state === 'idle' && (
          <button className="btn btn-primary sr-rec-btn" onClick={startRecording}>
            ● Record
          </button>
        )}
        {state === 'recording' && (
          <button className="btn sr-stop-btn" onClick={stopRecording}>
            ■ Stop
          </button>
        )}
        {state === 'recorded' && (
          <>
            {audioUrl && (
              <div className="sr-playback">
                <audio src={audioUrl} controls />
              </div>
            )}

            {/* Metadata */}
            <div className="sr-meta">
              <div className="sr-meta-row">
                <label className="sr-meta-label">Skill</label>
                <select className="sr-meta-select" value={skillId} onChange={(e) => setSkillId(e.target.value)}>
                  <option value="">General / Unassigned</option>
                  {skills.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="sr-meta-row">
                <label className="sr-meta-label">BPM</label>
                <input
                  type="number"
                  className="sr-meta-input"
                  placeholder="Optional"
                  value={bpm}
                  onChange={(e) => setBpm(e.target.value)}
                  min={40}
                  max={220}
                />
              </div>
            </div>

            <div className="sr-save-actions">
              <button className="btn btn-primary" onClick={save}>Save Recording</button>
              <button className="btn btn-secondary" onClick={discard}>Discard</button>
            </div>
          </>
        )}
      </div>

      {error && <div className="sr-error">{error}</div>}
    </div>
  )
}

// ── File Importer ────────────────────────────────────────────────────────────

function FileImporter({ onSaved }: { onSaved: () => void }) {
  const user = useStore((s) => s.user)
  const [file, setFile] = useState<File | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [duration, setDuration] = useState(0)
  const [skillId, setSkillId] = useState('')
  const [bpm, setBpm] = useState<string>('')
  const audioRef = useRef<HTMLAudioElement>(null)

  const skills = getAllSkills().filter((s) =>
    user ? (s.path === user.path || s.path === 'all') : true
  )

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setFile(f)
    const url = URL.createObjectURL(f)
    setAudioUrl(url)
  }

  function handleLoadedMetadata() {
    if (audioRef.current) {
      setDuration(Math.floor(audioRef.current.duration))
    }
  }

  async function save() {
    if (!file) return
    const blob = new Blob([await file.arrayBuffer()], { type: file.type })
    const sid = skillId || 'general'
    const recording: Recording = {
      id: newId(),
      sessionItemId: '',
      skillId: sid,
      audioBlob: blob,
      durationSeconds: duration,
      bpm: bpm ? parseInt(bpm) : null,
      createdAt: nowISO(),
    }
    await db.recordings.add(recording)
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    onSaved()
  }

  useEffect(() => {
    return () => { if (audioUrl) URL.revokeObjectURL(audioUrl) }
  }, [])

  return (
    <div className="sr-importer">
      <h3 className="sr-recorder-title">Import Audio File</h3>
      <p className="rs-desc">Import an audio file (.mp3, .wav, .m4a, .ogg, .webm) as a reference recording.</p>

      <label className="sr-file-btn">
        {file ? file.name : 'Choose Audio File'}
        <input type="file" accept="audio/*" onChange={handleFileChange} hidden />
      </label>

      {audioUrl && (
        <>
          <div className="sr-playback">
            <audio ref={audioRef} src={audioUrl} controls onLoadedMetadata={handleLoadedMetadata} />
          </div>

          <div className="sr-meta">
            <div className="sr-meta-row">
              <label className="sr-meta-label">Skill</label>
              <select className="sr-meta-select" value={skillId} onChange={(e) => setSkillId(e.target.value)}>
                <option value="">General / Unassigned</option>
                {skills.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="sr-meta-row">
              <label className="sr-meta-label">BPM</label>
              <input
                type="number"
                className="sr-meta-input"
                placeholder="Optional"
                value={bpm}
                onChange={(e) => setBpm(e.target.value)}
                min={40}
                max={220}
              />
            </div>
          </div>

          <div className="sr-save-actions">
            <button className="btn btn-primary" onClick={save}>Save Recording</button>
          </div>
        </>
      )}
    </div>
  )
}

// ── Recording Guide — tells the user exactly what to record ──────────────

const RECORDING_CHECKLIST = [
  {
    title: 'Forward Roll — Slow (60 BPM)',
    skillId: 'forward_roll',
    bpm: 60,
    desc: 'Play the forward roll (3-2-1-5-3-2-1-5) cleanly at 60 BPM for 30 seconds. This becomes the reference for Ghost Mode at beginner tempo.',
  },
  {
    title: 'Forward Roll — Medium (100 BPM)',
    skillId: 'forward_roll',
    bpm: 100,
    desc: 'Same pattern at 100 BPM for 30 seconds. Used for intermediate Ghost Mode comparison.',
  },
  {
    title: 'Backward Roll — Slow (60 BPM)',
    skillId: 'backward_roll',
    bpm: 60,
    desc: 'Play the backward roll (1-2-3-5-1-2-3-5) cleanly at 60 BPM for 30 seconds.',
  },
  {
    title: 'Alternating Thumb — Slow (60 BPM)',
    skillId: 'alternating_thumb',
    bpm: 60,
    desc: 'Play the alternating thumb pattern at 60 BPM for 30 seconds.',
  },
  {
    title: 'Cripple Creek — Full Song',
    skillId: 'cripple_creek',
    bpm: 80,
    desc: 'Play through Cripple Creek at a comfortable tempo. Used for song-level Ghost Mode and backing track reference.',
  },
  {
    title: 'Foggy Mountain — Full Song',
    skillId: 'foggy_mountain',
    bpm: 90,
    desc: 'Play through Foggy Mountain Breakdown at your best comfortable tempo.',
  },
]

function RecordingGuide() {
  return (
    <div className="rs-guide">
      <h4 className="rs-guide-title">What to Record</h4>
      <p className="rs-guide-intro">
        These recordings power <strong>Ghost Mode</strong> — play alongside your own reference recordings to track improvement over time. Record each one with a metronome for best results.
      </p>
      <div className="rs-guide-list">
        {RECORDING_CHECKLIST.map((item, i) => (
          <div key={i} className="rs-guide-item">
            <div className="rs-guide-item-header">
              <span className="rs-guide-item-num">{i + 1}</span>
              <span className="rs-guide-item-title">{item.title}</span>
              <span className="rs-guide-item-bpm">{item.bpm} BPM</span>
            </div>
            <p className="rs-guide-item-desc">{item.desc}</p>
          </div>
        ))}
      </div>
      <div className="rs-guide-tips">
        <h5 className="rs-guide-tips-title">Recording Tips</h5>
        <ul className="rs-guide-tips-list">
          <li>Use headphones for the metronome so it doesn't bleed into the mic</li>
          <li>Record in a quiet room — the mic picks up everything</li>
          <li>Tag each recording with the correct skill and BPM after saving</li>
          <li>Start each recording with 2 beats of silence, then begin on beat 1</li>
          <li>Aim for 30 seconds minimum — longer is fine</li>
        </ul>
      </div>
    </div>
  )
}
