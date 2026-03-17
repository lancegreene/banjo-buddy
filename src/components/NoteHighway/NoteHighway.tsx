import { useRef, useEffect } from 'react'
import { NoteHighwayRenderer } from './NoteHighwayRenderer'
import type { HighwayNote, HighwayConfig } from './noteHighwayTypes'

interface Props {
  notes: HighwayNote[]
  config?: Partial<HighwayConfig>
  playing?: boolean
  currentTime?: number
}

export function NoteHighway({ notes, config, playing = false, currentTime }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<NoteHighwayRenderer | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const observer = new ResizeObserver(() => {
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * devicePixelRatio
      canvas.height = rect.height * devicePixelRatio
      const ctx = canvas.getContext('2d')!
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)
    })
    observer.observe(canvas)

    rendererRef.current = new NoteHighwayRenderer(canvas, config)
    rendererRef.current.setNotes(notes)

    return () => {
      observer.disconnect()
      rendererRef.current?.destroy()
      rendererRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    rendererRef.current?.setNotes(notes)
  }, [notes])

  useEffect(() => {
    if (currentTime !== undefined) {
      rendererRef.current?.setCurrentTime(currentTime)
    }
  }, [currentTime])

  useEffect(() => {
    if (playing) {
      rendererRef.current?.start()
    } else {
      rendererRef.current?.stop()
    }
  }, [playing])

  return (
    <div className="note-highway-container">
      <canvas
        ref={canvasRef}
        className="note-highway-canvas"
      />
    </div>
  )
}
