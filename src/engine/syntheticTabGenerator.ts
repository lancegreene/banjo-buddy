// ─── syntheticTabGenerator — Generate synthetic tab images for CNN training ──
//
// Renders thousands of tab images with known ground truth using Canvas.
// Each image has 5 staff lines with fret digits placed on specific lines,
// plus realistic visual features found in real tablature:
//   - Stems and beam lines (8th/16th note groupings)
//   - Circle-style zeros (open strings rendered as "O")
//   - Combined finger+technique labels below the staff (T, I, M, T-P, T-H, etc.)
//   - Technique arcs between notes (h, p, sl)
//   - Chord labels above the staff (G, C, D, etc.)
//
// Ground truth includes fret digit, finger label, and technique for each note.

export interface SyntheticDigit {
  digit: number     // 0-12
  lineNum: number   // 1-5 (which staff line)
  centerX: number
  centerY: number
  label: string     // combined finger+technique label: 'T', 'I', 'M', 'T-P', etc.
  labelCenterX: number  // pixel center of the label below the staff
  labelCenterY: number
}

export interface SyntheticTabResult {
  imageBlob: Blob
  digits: SyntheticDigit[]
  config: RenderConfig
}

export interface DigitCrop {
  imageData: ImageData  // 32x32 RGBA
  digit: number         // ground truth label
}

export interface RenderConfig {
  font: string
  fontSize: number
  lineWeight: number
  lineSpacing: number
  bgBrightness: number
  fgDarkness: number
  noiseSigma: number
  rotation: number       // degrees
  noteCount: number
  margin: number
  // Feature toggles (randomized per image)
  drawStems: boolean
  drawBeams: boolean
  drawFingerLabels: boolean
  drawTechniqueArcs: boolean
  drawChordLabel: boolean
  useCircleZeros: boolean   // render 0 as "O" circle style
  stemDirection: 'down' | 'up'
}

const FONTS = ['serif', 'sans-serif', 'monospace', 'Georgia', 'Arial', 'Courier New']
const CHORD_LABELS = ['G', 'C', 'D', 'Em', 'Am', 'D7', 'G7', 'C/G', 'F']

// Combined finger+technique labels with realistic weights
// Plain fingers are most common, techniques are less frequent
const COMBINED_LABELS: [string, number][] = [
  ['T', 30],    // Thumb (plain)
  ['I', 25],    // Index (plain)
  ['M', 25],    // Middle (plain)
  ['T-P', 5],   // Thumb + Pull-off
  ['T-H', 4],   // Thumb + Hammer-on
  ['I-H', 3],   // Index + Hammer-on
  ['I-P', 2],   // Index + Pull-off
  ['T-SL', 2],  // Thumb + Slide
  ['I-SL', 2],  // Index + Slide
  ['M-SL', 2],  // Middle + Slide
]

// All unique labels for classification
export const LABEL_CLASSES = COMBINED_LABELS.map(([l]) => l)

function weightedRandomLabel(): string {
  const totalWeight = COMBINED_LABELS.reduce((s, [, w]) => s + w, 0)
  let r = Math.random() * totalWeight
  for (const [label, weight] of COMBINED_LABELS) {
    r -= weight
    if (r <= 0) return label
  }
  return 'T'
}

// Banjo fret range: mostly 0-5, occasionally higher
const FRET_WEIGHTS: [number, number][] = [
  [0, 30], [1, 15], [2, 20], [3, 10], [4, 5], [5, 10],
  [7, 3], [8, 2], [9, 2], [10, 2], [12, 1],
]

function weightedRandomFret(): number {
  const totalWeight = FRET_WEIGHTS.reduce((s, [, w]) => s + w, 0)
  let r = Math.random() * totalWeight
  for (const [fret, weight] of FRET_WEIGHTS) {
    r -= weight
    if (r <= 0) return fret
  }
  return 0
}

function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

function randInt(min: number, max: number): number {
  return Math.floor(randRange(min, max + 1))
}

function randChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randBool(probability: number = 0.5): boolean {
  return Math.random() < probability
}

/** Generate a randomized rendering configuration */
export function randomConfig(): RenderConfig {
  const noteCount = randInt(4, 12)
  return {
    font: randChoice(FONTS),
    fontSize: randInt(12, 24),
    lineWeight: randRange(1, 3),
    lineSpacing: randInt(12, 25),
    bgBrightness: randInt(220, 255),
    fgDarkness: randInt(0, 80),
    noiseSigma: randRange(5, 15),
    rotation: randRange(-3, 3),
    noteCount,
    margin: randInt(15, 30),
    drawStems: randBool(0.7),
    drawBeams: randBool(0.6),
    drawFingerLabels: randBool(0.8),  // increased — need more label training data
    drawTechniqueArcs: randBool(0.3),
    drawChordLabel: randBool(0.4),
    useCircleZeros: randBool(0.4),
    stemDirection: randBool(0.7) ? 'down' : 'up',
  }
}

