// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Image Crop Service
// Pure canvas-based functions for cropping and thumbnailing images.
// ─────────────────────────────────────────────────────────────────────────────

import type { CropRect } from '../db/db'

/** Crop a region from a source image blob. CropRect uses normalized 0-1 coords. */
export async function cropImageBlob(sourceBlob: Blob, rect: CropRect): Promise<Blob> {
  const img = await loadImage(sourceBlob)
  const sx = Math.round(rect.x * img.width)
  const sy = Math.round(rect.y * img.height)
  const sw = Math.round(rect.w * img.width)
  const sh = Math.round(rect.h * img.height)

  const canvas = document.createElement('canvas')
  canvas.width = sw
  canvas.height = sh
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh)

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.85)
  })
}

/** Generate a thumbnail from an image blob, constraining to maxWidth. */
export async function generateThumbnailFromImage(blob: Blob, maxWidth = 160): Promise<Blob> {
  const img = await loadImage(blob)
  const scale = Math.min(1, maxWidth / img.width)
  const w = Math.round(img.width * scale)
  const h = Math.round(img.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, w, h)

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.7)
  })
}

function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(blob)
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')) }
    img.src = url
  })
}
