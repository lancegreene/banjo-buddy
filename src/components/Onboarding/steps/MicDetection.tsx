import { useState, useEffect, useRef } from 'react'

interface Props {
  onComplete: () => void
}

export function MicDetection({ onComplete }: Props) {
  const [status, setStatus] = useState<'waiting' | 'requesting' | 'granted' | 'denied'>('waiting')
  const [level, setLevel] = useState(0)
  const frameRef = useRef(0)
  const streamRef = useRef<MediaStream | null>(null)

  async function requestMic() {
    setStatus('requesting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      setStatus('granted')

      // Monitor audio level
      const ctx = new AudioContext()
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      const data = new Uint8Array(analyser.frequencyBinCount)

      function poll() {
        analyser.getByteTimeDomainData(data)
        let sum = 0
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128
          sum += v * v
        }
        const rms = Math.sqrt(sum / data.length)
        setLevel(rms)

        // Auto-advance when we detect sound
        if (rms > 0.05) {
          setTimeout(onComplete, 500)
          return
        }
        frameRef.current = requestAnimationFrame(poll)
      }
      poll()
    } catch {
      setStatus('denied')
    }
  }

  useEffect(() => {
    return () => {
      cancelAnimationFrame(frameRef.current)
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [])

  return (
    <div className="onboarding-mic">
      <h2 className="onboarding-title">Let's Set Up Your Mic</h2>
      <p className="onboarding-desc">Banjo Buddy listens to your playing to give real-time feedback.</p>

      {status === 'waiting' && (
        <button className="btn btn-primary" onClick={requestMic}>
          Enable Microphone
        </button>
      )}

      {status === 'requesting' && (
        <p className="onboarding-status">Requesting access...</p>
      )}

      {status === 'granted' && (
        <div className="onboarding-level">
          <p className="onboarding-status">Microphone active! Play a note or make a sound...</p>
          <div className="onboarding-level-bar">
            <div
              className="onboarding-level-fill"
              style={{ width: `${Math.min(100, level * 500)}%` }}
            />
          </div>
        </div>
      )}

      {status === 'denied' && (
        <div className="onboarding-error">
          <p>Microphone access was denied. Please enable it in your browser settings.</p>
          <button className="btn btn-secondary" onClick={requestMic}>
            Try Again
          </button>
        </div>
      )}
    </div>
  )
}