/** Add Gaussian noise to canvas pixel data */
function addGaussianNoise(imageData: ImageData, sigma: number): void {
  const data = imageData.data
  for (let i = 0; i < data.length; i += 4) {
    const u1 = Math.random() || 0.0001
    const u2 = Math.random()
    const noise = sigma * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
    data[i] = Math.max(0, Math.min(255, data[i] + noise))
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise))
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise))
  }
}

/**
 * Render a synthetic tab image with known ground truth.
 * Returns the image blob and digit metadata including label positions.
 */
export async function renderSyntheticTab(config: RenderConfig): Promise<SyntheticTabResult> {
  const {
    font, fontSize, lineWeight, lineSpacing, bgBrightness, fgDarkness,
    noiseSigma, rotation, noteCount, margin,
    drawStems, drawBeams, drawFingerLabels, drawTechniqueArcs,
    drawChordLabel, useCircleZeros, stemDirection,
  } = config

  // Calculate canvas dimensions — extra space for stems/beams/fingers/chord labels
  const staffHeight = lineSpacing * 4
  const stemLen = lineSpacing * 2.5
  const extraTop = drawChordLabel ? fontSize * 1.5 : fontSize * 0.5
  const labelAreaHeight = drawFingerLabels ? fontSize * 2 : fontSize * 0.5
  const extraBottom = stemDirection === 'down'
    ? stemLen + labelAreaHeight
    : labelAreaHeight
  const extraTopForStems = stemDirection === 'up' ? stemLen : 0

  const digitWidth = fontSize * 1.2
  const canvasW = Math.round(margin * 2 + noteCount * digitWidth + (noteCount - 1) * digitWidth * 0.3)
  const canvasH = Math.round(margin + extraTop + extraTopForStems + staffHeight + extraBottom + margin)

  const canvas = document.createElement('canvas')
  canvas.width = canvasW
  canvas.height = canvasH
  const ctx = canvas.getContext('2d')!

  // Fill background
  const bgColor = `rgb(${bgBrightness},${bgBrightness},${bgBrightness})`
  ctx.fillStyle = bgColor
  ctx.fillRect(0, 0, canvasW, canvasH)

  // Apply slight rotation around center
  if (Math.abs(rotation) > 0.1) {
    ctx.save()
    ctx.translate(canvasW / 2, canvasH / 2)
    ctx.rotate((rotation * Math.PI) / 180)
    ctx.translate(-canvasW / 2, -canvasH / 2)
  }

  const fgColor = `rgb(${fgDarkness},${fgDarkness},${fgDarkness})`

  // Draw chord label above staff
  if (drawChordLabel) {
    const chord = randChoice(CHORD_LABELS)
    ctx.font = `bold ${Math.round(fontSize * 0.9)}px ${font}`
    ctx.fillStyle = fgColor
    ctx.textAlign = 'left'
    ctx.textBaseline = 'bottom'
    ctx.fillText(chord, margin, margin + extraTop - 4)
  }

  // Draw 5 staff lines
  ctx.strokeStyle = fgColor
  ctx.lineWidth = lineWeight

  const lineYs: number[] = []
  const topY = margin + extraTop + extraTopForStems
  for (let i = 0; i < 5; i++) {
    const y = topY + i * lineSpacing
    lineYs.push(y)
    ctx.beginPath()
    ctx.moveTo(margin * 0.5, y)
    ctx.lineTo(canvasW - margin * 0.5, y)
    ctx.stroke()
  }

  // Pre-assign combined labels for each note
  const labels: string[] = []
  for (let i = 0; i < noteCount; i++) {
    labels.push(weightedRandomLabel())
  }

  // Pre-determine beam groups (groups of 2-4 adjacent notes)
  const beamGroups: [number, number][] = []
  if (drawBeams && drawStems) {
    let gi = 0
    while (gi < noteCount) {
      const groupSize = Math.min(randInt(2, 4), noteCount - gi)
      if (groupSize >= 2) {
        beamGroups.push([gi, gi + groupSize - 1])
      }
      gi += groupSize
    }
  }

  // Place digits on staff lines
  const digits: SyntheticDigit[] = []
  const startX = margin + digitWidth * 0.5
  const xStep = (canvasW - margin * 2) / noteCount

  // Calculate finger label Y position (consistent for all notes)
  const fingerY = stemDirection === 'down' && drawStems
    ? lineYs[4] + fontSize / 2 + stemLen + 6
    : lineYs[4] + lineSpacing * 0.8
  const fingerFontSize = Math.max(8, Math.round(fontSize * 0.65))

  for (let i = 0; i < noteCount; i++) {
    const digit = weightedRandomFret()
    const lineIdx = randInt(0, 4)
    const lineY = lineYs[lineIdx]
    const cx = startX + i * xStep + randRange(-2, 2)

    // White rectangle behind digit (mimics real tab rendering)
    const digitStr = (useCircleZeros && digit === 0) ? 'O' : String(digit)
    ctx.font = `${fontSize}px ${font}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const metrics = ctx.measureText(digitStr)
    const boxW = metrics.width + 4
    const boxH = fontSize + 2
    ctx.fillStyle = bgColor
    ctx.fillRect(cx - boxW / 2, lineY - boxH / 2, boxW, boxH)

    // Draw digit (or circle-zero)
    ctx.fillStyle = fgColor
    if (useCircleZeros && digit === 0) {
      // Draw "0" text first, then circle around it (matches real tab style)
      ctx.fillText('0', cx, lineY)
      const r = fontSize * 0.45
      ctx.beginPath()
      ctx.arc(cx, lineY, r, 0, Math.PI * 2)
      ctx.lineWidth = Math.max(1, lineWeight * 0.8)
      ctx.strokeStyle = fgColor
      ctx.stroke()
    } else {
      ctx.fillText(digitStr, cx, lineY)
    }

    // Draw stem
    if (drawStems) {
      ctx.strokeStyle = fgColor
      ctx.lineWidth = Math.max(1, lineWeight * 0.8)
      ctx.beginPath()
      if (stemDirection === 'down') {
        const stemTop = lineY + boxH / 2
        ctx.moveTo(cx, stemTop)
        ctx.lineTo(cx, stemTop + stemLen)
      } else {
        const stemBottom = lineY - boxH / 2
        ctx.moveTo(cx, stemBottom)
        ctx.lineTo(cx, stemBottom - stemLen)
      }
      ctx.stroke()
    }

    // Calculate label center position (even if not drawn — position is always tracked)
    const labelCenterY = Math.round(fingerY + fingerFontSize / 2)

    digits.push({
      digit,
      lineNum: lineIdx + 1,
      centerX: Math.round(cx),
      centerY: Math.round(lineY),
      label: labels[i],
      labelCenterX: Math.round(cx),
      labelCenterY,
    })
  }

  // Draw beam lines connecting grouped notes
  if (drawBeams && drawStems) {
    ctx.strokeStyle = fgColor
    const beamThickness = Math.max(2, lineWeight * 1.5)

    for (const [start, end] of beamGroups) {
      const x1 = digits[start].centerX
      const x2 = digits[end].centerX

      let beamY: number
      if (stemDirection === 'down') {
        const noteYs = digits.slice(start, end + 1).map(d => d.centerY)
        const maxNoteY = Math.max(...noteYs)
        beamY = maxNoteY + fontSize / 2 + stemLen
      } else {
        const noteYs = digits.slice(start, end + 1).map(d => d.centerY)
        const minNoteY = Math.min(...noteYs)
        beamY = minNoteY - fontSize / 2 - stemLen
      }

      const numBeams = randBool(0.3) ? 2 : 1
      for (let b = 0; b < numBeams; b++) {
        const offset = b * (beamThickness + 2) * (stemDirection === 'down' ? -1 : 1)
        ctx.lineWidth = beamThickness
        ctx.beginPath()
        ctx.moveTo(x1, beamY + offset)
        ctx.lineTo(x2, beamY + offset)
        ctx.stroke()
      }
    }
  }

  // Draw technique arcs between some adjacent notes
  if (drawTechniqueArcs) {
    ctx.strokeStyle = fgColor
    ctx.lineWidth = Math.max(1, lineWeight * 0.6)
    const techFontSize = Math.max(8, Math.round(fontSize * 0.5))
    ctx.font = `${techFontSize}px ${font}`
    ctx.textAlign = 'center'

    for (let i = 0; i < noteCount - 1; i++) {
      if (!randBool(0.25)) continue

      const d1 = digits[i]
      const d2 = digits[i + 1]
      const midX = (d1.centerX + d2.centerX) / 2
      const arcRadius = Math.abs(d2.centerX - d1.centerX) / 2

      const arcAbove = stemDirection === 'down'
      const arcY = arcAbove
        ? Math.min(d1.centerY, d2.centerY) - fontSize * 0.8
        : Math.max(d1.centerY, d2.centerY) + fontSize * 0.8

      ctx.beginPath()
      if (arcAbove) {
        ctx.arc(midX, arcY + arcRadius * 0.3, arcRadius, Math.PI * 1.1, Math.PI * 1.9)
      } else {
        ctx.arc(midX, arcY - arcRadius * 0.3, arcRadius, Math.PI * 0.1, Math.PI * 0.9)
      }
      ctx.stroke()

      const techLabel = randChoice(['h', 'p', 'sl'])
      ctx.fillStyle = fgColor
      const labelY2 = arcAbove ? arcY - arcRadius * 0.2 : arcY + arcRadius * 0.2 + techFontSize
      ctx.textBaseline = arcAbove ? 'bottom' : 'top'
      ctx.fillText(techLabel, midX, labelY2)
    }
  }

  // Draw combined finger+technique labels below the staff
  if (drawFingerLabels) {
    ctx.font = `${fingerFontSize}px ${font}`
    ctx.fillStyle = fgColor
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'

    for (let i = 0; i < noteCount; i++) {
      ctx.fillText(labels[i], digits[i].centerX, fingerY)
    }
  }

  // Restore rotation
  if (Math.abs(rotation) > 0.1) {
    ctx.restore()
  }

  // Add Gaussian noise
  if (noiseSigma > 0) {
    const imgData = ctx.getImageData(0, 0, canvasW, canvasH)
    addGaussianNoise(imgData, noiseSigma)
    ctx.putImageData(imgData, 0, 0)
  }

  // Convert to blob
  const blob = await new Promise<Blob>((resolve) => {
    canvas.toBlob((b) => resolve(b!), 'image/png')
  })

  return { imageBlob: blob, digits, config }
}

/**
 * Extract a 32x32 grayscale digit crop from a canvas at the given position.
 */
export function cropDigit(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  cropSize: number = 32,
): ImageData {
  const half = cropSize / 2
  const sx = Math.max(0, Math.round(centerX - half))
  const sy = Math.max(0, Math.round(centerY - half))

  // Get source region (may be smaller if near edge)
  const srcW = Math.min(cropSize, ctx.canvas.width - sx)
  const srcH = Math.min(cropSize, ctx.canvas.height - sy)
  const srcData = ctx.getImageData(sx, sy, srcW, srcH)

  // Create 32x32 output (white-padded if source was smaller)
  const out = new ImageData(cropSize, cropSize)
  for (let i = 0; i < out.data.length; i += 4) {
    out.data[i] = 255
    out.data[i + 1] = 255
    out.data[i + 2] = 255
    out.data[i + 3] = 255
  }

  const offX = Math.floor((cropSize - srcW) / 2)
  const offY = Math.floor((cropSize - srcH) / 2)
  for (let y = 0; y < srcH; y++) {
    for (let x = 0; x < srcW; x++) {
      const si = (y * srcW + x) * 4
      const di = ((y + offY) * cropSize + (x + offX)) * 4
      out.data[di] = srcData.data[si]
      out.data[di + 1] = srcData.data[si + 1]
      out.data[di + 2] = srcData.data[si + 2]
      out.data[di + 3] = srcData.data[si + 3]
    }
  }

  return out
}

export interface BatchProgress {
  completed: number
  total: number
}

/**
 * Generate a batch of synthetic tab images with digit crops.
 * Yields to the event loop every 10 images to avoid UI freeze.
 */
export async function generateBatch(
  count: number,
  onProgress?: (p: BatchProgress) => void,
): Promise<{ results: SyntheticTabResult[]; crops: DigitCrop[] }> {
  const results: SyntheticTabResult[] = []
  const crops: DigitCrop[] = []

  for (let i = 0; i < count; i++) {
    const config = randomConfig()
    const result = await renderSyntheticTab(config)
    results.push(result)

    // Extract digit crops from the rendered image
    const img = new Image()
    const url = URL.createObjectURL(result.imageBlob)
    await new Promise<void>((resolve) => {
      img.onload = () => resolve()
      img.src = url
    })

    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0)
    URL.revokeObjectURL(url)

    for (const d of result.digits) {
      const crop = cropDigit(ctx, d.centerX, d.centerY)
      crops.push({ imageData: crop, digit: d.digit })
    }

    onProgress?.({ completed: i + 1, total: count })

    if ((i + 1) % 10 === 0) {
      await new Promise((r) => setTimeout(r, 0))
    }
  }

  return { results, crops }
}
