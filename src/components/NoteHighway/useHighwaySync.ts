import { useRef, useCallback, useEffect } from 'react'
import { NoteHighwayRenderer } from './NoteHighwayRenderer'
import type { HighwayNote, HighwayConfig } from './noteHighwayTypes'
import type { CapturedNote } from '../../engine/noteCapture'

interface UseHighwaySyncProps {
  notes: HighwayNote[]
  config?: Partial<HighwayConfig>
  hitWindowMs?: number
}

export function useHighwaySync({ notes, config, hitWindowMs = 100 }: UseHighwaySyncProps) {
  const rendererRef = useRef<NoteHighwayRenderer | null>(null)
  const startTimeRef = useRef<number>(0)

  const canvasRef = useCallback((canvas: HTMLCanvasElement | null) => {
    if (rendererRef.current) {
      rendererRef.current.destroy()
      rendererRef.current = null
    }
    if (canvas) {
      // Set canvas size to match display
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * devicePixelRatio
      canvas.height = rect.height * devicePixelRatio
      canvas.getContext('2d')!.scale(devicePixelRatio, devicePixelRatio)
      // Renderer works in CSS pixels
      Object.defineProperty(canvas, 'width', { get: () => rect.width })
      Object.defineProperty(canvas, 'height', { get: () => rect.height })

      rendererRef.current = new NoteHighwayRenderer(canvas, config)
      rendererRef.current.setNotes(notes)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setNotes(notes)
    }
  }, [notes])

  const start = useCallback(() => {
    startTimeRef.current = performance.now()
    rendererRef.current?.start()
  }, [])

  const stop = useCallback(() => {
    rendererRef.current?.stop()
  }, [])

  const handleCapturedNote = useCallback((captured: CapturedNote) => {
    const renderer = rendererRef.current
    if (!renderer) return

    const elapsedSec = (captured.timestamp - startTimeRef.current) / 1000
    const windowSec = hitWindowMs / 1000

    // Find closest upcoming note on the same string within hit window
    const match = notes.find(n =>
      n.string === captured.banjoString &&
      n.state === 'upcoming' &&
      Math.abs(n.time - elapsedSec) <= windowSec
    )

    if (match) {
      renderer.markNote(match.id, 'hit')
    }
  }, [notes, hitWindowMs])

  return { canvasRef, start, stop, handleCapturedNote }
}
