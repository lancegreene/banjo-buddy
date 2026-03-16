// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Waveform Display
// Simple waveform visualization from audio blob.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react'

interface WaveformDisplayProps {
  audioBlob: Blob
  color?: string
  height?: number
}

export function WaveformDisplay({ audioBlob, color = '#4a9eff', height = 60 }: WaveformDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const audioCtx = new AudioContext()
    const reader = new FileReader()

    reader.onload = async () => {
      try {
        const buffer = await audioCtx.decodeAudioData(reader.result as ArrayBuffer)
        const data = buffer.getChannelData(0)
        drawWaveform(ctx, data, canvas.width, canvas.height, color)
      } catch {
        // Decode error — draw flat line
        ctx.strokeStyle = color
        ctx.beginPath()
        ctx.moveTo(0, canvas.height / 2)
        ctx.lineTo(canvas.width, canvas.height / 2)
        ctx.stroke()
      } finally {
        audioCtx.close()
      }
    }

    reader.readAsArrayBuffer(audioBlob)
  }, [audioBlob, color])

  return (
    <canvas
      ref={canvasRef}
      className="waveform-canvas"
      width={448}
      height={height}
    />
  )
}

function drawWaveform(
  ctx: CanvasRenderingContext2D,
  data: Float32Array,
  width: number,
  height: number,
  color: string
) {
  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = '#1a1a1a'
  ctx.fillRect(0, 0, width, height)

  const step = Math.ceil(data.length / width)
  const halfH = height / 2

  ctx.strokeStyle = color
  ctx.lineWidth = 1
  ctx.beginPath()

  for (let i = 0; i < width; i++) {
    const start = i * step
    let min = 1
    let max = -1
    for (let j = 0; j < step && start + j < data.length; j++) {
      const val = data[start + j]
      if (val < min) min = val
      if (val > max) max = val
    }
    const yLow = halfH + min * halfH
    const yHigh = halfH + max * halfH
    ctx.moveTo(i, yLow)
    ctx.lineTo(i, yHigh)
  }

  ctx.stroke()
}
