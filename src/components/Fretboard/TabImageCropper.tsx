// ─── TabImageCropper — Zoom & crop a region of a tab image before OCR ───────

import { useState, useRef, useEffect, useCallback } from 'react'

interface CropRect {
  x: number
  y: number
  w: number
  h: number
}

interface TabImageCropperProps {
  imageUrl: string
  onCrop: (croppedBlob: Blob) => void
  onCancel: () => void
}

export function TabImageCropper({ imageUrl, onCrop, onCancel }: TabImageCropperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)

  const [imgLoaded, setImgLoaded] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  // Crop selection state
  const [selecting, setSelecting] = useState(false)
  const [selStart, setSelStart] = useState({ x: 0, y: 0 })
  const [crop, setCrop] = useState<CropRect | null>(null)

  // Load the image
  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      imgRef.current = img
      setImgLoaded(true)
    }
    img.src = imageUrl
  }, [imageUrl])

  // Draw the canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const img = imgRef.current
    if (!canvas || !img || !imgLoaded) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const container = containerRef.current
    if (!container) return

    canvas.width = container.clientWidth
    canvas.height = container.clientHeight

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Dark background
    ctx.fillStyle = '#1a1a1a'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw image with zoom and pan
    const scale = Math.min(canvas.width / img.width, canvas.height / img.height) * zoom
    const drawW = img.width * scale
    const drawH = img.height * scale
    const drawX = (canvas.width - drawW) / 2 + pan.x
    const drawY = (canvas.height - drawH) / 2 + pan.y

    ctx.drawImage(img, drawX, drawY, drawW, drawH)

    // Draw crop overlay
    if (crop) {
      // Dim everything outside crop
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
      ctx.fillRect(0, 0, canvas.width, crop.y)
      ctx.fillRect(0, crop.y, crop.x, crop.h)
      ctx.fillRect(crop.x + crop.w, crop.y, canvas.width - crop.x - crop.w, crop.h)
      ctx.fillRect(0, crop.y + crop.h, canvas.width, canvas.height - crop.y - crop.h)

      // Crop border
      ctx.strokeStyle = '#D4A04A'
      ctx.lineWidth = 2
      ctx.setLineDash([6, 3])
      ctx.strokeRect(crop.x, crop.y, crop.w, crop.h)
      ctx.setLineDash([])

      // Corner handles
      const hs = 8
      ctx.fillStyle = '#D4A04A'
      const corners = [
        [crop.x, crop.y], [crop.x + crop.w, crop.y],
        [crop.x, crop.y + crop.h], [crop.x + crop.w, crop.y + crop.h],
      ]
      for (const [cx, cy] of corners) {
        ctx.fillRect(cx - hs / 2, cy - hs / 2, hs, hs)
      }
    }
  }, [imgLoaded, zoom, pan, crop])

  useEffect(() => { draw() }, [draw])

  // Resize observer
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver(() => draw())
    observer.observe(container)
    return () => observer.disconnect()
  }, [draw])

  // Convert canvas coordinates to image coordinates
  function canvasToImage(cx: number, cy: number) {
    const canvas = canvasRef.current
    const img = imgRef.current
    if (!canvas || !img) return { ix: 0, iy: 0 }

    const scale = Math.min(canvas.width / img.width, canvas.height / img.height) * zoom
    const drawW = img.width * scale
    const drawH = img.height * scale
    const drawX = (canvas.width - drawW) / 2 + pan.x
    const drawY = (canvas.height - drawH) / 2 + pan.y

    return {
      ix: (cx - drawX) / scale,
      iy: (cy - drawY) / scale,
    }
  }

  function getCanvasPos(e: React.MouseEvent) {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function handleMouseDown(e: React.MouseEvent) {
    const pos = getCanvasPos(e)

    if (e.button === 1 || e.altKey) {
      // Middle click or alt+click = pan
      setDragging(true)
      setDragStart({ x: pos.x - pan.x, y: pos.y - pan.y })
      return
    }

    // Left click = start crop selection
    setSelecting(true)
    setSelStart(pos)
    setCrop(null)
  }

  function handleMouseMove(e: React.MouseEvent) {
    const pos = getCanvasPos(e)

    if (dragging) {
      setPan({ x: pos.x - dragStart.x, y: pos.y - dragStart.y })
      return
    }

    if (selecting) {
      const x = Math.min(selStart.x, pos.x)
      const y = Math.min(selStart.y, pos.y)
      const w = Math.abs(pos.x - selStart.x)
      const h = Math.abs(pos.y - selStart.y)
      if (w > 5 || h > 5) {
        setCrop({ x, y, w, h })
      }
    }
  }

  function handleMouseUp() {
    setDragging(false)
    setSelecting(false)
  }

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setZoom((z) => Math.max(0.5, Math.min(5, z * delta)))
  }

  function handleCropConfirm() {
    const canvas = canvasRef.current
    const img = imgRef.current
    if (!canvas || !img || !crop) return

    // Convert crop rect from canvas coords to image coords
    const topLeft = canvasToImage(crop.x, crop.y)
    const bottomRight = canvasToImage(crop.x + crop.w, crop.y + crop.h)

    const ix = Math.max(0, Math.round(topLeft.ix))
    const iy = Math.max(0, Math.round(topLeft.iy))
    const iw = Math.min(img.width - ix, Math.round(bottomRight.ix - topLeft.ix))
    const ih = Math.min(img.height - iy, Math.round(bottomRight.iy - topLeft.iy))

    if (iw < 10 || ih < 10) return

    // Draw cropped region to a temp canvas
    const tmpCanvas = document.createElement('canvas')
    tmpCanvas.width = iw
    tmpCanvas.height = ih
    const tmpCtx = tmpCanvas.getContext('2d')
    if (!tmpCtx) return

    tmpCtx.drawImage(img, ix, iy, iw, ih, 0, 0, iw, ih)

    tmpCanvas.toBlob((blob) => {
      if (blob) onCrop(blob)
    }, 'image/png')
  }

  return (
    <div className="tab-cropper-overlay">
      <div className="tab-cropper-modal">
        <div className="tab-cropper-header">
          <h3>Select Tab Region</h3>
          <p>Click and drag to select the tab area. Scroll to zoom, Alt+drag to pan.</p>
        </div>

        <div className="tab-cropper-canvas-wrap" ref={containerRef}>
          <canvas
            ref={canvasRef}
            className="tab-cropper-canvas"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          />
        </div>

        <div className="tab-cropper-toolbar">
          <div className="tab-cropper-zoom">
            <button onClick={() => setZoom((z) => Math.max(0.5, z * 0.8))}>−</button>
            <span>{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom((z) => Math.min(5, z * 1.2))}>+</button>
            <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }}>Reset</button>
          </div>
          <div className="tab-cropper-actions">
            <button className="tab-cropper-cancel" onClick={onCancel}>Cancel</button>
            <button
              className="tab-cropper-confirm"
              onClick={handleCropConfirm}
              disabled={!crop || crop.w < 10 || crop.h < 10}
            >
              Scan Selected Area
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
