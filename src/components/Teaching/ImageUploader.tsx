// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Image Uploader for Teacher Clips
// Upload + optional crop + save reference images attached to skills.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useEffect, useCallback } from 'react'
import { saveClip } from '../../engine/teacherClipService'
import { generateThumbnailFromImage, cropImageBlob } from '../../engine/imageCropService'
import { useStore } from '../../store/useStore'
import { SKILLS } from '../../data/curriculum'
import { ROLL_PATTERNS } from '../../data/rollPatterns'
import type { CropRect } from '../../db/db'

interface ImageUploaderProps {
  skillId?: string | null
  rollPatternId?: string | null
  onSaved?: (clipId: string) => void
  onCancel?: () => void
}

export function ImageUploader({ skillId, rollPatternId, onSaved, onCancel }: ImageUploaderProps) {
  const user = useStore((s) => s.user)

  const [imageBlob, setImageBlob] = useState<Blob | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [selectedSkillId, setSelectedSkillId] = useState<string>(skillId ?? '')
  const [selectedPatternId, setSelectedPatternId] = useState<string>(rollPatternId ?? '')
  const [saving, setSaving] = useState(false)

  // Crop state
  const [cropping, setCropping] = useState(false)
  const [cropRect, setCropRect] = useState<CropRect | null>(null)
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)

  useEffect(() => {
    return () => { if (imageUrl) URL.revokeObjectURL(imageUrl) }
  }, [imageUrl])

  function handleFileSelect(file: File) {
    if (!file.type.startsWith('image/')) return
    if (imageUrl) URL.revokeObjectURL(imageUrl)
    const url = URL.createObjectURL(file)
    setImageBlob(file)
    setImageUrl(url)
    setCropRect(null)
    setCropping(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  // Draw crop overlay on canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const img = imgRef.current
    if (!canvas || !img) return
    const ctx = canvas.getContext('2d')!
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    ctx.drawImage(img, 0, 0)

    if (cropRect) {
      // Dim outside crop area
      ctx.fillStyle = 'rgba(0,0,0,0.5)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      // Clear crop region
      const sx = cropRect.x * canvas.width
      const sy = cropRect.y * canvas.height
      const sw = cropRect.w * canvas.width
      const sh = cropRect.h * canvas.height
      ctx.clearRect(sx, sy, sw, sh)
      ctx.drawImage(img, sx, sy, sw, sh, sx, sy, sw, sh)
      // Border
      ctx.strokeStyle = '#4a9eff'
      ctx.lineWidth = 2
      ctx.strokeRect(sx, sy, sw, sh)
    }
  }, [cropRect])

  useEffect(() => {
    if (cropping) drawCanvas()
  }, [cropping, cropRect, drawCanvas])

  function handleCanvasPointerDown(e: React.PointerEvent) {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    setDragStart({
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    })
    setCropRect(null)
  }

  function handleCanvasPointerMove(e: React.PointerEvent) {
    if (!dragStart) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const ex = (e.clientX - rect.left) / rect.width
    const ey = (e.clientY - rect.top) / rect.height
    setCropRect({
      x: Math.min(dragStart.x, ex),
      y: Math.min(dragStart.y, ey),
      w: Math.abs(ex - dragStart.x),
      h: Math.abs(ey - dragStart.y),
    })
  }

  function handleCanvasPointerUp() {
    setDragStart(null)
  }

  async function handleSave() {
    if (!user || !imageBlob) return
    setSaving(true)

    let finalBlob = imageBlob
    if (cropRect && cropRect.w > 0.01 && cropRect.h > 0.01) {
      finalBlob = await cropImageBlob(imageBlob, cropRect)
    }

    const thumbnailBlob = await generateThumbnailFromImage(finalBlob)

    const clipId = await saveClip({
      teacherId: user.id,
      skillId: selectedSkillId || null,
      rollPatternId: selectedPatternId || null,
      mediaType: 'image',
      videoBlob: null,
      audioBlob: null,
      imageBlob: finalBlob,
      thumbnailBlob,
      sourceImageId: null,
      cropRect: null,
      sortOrder: null,
      durationSeconds: 0,
      trimStart: 0,
      trimEnd: 0,
      title: title || 'Untitled Image',
    })
    setSaving(false)
    onSaved?.(clipId)
  }

  return (
    <div className="video-recorder">
      <h3 className="video-recorder-title">Upload Image</h3>

      {!imageUrl && (
        <div
          className="image-uploader-dropzone"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          <p>Drag & drop an image here, or</p>
          <label className="btn btn-primary btn-sm">
            Choose File
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => { if (e.target.files?.[0]) handleFileSelect(e.target.files[0]) }}
            />
          </label>
        </div>
      )}

      {imageUrl && !cropping && (
        <div className="image-uploader-preview">
          <img
            ref={(el) => { imgRef.current = el }}
            src={imageUrl}
            alt="Preview"
            className="image-uploader-img"
          />
          <button className="btn btn-sm" onClick={() => setCropping(true)}>
            Crop
          </button>
        </div>
      )}

      {imageUrl && cropping && (
        <div className="image-uploader-crop-wrap">
          <canvas
            ref={canvasRef}
            className="image-uploader-canvas"
            onPointerDown={handleCanvasPointerDown}
            onPointerMove={handleCanvasPointerMove}
            onPointerUp={handleCanvasPointerUp}
          />
          {/* Hidden img for canvas drawing */}
          <img
            ref={(el) => {
              imgRef.current = el
              if (el) { el.onload = drawCanvas }
            }}
            src={imageUrl}
            alt=""
            style={{ display: 'none' }}
          />
          <div className="image-uploader-crop-actions">
            <button className="btn btn-sm btn-primary" onClick={() => setCropping(false)}>
              {cropRect ? 'Apply Crop' : 'Cancel Crop'}
            </button>
            {cropRect && (
              <button className="btn btn-sm" onClick={() => { setCropRect(null); setCropping(false) }}>
                Clear Crop
              </button>
            )}
          </div>
        </div>
      )}

      {imageUrl && (
        <div className="video-recorder-meta">
          <div className="video-recorder-field">
            <label className="video-recorder-field-label">Title</label>
            <input
              type="text"
              className="video-recorder-input"
              placeholder="e.g. Chord diagram"
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
              {saving ? 'Saving...' : 'Save Image'}
            </button>
            <button className="btn btn-secondary" onClick={onCancel}>Discard</button>
          </div>
        </div>
      )}
    </div>
  )
}
