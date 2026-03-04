// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Calibration Wizard
// Records 20 seconds of the user's playing, analyzes raw audio frames, and
// saves personalized clarity + RMS thresholds to localStorage.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useCallback, useEffect } from 'react'
import { PitchDetector } from 'pitchy'
import {
  analyzeFrames,
  saveCalibration,
  loadCalibration,
  clearCalibration,
  type CalibrationAnalysis,
} from '../../utils/calibration'
import { DEFAULT_CONFIG } from '../../engine/noteCapture'
import { computeRms } from '../../engine/noteCapture'

const RECORD_SECONDS = 20

interface CalibrationWizardProps {
  onClose: () => void
}

type Step = 'intro' | 'recording' | 'results'

export function CalibrationWizard({ onClose }: CalibrationWizardProps) {
  const [step, setStep] = useState<Step>('intro')
  const [progress, setProgress] = useState(0)          // 0–100
  const [liveRms, setLiveRms] = useState(0)
  const [analysis, setAnalysis] = useState<CalibrationAnalysis | null>(null)
  const [saved, setSaved] = useState(false)

  const audioContextRef = useRef<AudioContext | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(0)
  const framesRef = useRef<{ rms: number; clarity: number }[]>([])

  const existing = loadCalibration()

  const stopAudio = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    audioContextRef.current?.close()
    audioContextRef.current = null
    streamRef.current = null
  }, [])

  useEffect(() => () => stopAudio(), [stopAudio])

  const startRecording = useCallback(async () => {
    framesRef.current = []
    setProgress(0)
    setLiveRms(0)
    setStep('recording')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        video: false,
      })
      const audioContext = new AudioContext()
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 1024
      audioContext.createMediaStreamSource(stream).connect(analyser)

      const detector = PitchDetector.forFloat32Array(analyser.fftSize)
      const input = new Float32Array(detector.inputLength)

      audioContextRef.current = audioContext
      streamRef.current = stream
      startTimeRef.current = performance.now()

      function collect() {
        if (!audioContext || audioContext.state === 'closed') return

        const elapsed = performance.now() - startTimeRef.current
        const pct = Math.min(100, (elapsed / (RECORD_SECONDS * 1000)) * 100)
        setProgress(pct)

        analyser.getFloatTimeDomainData(input)
        const [, clarity] = detector.findPitch(input, audioContext.sampleRate)
        const rms = computeRms(input)

        setLiveRms(rms)
        framesRef.current.push({ rms, clarity })

        if (elapsed >= RECORD_SECONDS * 1000) {
          stopAudio()
          const result = analyzeFrames(framesRef.current)
          setAnalysis(result)
          setStep('results')
          return
        }

        animFrameRef.current = requestAnimationFrame(collect)
      }
      collect()
    } catch {
      setStep('intro')
    }
  }, [stopAudio])

  function handleSave() {
    if (!analysis) return
    saveCalibration({
      clarityThreshold: analysis.suggestedClarityThreshold,
      onsetRmsThreshold: analysis.suggestedRmsThreshold,
      calibratedAt: new Date().toISOString(),
    })
    setSaved(true)
  }

  function handleClear() {
    clearCalibration()
    onClose()
  }

  const rmsBarWidth = Math.min(100, (liveRms / 0.1) * 100)

  return (
    <div className="calibration-wizard">
      {step === 'intro' && (
        <>
          <div className="cal-title">Audio Calibration</div>
          <div className="cal-body">
            <p>
              This records <strong>20 seconds</strong> of your playing to find the
              best sensitivity settings for your microphone and picking style.
            </p>
            <p>When you tap Start, play naturally — single notes, rolls, whatever you like.
              Include some soft plucks (index finger on string 1) and some louder ones.</p>
            {existing && (
              <div className="cal-existing">
                Last calibrated: {new Date(existing.calibratedAt).toLocaleDateString()}<br />
                Clarity: {existing.clarityThreshold} · RMS: {existing.onsetRmsThreshold}
              </div>
            )}
          </div>
          <div className="cal-actions">
            <button className="play-btn" onClick={startRecording}>▶ Start Recording</button>
            {existing && (
              <button className="cal-clear-btn" onClick={handleClear}>Remove Calibration</button>
            )}
            <button className="cal-cancel-btn" onClick={onClose}>Cancel</button>
          </div>
        </>
      )}

      {step === 'recording' && (
        <>
          <div className="cal-title">Recording…</div>
          <div className="cal-body">
            <p>Play your banjo naturally — rolls, single notes, anything.</p>
            <p>Include some <strong>soft index-finger plucks</strong> on string 1.</p>

            <div className="cal-progress-track">
              <div className="cal-progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <div className="cal-progress-label">{Math.round(progress)}% — {Math.round(RECORD_SECONDS - (progress / 100) * RECORD_SECONDS)}s left</div>

            <div className="cal-rms-label">Live level</div>
            <div className="cal-rms-track">
              <div
                className="cal-rms-fill"
                style={{ width: `${rmsBarWidth}%`, backgroundColor: rmsBarWidth > 60 ? '#7ed321' : rmsBarWidth > 20 ? '#f5a623' : '#555' }}
              />
            </div>
          </div>
        </>
      )}

      {step === 'results' && analysis && (
        <>
          <div className="cal-title">Calibration Results</div>
          <div className="cal-body">
            <div className="cal-stat-grid">
              <div className="cal-stat">
                <span className="cal-stat-label">Noise floor</span>
                <span className="cal-stat-value">{analysis.noiseFloor.toFixed(4)}</span>
              </div>
              <div className="cal-stat">
                <span className="cal-stat-label">Softest note</span>
                <span className="cal-stat-value">{analysis.softestNote.toFixed(4)}</span>
              </div>
              <div className="cal-stat">
                <span className="cal-stat-label">Active frames</span>
                <span className="cal-stat-value">{analysis.activeFrameCount} / {analysis.frameCount}</span>
              </div>
            </div>

            <table className="cal-compare-table">
              <thead>
                <tr><th>Setting</th><th>Default</th><th>Suggested</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td>Clarity threshold</td>
                  <td>{DEFAULT_CONFIG.clarityThreshold}</td>
                  <td className="cal-suggest">{analysis.suggestedClarityThreshold}</td>
                </tr>
                <tr>
                  <td>RMS threshold</td>
                  <td>{DEFAULT_CONFIG.onsetRmsThreshold}</td>
                  <td className="cal-suggest">{analysis.suggestedRmsThreshold}</td>
                </tr>
              </tbody>
            </table>

            {analysis.activeFrameCount < 100 && (
              <div className="cal-warn">
                ⚠ Only {analysis.activeFrameCount} active frames detected — try recording again with more playing.
              </div>
            )}
          </div>

          <div className="cal-actions">
            {saved ? (
              <div className="cal-saved-msg">✓ Saved — restart Listen to apply</div>
            ) : (
              <button className="play-btn" onClick={handleSave}>Save These Settings</button>
            )}
            <button className="cal-cancel-btn" onClick={() => setStep('intro')}>Re-record</button>
            <button className="cal-cancel-btn" onClick={onClose}>Close</button>
          </div>
        </>
      )}
    </div>
  )
}
