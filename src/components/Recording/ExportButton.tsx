// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Export Button
// Download recording as audio file + optional metadata card as PNG.
// ─────────────────────────────────────────────────────────────────────────────

import type { Recording } from '../../db/db'
import { SKILL_MAP } from '../../data/curriculum'

interface ExportButtonProps {
  recording: Recording
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function renderMetadataCard(recording: Recording): Promise<Blob> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    canvas.width = 400
    canvas.height = 200
    const ctx = canvas.getContext('2d')!

    // Background
    ctx.fillStyle = '#1a1a1a'
    ctx.roundRect(0, 0, 400, 200, 12)
    ctx.fill()

    // Title
    const skill = SKILL_MAP.get(recording.skillId)
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 18px -apple-system, sans-serif'
    ctx.fillText(skill?.name ?? recording.skillId, 20, 36)

    // App name
    ctx.fillStyle = '#888'
    ctx.font = '12px -apple-system, sans-serif'
    ctx.fillText('Banjo Buddy', 20, 56)

    // Stats
    ctx.fillStyle = '#4a9eff'
    ctx.font = 'bold 28px -apple-system, sans-serif'
    if (recording.bpm) {
      ctx.fillText(`${recording.bpm} BPM`, 20, 100)
    }

    ctx.fillStyle = '#ccc'
    ctx.font = '14px -apple-system, sans-serif'
    ctx.fillText(`Duration: ${Math.round(recording.durationSeconds)}s`, 20, 130)

    const dateStr = new Date(recording.createdAt).toLocaleDateString(undefined, {
      year: 'numeric', month: 'long', day: 'numeric',
    })
    ctx.fillText(dateStr, 20, 155)

    // Banjo emoji
    ctx.font = '48px serif'
    ctx.fillText('🪕', 320, 100)

    canvas.toBlob((blob) => resolve(blob!), 'image/png')
  })
}

export function ExportButton({ recording }: ExportButtonProps) {
  const skill = SKILL_MAP.get(recording.skillId)
  const safeName = (skill?.name ?? 'recording').replace(/[^a-zA-Z0-9]/g, '_')

  async function handleExportAudio() {
    const ext = recording.audioBlob.type.includes('ogg') ? 'ogg' : 'webm'
    downloadBlob(recording.audioBlob, `${safeName}_${recording.createdAt.slice(0, 10)}.${ext}`)
  }

  async function handleExportCard() {
    const blob = await renderMetadataCard(recording)
    downloadBlob(blob, `${safeName}_card.png`)
  }

  return (
    <div className="export-buttons">
      <button className="btn btn-secondary" onClick={handleExportAudio}>
        Download Audio
      </button>
      <button className="btn btn-secondary" onClick={handleExportCard}>
        Download Card
      </button>
    </div>
  )
}
