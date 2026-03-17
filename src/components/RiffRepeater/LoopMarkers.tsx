import { useRef, useCallback } from 'react'

interface Props {
  duration: number
  loopStart: number
  loopEnd: number
  onStartChange: (time: number) => void
  onEndChange: (time: number) => void
}

export function LoopMarkers({ duration, loopStart, loopEnd, onStartChange, onEndChange }: Props) {
  const trackRef = useRef<HTMLDivElement>(null)

  const timeFromX = useCallback((clientX: number) => {
    const track = trackRef.current
    if (!track || duration <= 0) return 0
    const rect = track.getBoundingClientRect()
    const fraction = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    return fraction * duration
  }, [duration])

  const handlePointerDown = useCallback((marker: 'start' | 'end') => (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)

    const onMove = (ev: PointerEvent) => {
      const time = timeFromX(ev.clientX)
      if (marker === 'start') {
        if (time < loopEnd - 0.3) onStartChange(Math.round(time * 10) / 10)
      } else {
        if (time > loopStart + 0.3) onEndChange(Math.round(time * 10) / 10)
      }
    }

    const onUp = () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
    }

    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
  }, [timeFromX, loopStart, loopEnd, onStartChange, onEndChange])

  if (duration <= 0) return null

  const startPct = (loopStart / duration) * 100
  const endPct = (loopEnd / duration) * 100

  return (
    <div className="loop-markers" ref={trackRef}>
      <div
        className="loop-markers-region"
        style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }}
      />
      <div
        className="loop-marker loop-marker-start"
        style={{ left: `${startPct}%` }}
        onPointerDown={handlePointerDown('start')}
      >
        A
      </div>
      <div
        className="loop-marker loop-marker-end"
        style={{ left: `${endPct}%` }}
        onPointerDown={handlePointerDown('end')}
      >
        B
      </div>
    </div>
  )
}
