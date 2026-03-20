// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Tab Cropper
// Upload one tablature image, define multiple crop regions (measures), and save
// each as a tab_crop clip linked to the source image.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useEffect, useCallback } from 'react'
import { saveClip } from '../../engine/teacherClipService'
import { cropImageBlob, generateThumbnailFromImage } from '../../engine/imageCropService'
import { useStore } from '../../store/useStore'
import { SKILLS } from '../../data/curriculum'
import { ROLL_PATTERNS } from '../../data/rollPatterns'
import type { CropRect } from '../../db/db'

interface TabCropperProps {
  skillId?: string | null
  rollPatternId?: string | null
  onSaved?: () => void
  onCancel?: () => void
}

interface CropRegion {
  rect: CropRect
  label: string
}

export function TabCropper({ skillId, rollPatternId, onSaved, onCancel }: TabCropperProps) {
  const user = useStore((s) => s.user)

  const [imageBlob, setImageBlob] = useState<Blob | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [regions, setRegions] = useState<CropRegion[]>([])
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)
  const [currentDrag, setCurrentDrag] = useState<CropRect | null>(null)
  const [title, setTitle] = useState('')
  const [selectedSkillId, setSelectedSkillId] = useState<string>(skillId ?? '')
  const [selectedPatternId, setSelectedPatternId] = useState<string>(rollPatternId ?? '')
  const [saving, setSaving] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)

  useEffect(() => {
    return () => { if (imageUrl) URL.revokeObjectURL(imageUrl) }
  }, [imageUrl])

  function handleFileSelect(file: File) {
    if (!file.type.startsWith('image/')) return
    if (imageUrl) URL.revokeObjectURL(imageUrl)
    setImageBlob(file)
    setImageUrl(URL.createObjectURL(file))
    setRegions([])
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  // Colors for crop regions
  const COLORS = ['#4a9eff', '#ff6b6b', '#51cf66', '#ffd43b', '#cc5de8', '#ff922b', '#20c997', '#f06595']

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const img = imgRef.current
    if (!canvas || !img || !img.naturalWidth) return
    const ctx = canvas.getContext('2d')!
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    ctx.drawImage(img, 0, 0)

    // Draw all saved regions
    regions.forEach((region, i) => {
      const { x, y, w, h } = region.rect
      const sx = x * canvas.width, sy = y * canvas.height
      const sw = w * canvas.width, sh = h * canvas.height
      ctx.strokeStyle = COLORS[i % COLORS.length]
      ctx.lineWidth = 3
      ctx.strokeRect(sx, sy, sw, sh)
      // Label
      ctx.fillStyle = COLORS[i % COLORS.length]
      ctx.font = `bold ${Math.max(14, canvas.width / 40)}px sans-serif`
      ctx.fillText(region.label, sx + 4, sy + Math.max(16, canvas.width / 35))
    })

    // Draw current drag
    if (currentDrag) {
      const { x, y, w, h } = currentDrag
      ctx.strokeStyle = COLORS[regions.length % COLORS.length]
      ctx.lineWidth = 2
      ctx.setLineDash([6, 4])
      ctx.strokeRect(x * canvas.width, y * canvas.height, w * canvas.width, h * canvas.height)
      ctx.setLineDash([])
    }
  }, [regions, currentDrag, COLORS])

  useEffect(() => {
    drawCanvas()
  }, [drawCanvas])

  function handlePointerDown(e: React.PointerEvent) {
    if (regions.length >= 8) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    setDragStart({
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    })
    setCurrentDrag(null)
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragStart) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const ex = (e.clientX - rect.left) / rect.width
    const ey = (e.clientY - rect.top) / rect.height
    setCurrentDrag({
      x: Math.min(dragStart.x, ex),
      y: Math.min(dragStart.y, ey),
      w: Math.abs(ex - dragStart.x),
      h: Math.abs(ey - dragStart.y),
    })
  }

  function handlePointerUp() {
    if (currentDrag && currentDrag.w > 0.01 && currentDrag.h > 0.01) {
      const n = regions.length + 1
      setRegions([...regions, {
        rect: currentDrag,
        label: `Measures ${n * 2 - 1}-${n * 2}`,
      }])
    }
    setDragStart(null)
    setCurrentDrag(null)
  }

  function removeRegion(index: number) {
    const updated = regions.filter((_, i) => i !== index)
    // Relabel
    setRegions(updated.map((r, i) => ({ ...r, label: `Measures ${(i + 1) * 2 - 1}-${(i + 1) * 2}` })))
  }

  function updateRegionLabel(index: number, label: string) {
    setRegions(regions.map((r, i) => i === index ? { ...r, label } : r))
  }

  async function handleSave() {
    if (!user || !imageBlob || regions.length === 0) return
    setSaving(true)

    // 1. Save the source image
    const sourceThumbnail = await generateThumbnailFromImage(imageBlob)
    const sourceId = await saveClip({
      teacherId: user.id,
      skillId: selectedSkillId || null,
      rollPatternId: selectedPatternId || null,
      mediaType: 'image',
      videoBlob: null,
      audioBlob: null,
      imageBlob,
      thumbnailBlob: sourceThumbnail,
      sourceImageId: null,
      cropRect: null,
      sortOrder: null,
      durationSeconds: 0,
      trimStart: 0,
      trimEnd: 0,
      title: title || 'Tab Image',
    })

    // 2. Save each crop region
    for (let i = 0; i < regions.length; i++) {
      const region = regions[i]
      const croppedBlob = await cropImageBlob(imageBlob, region.rect)
      const cropThumb = await generateThumbnailFromImage(croppedBlob)
      await saveClip({
        teacherId: user.id,
        skillId: selectedSkillId || null,
        rollPatternId: selectedPatternId || null,
        mediaType: 'tab_crop',
        videoBlob: null,
        audioBlob: null,
        imageBlob: croppedBlob,
        thumbnailBlob: cropThumb,
        sourceImageId: sourceId,
        cropRect: region.rect,
        sortOrder: i,
        durationSeconds: 0,
        trimStart: 0,
        trimEnd: 0,
        title: region.label,
      })
    }

    setSaving(false)
    onSaved?.()
  }

  return (
    <div className="video-recorder">
      <h3 className="video-recorder-title">Upload Tab Image</h3>
      <p className="tab-cropper-desc">
        Upload a tablature image, then draw rectangles to split it into measure groups.
      </p>

      {!imageUrl && (
        <div
          className="image-uploader-dropzone"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          <p>Drag & drop a tab image here, or</p>
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

      {imageUrl && (
        <>
          <div className="tab-cropper-canvas-wrap">
            <canvas
              ref={canvasRef}
              className="tab-cropper-canvas"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            />
            {/* Hidden img for canvas source */}
            <img
              ref={(el) => {
                imgRef.current = el
                if (el) el.onload = drawCanvas
              }}
              src={imageUrl}
              alt=""
              style={{ display: 'none' }}
            />
            {regions.length < 8 && (
              <p className="tab-cropper-hint">Click and drag to define a crop region ({regions.length}/8)</p>
            )}
          </div>

          {/* Region list */}
          {regions.length > 0 && (
            <div className="tab-cropper-regions">
              <h4 className="tab-cropper-regions-title">Crop Regions</h4>
              {regions.map((region, i) => (
                <div key={i} className="tab-cropper-region-row">
                  <span
                    className="tab-cropper-region-color"
                    style={{ background: COLORS[i % COLORS.length] }}
                  />
                  <input
                    type="text"
                    className="tab-cropper-region-label"
                    value={region.label}
                    onChange={(e) => updateRegionLabel(i, e.target.value)}
                  />
                  <button className="btn btn-sm settings-delete-btn" onClick={() => removeRegion(i)}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="video-recorder-meta">
            <div className="video-recorder-field">
              <label className="video-recorder-field-label">Title</label>
              <input
                type="text"
                className="video-recorder-input"
                placeholder="e.g. Cripple Creek tab"
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
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={saving || regions.length === 0}
              >
                {saving ? 'Saving...' : `Save ${regions.length} Crop${regions.length !== 1 ? 's' : ''}`}
              </button>
              <button className="btn btn-secondary" onClick={onCancel}>Discard</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
