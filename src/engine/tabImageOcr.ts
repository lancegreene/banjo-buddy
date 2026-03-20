// ─── tabImageOcr — Extract tablature from an image ───────────────────────────
//
// Hybrid approach:
//   1. Programmatic detection finds staff lines and note positions by pixel analysis
//   2. Line assignments (which string each note is on) are determined programmatically
//      — this is what vision models consistently get wrong
//   3. The vision model is only used to read fret numbers (what it's good at)
//   4. If programmatic detection fails, falls back to full vision model OCR
//
// The API call is proxied through Vite's dev server to keep the API key
// server-side. In production, this would go through a backend endpoint.

export interface OcrResult {
  text: string
  confidence: number
  processing: false
}

export interface OcrProgress {
  status: string
  progress: number
  processing: true
}

/** Max dimension for images sent to the API */
const MAX_IMAGE_DIM = 1568

const STRING_LABELS: Record<number, string> = { 1: 'D', 2: 'B', 3: 'G', 4: 'd', 5: 'g' }

// ─── Image loading ───────────────────────────────────────────────────────────

function loadImage(source: File | Blob | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    if (typeof source === 'string') {
      img.src = source
    } else {
      img.src = URL.createObjectURL(source)
    }
  })
}

/**
 * Load image onto a canvas, resized to fit MAX_IMAGE_DIM.
 * Returns the canvas context + dimensions for further processing.
 */
async function imageToCanvas(source: File | Blob | string): Promise<{
  ctx: CanvasRenderingContext2D
  w: number
  h: number
}> {
  const img = await loadImage(source)
  const maxSide = Math.max(img.naturalWidth, img.naturalHeight)
  const scale = maxSide > MAX_IMAGE_DIM ? MAX_IMAGE_DIM / maxSide : 1
  const w = Math.round(img.naturalWidth * scale)
  const h = Math.round(img.naturalHeight * scale)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, w, h)

  if (typeof source !== 'string') {
    URL.revokeObjectURL(img.src)
  }

  return { ctx, w, h }
}

function canvasToBase64(ctx: CanvasRenderingContext2D, w: number, h: number): { base64: string; mediaType: string } {
  const canvas = ctx.canvas
  // Ensure canvas dimensions match (they should, but be safe)
  void w; void h
  const dataUrl = canvas.toDataURL('image/png')
  const [header, data] = dataUrl.split(',')
  const mediaType = header.match(/data:(.*?);/)?.[1] ?? 'image/png'
  return { base64: data, mediaType }
}

// ─── Programmatic staff line + note detection ────────────────────────────────

interface DetectedNote {
  lineNum: number   // 1-5 (which staff line)
  centerX: number   // horizontal center of the note cluster
  clusterWidth: number
}

/**
 * Detect staff lines by scanning for horizontal dark pixel rows.
 * Returns the Y centers of the 5 lines, or null if detection fails.
 *
 * Uses a two-pass approach:
 * 1. Find all dark row clusters (candidate lines)
 * 2. Score each cluster by its peak darkness (minimum brightness)
 * 3. If more than 5 candidates, pick the 5 darkest — real staff lines are darker
 *    than artifacts like borders or faint gridlines
 * 4. Validate that the 5 lines are approximately evenly spaced
 */
function detectStaffLines(ctx: CanvasRenderingContext2D, w: number, h: number): number[] | null {
  // Sample multiple vertical columns and average brightness per row
  const sampleXs = [0.15, 0.3, 0.5, 0.7].map((p) => Math.round(w * p))
  const brightnesses: number[] = []

  for (let y = 0; y < h; y++) {
    let sum = 0
    for (const sx of sampleXs) {
      const d = ctx.getImageData(sx, y, 1, 1).data
      sum += d[0] * 0.299 + d[1] * 0.587 + d[2] * 0.114
    }
    brightnesses.push(sum / sampleXs.length)
  }

  // Adaptive threshold: use a generous threshold to catch all candidates
  const sorted = [...brightnesses].sort((a, b) => a - b)
  const bgBrightness = sorted[Math.floor(sorted.length * 0.8)]
  const threshold = bgBrightness - 15

  const darkRows: number[] = []
  for (let y = 0; y < h; y++) {
    if (brightnesses[y] < threshold) darkRows.push(y)
  }
  if (darkRows.length === 0) return null

  // Cluster dark rows into line candidates (gap > 6px = new line)
  interface LineCandidate { center: number; peakDarkness: number; thickness: number }
  const candidates: LineCandidate[] = []
  let cs = darkRows[0], ce = darkRows[0]
  for (let i = 1; i < darkRows.length; i++) {
    if (darkRows[i] - ce <= 6) {
      ce = darkRows[i]
    } else {
      let minB = 255
      for (let y = cs; y <= ce; y++) minB = Math.min(minB, brightnesses[y])
      candidates.push({ center: Math.round((cs + ce) / 2), peakDarkness: minB, thickness: ce - cs + 1 })
      cs = ce = darkRows[i]
    }
  }
  let minB = 255
  for (let y = cs; y <= ce; y++) minB = Math.min(minB, brightnesses[y])
  candidates.push({ center: Math.round((cs + ce) / 2), peakDarkness: minB, thickness: ce - cs + 1 })

  // Filter out candidates that are too thick — real staff lines are thin (< 5% of image height)
  // This removes large dark regions like text blocks, borders, or UI elements
  const maxLineThickness = Math.max(20, Math.round(h * 0.05))
  const thinCandidates = candidates.filter((c) => c.thickness <= maxLineThickness)

  if (thinCandidates.length < 5) return null

  if (thinCandidates.length === 5) {
    return thinCandidates.map((c) => c.center)
  }

  // More than 5 candidates — pick the 5 darkest (real lines are darker than artifacts)
  const byDarkness = [...thinCandidates].sort((a, b) => a.peakDarkness - b.peakDarkness)
  const top5 = byDarkness.slice(0, 5).sort((a, b) => a.center - b.center)

  // Validate: the 5 lines should be approximately evenly spaced (within 30% tolerance)
  const gaps = top5.slice(1).map((l, i) => l.center - top5[i].center)
  const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length
  const allEven = gaps.every((g) => Math.abs(g - avgGap) / avgGap < 0.3)

  if (!allEven) return null

  return top5.map((c) => c.center)
}

/**
 * Detect note positions and assign each to its nearest staff line.
 *
 * Algorithm:
 * 1. Build a grayscale brightness array for the full image
 * 2. For each column, count dark pixels — columns with notes have MORE dark pixels
 *    than columns with only staff lines passing through
 * 3. Cluster adjacent "busy" columns into note events
 * 4. For each note cluster, count dark pixels in a band around each line —
 *    the line with the most extra dark pixels has the note
 */
function detectNotePositions(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  lineYs: number[],
): DetectedNote[] {
  const imageData = ctx.getImageData(0, 0, w, h)
  const px = imageData.data

  // Adaptive threshold from full image
  const allBrightness: number[] = []
  // Sample every 4th pixel for speed
  for (let i = 0; i < w * h; i += 4) {
    const idx = i * 4
    allBrightness.push(px[idx] * 0.299 + px[idx + 1] * 0.587 + px[idx + 2] * 0.114)
  }
  const sortedB = [...allBrightness].sort((a, b) => a - b)
  const bgB = sortedB[Math.floor(sortedB.length * 0.8)]
  const threshold = bgB - 20

  // Helper: get brightness at (x, y)
  const bright = (x: number, y: number) => {
    const i = (y * w + x) * 4
    return px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114
  }

  // Only scan within the staff area (line 1 to line 5 ± half a line gap)
  // This excludes finger labels (T/I/M), titles, or other text above/below the staff
  const lineGap = lineYs[1] - lineYs[0]
  const staffTop = Math.max(0, lineYs[0] - Math.round(lineGap * 0.5))
  const staffBottom = Math.min(h - 1, lineYs[4] + Math.round(lineGap * 0.5))

  // Count dark pixels per column within staff area only
  const colDark = new Uint16Array(w)
  for (let x = 0; x < w; x++) {
    for (let y = staffTop; y <= staffBottom; y++) {
      if (bright(x, y) < threshold) colDark[x]++
    }
  }

  // Baseline: columns with only staff lines have ~lineCount * lineThickness dark pixels
  // Use the median column dark count as the baseline (most columns have no notes)
  const sortedCols = [...colDark].sort((a, b) => a - b)
  const baselineDark = sortedCols[Math.floor(sortedCols.length * 0.5)]
  const noteThreshold = baselineDark + 4 // at least 4 extra dark pixels = note present

  // Find note columns
  const noteColumns: number[] = []
  for (let x = 0; x < w; x++) {
    if (colDark[x] > noteThreshold) noteColumns.push(x)
  }

  if (noteColumns.length === 0) return []

  // Cluster adjacent note columns (gap <= 5px to merge split digits)
  const clusters: [number, number][] = []
  let clS = noteColumns[0], clE = noteColumns[0]
  for (let i = 1; i < noteColumns.length; i++) {
    if (noteColumns[i] - clE <= 5) {
      clE = noteColumns[i]
    } else {
      clusters.push([clS, clE])
      clS = clE = noteColumns[i]
    }
  }
  clusters.push([clS, clE])

  // Filter clusters by size:
  // - Too narrow (< 4px): probably a bar line or artifact
  // - Too wide (> 1.5 * lineGap): probably a thick bar or bracket
  const minNoteWidth = 4
  const maxNoteWidth = lineGap * 1.5
  const sizedClusters = clusters.filter(([s, e]) => {
    const cw = e - s + 1
    return cw >= minNoteWidth && cw < maxNoteWidth
  })

  // For each cluster, determine which line has the note
  const notes: DetectedNote[] = []
  const bandSize = Math.max(3, Math.round(lineGap / 3))

  for (const [x0, x1] of sizedClusters) {
    // Count dark pixels in a band around each line for this cluster
    const lineDarkCounts = lineYs.map((ly) => {
      let count = 0
      for (let x = x0; x <= x1; x++) {
        for (let dy = -bandSize; dy <= bandSize; dy++) {
          const y = ly + dy
          if (y >= 0 && y < h && bright(x, y) < threshold) count++
        }
      }
      return count
    })

    // Baseline per line: just the line pixels (width * ~2px thickness)
    const clusterWidth = x1 - x0 + 1
    const lineBaseline = clusterWidth * 3 // generous baseline: 3 dark pixels per column per line

    // The line with the most EXTRA dark pixels has the note
    const extra = lineDarkCounts.map((c) => c - lineBaseline)
    const maxExtra = Math.max(...extra)

    // Must have meaningful extra darkness
    if (maxExtra < 5) continue

    // Concentration check: the winning line must be clearly dominant
    // Sort extras descending — winner must be >= 1.5x the runner-up
    const sortedExtra = [...extra].sort((a, b) => b - a)
    if (sortedExtra[1] > 0 && sortedExtra[0] < sortedExtra[1] * 1.5) continue

    const lineIdx = extra.indexOf(maxExtra)
    notes.push({
      lineNum: lineIdx + 1,
      centerX: Math.round((x0 + x1) / 2),
      clusterWidth,
    })
  }

  return notes
}

// ─── Tab formatting ──────────────────────────────────────────────────────────

/**
 * Format detected notes (with line assignments and fret numbers) as tab text.
 */
function fingerForLine(lineNum: number): 'T' | 'I' | 'M' {
  if (lineNum >= 3) return 'T'  // Strings 3, 4, 5 = Thumb
  if (lineNum === 2) return 'I' // String 2 = Index
  return 'M'                    // String 1 = Middle
}

function formatTab(noteData: { lineNum: number; fret: number }[], fingers?: string[] | null): string {
  if (noteData.length === 0) return ''

  const SPACING = 4
  const lines: Record<number, string> = { 1: '', 2: '', 3: '', 4: '', 5: '' }
  let fingerRow = ''

  for (let i = 0; i < noteData.length; i++) {
    const { lineNum, fret } = noteData[i]
    const fretStr = String(fret)
    for (let s = 1; s <= 5; s++) {
      lines[s] += s === lineNum ? fretStr : '-'.repeat(fretStr.length)
    }
    // Finger: use provided label if available, otherwise auto-assign from string
    const finger = fingers?.[i] ?? fingerForLine(lineNum)
    fingerRow += finger + '-'.repeat(fretStr.length - 1)
    if (i < noteData.length - 1) {
      for (let s = 1; s <= 5; s++) lines[s] += '-'.repeat(SPACING)
      fingerRow += '-'.repeat(SPACING)
    }
  }

  const tabLines = [1, 2, 3, 4, 5]
    .map((s) => `${STRING_LABELS[s]}|${lines[s]}|`)
    .join('\n')

  return `${tabLines}\n |${fingerRow}|`
}

/**
 * Convert a JSON note array [[line, fret], ...] into formatted tab text.
 * Falls back to returning the raw text if JSON parsing fails.
 */
function jsonToTab(text: string): string {
  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return text
    const notes: [number, number][] = JSON.parse(jsonMatch[0])
    if (!Array.isArray(notes) || notes.length === 0) return text
    return formatTab(notes.map(([lineNum, fret]) => ({ lineNum, fret })))
  } catch {
    return text
  }
}

// ─── Vision model API call ───────────────────────────────────────────────────

async function callVisionModel(
  base64: string,
  mediaType: string,
  prompt: string,
  onProgress?: (p: OcrProgress) => void,
): Promise<string> {
  const body = {
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          { type: 'text', text: prompt },
        ],
      },
    ],
  }

  const MAX_RETRIES = 2
  const jsonBody = JSON.stringify(body)

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const resp = await fetch('/api/anthropic/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: jsonBody,
      })

      onProgress?.({ status: 'Reading response...', progress: 0.8, processing: true })

      if (!resp.ok) {
        const err = await resp.text()
        if ((resp.status === 502 || resp.status === 503 || resp.status === 529) && attempt < MAX_RETRIES) {
          onProgress?.({ status: `Retrying (${attempt + 1}/${MAX_RETRIES})...`, progress: 0.4, processing: true })
          await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)))
          continue
        }
        throw new Error(`API error ${resp.status}: ${err}`)
      }

      const data = await resp.json()
      return (data.content?.[0]?.text ?? '').trim()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
        if (attempt < MAX_RETRIES) {
          onProgress?.({ status: `Retrying (${attempt + 1}/${MAX_RETRIES})...`, progress: 0.4, processing: true })
          await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)))
          continue
        }
        throw new Error('Claude Vision API not available. Make sure VITE_ANTHROPIC_API_KEY is set in .env and the dev server is running.')
      }
      throw err
    }
  }

  throw new Error('Max retries exceeded')
}

// ─── Main entry point ────────────────────────────────────────────────────────

/**
 * Extract tab text from an image.
 *
 * Strategy:
 * 1. Programmatically detect staff lines and note positions (reliable for line assignment)
 * 2. Annotate the image with numbered circles at each detected note position
 * 3. Send to vision model asking ONLY for fret numbers at each marked position
 * 4. Combine programmatic line assignments + model fret numbers
 * 5. If programmatic detection fails, fall back to full vision model OCR
 */
export async function extractTabFromImage(
  imageSource: File | Blob | string,
  onProgress?: (p: OcrProgress) => void,
): Promise<OcrResult> {
  onProgress?.({ status: 'Preparing image...', progress: 0.1, processing: true })

  const { ctx, w, h } = await imageToCanvas(imageSource)

  // Step 1: Try programmatic detection
  onProgress?.({ status: 'Detecting staff lines...', progress: 0.2, processing: true })
  const lineYs = detectStaffLines(ctx, w, h)

  if (lineYs) {
    const detectedNotes = detectNotePositions(ctx, w, h, lineYs)

    if (detectedNotes.length > 0) {
      // Step 2: Annotate image with arrows ABOVE each note (don't cover the digit!)
      const lineGap = lineYs[1] - lineYs[0]
      const arrowY = Math.max(0, lineYs[0] - lineGap) // above the top line
      const fontSize = Math.max(10, Math.round(lineGap * 0.4))
      ctx.font = `bold ${fontSize}px sans-serif`
      ctx.textAlign = 'center'

      for (let i = 0; i < detectedNotes.length; i++) {
        const note = detectedNotes[i]
        const ny = lineYs[note.lineNum - 1]

        // Red arrow line from above down to near the note
        ctx.strokeStyle = '#FF0000'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(note.centerX, arrowY + fontSize + 4)
        ctx.lineTo(note.centerX, ny - lineGap * 0.3)
        ctx.stroke()

        // Arrowhead
        ctx.fillStyle = '#FF0000'
        ctx.beginPath()
        ctx.moveTo(note.centerX, ny - lineGap * 0.25)
        ctx.lineTo(note.centerX - 4, ny - lineGap * 0.4)
        ctx.lineTo(note.centerX + 4, ny - lineGap * 0.4)
        ctx.closePath()
        ctx.fill()

        // Number label above the arrow
        ctx.fillStyle = '#FF0000'
        ctx.textBaseline = 'top'
        ctx.fillText(String(i + 1), note.centerX, arrowY)
      }

      // Step 3: Send annotated image to model for fret number reading only
      onProgress?.({ status: 'Reading fret numbers...', progress: 0.4, processing: true })
      const { base64, mediaType } = canvasToBase64(ctx, w, h)

      const prompt = `This tablature image has ${detectedNotes.length} notes marked with red numbered arrows (1 through ${detectedNotes.length}) pointing down at each note.

For each numbered arrow, read:
1. The fret number written on the staff line where the arrow points (digits like 0, 1, 2, 3, etc.)
2. If there are picking-hand finger labels (T, I, M, or Thumb, Index, Middle) written below the staff, read those too.

Output a JSON object with:
- "frets": array of fret numbers in order (e.g. [0,0,0,2,0,0,0,0])
- "fingers": array of finger letters in order (e.g. ["T","I","T","M","T","T","I","M"]), or null if no finger labels are visible in the image

Output ONLY the JSON object, nothing else.`

      try {
        const modelResp = await callVisionModel(base64, mediaType, prompt, onProgress)

        // Parse response
        const jsonMatch = modelResp.match(/\{[\s\S]*\}/)
        let frets: number[] = []
        let fingers: string[] | null = null

        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0])
            if (Array.isArray(parsed.frets)) frets = parsed.frets
            if (Array.isArray(parsed.fingers)) fingers = parsed.fingers
          } catch { /* fall through */ }
        }

        // Fallback: try parsing as a plain array (old format)
        if (frets.length === 0) {
          const arrMatch = modelResp.match(/\[[\s\S]*?\]/)
          if (arrMatch) {
            try { frets = JSON.parse(arrMatch[0]) } catch { /* */ }
          }
        }

        // Combine with our line assignments
        if (frets.length === detectedNotes.length) {
          const combined = detectedNotes.map((n, i) => ({
            lineNum: n.lineNum,
            fret: frets[i],
          }))
          // Use model fingers if available and correct count, otherwise auto-assign
          const validFingers = fingers && fingers.length === detectedNotes.length ? fingers : null
          return { text: formatTab(combined, validFingers), confidence: 90, processing: false }
        }

        const allZero = detectedNotes.map((n) => ({ lineNum: n.lineNum, fret: 0 }))
        return { text: formatTab(allZero), confidence: 70, processing: false }
      } catch {
        const allZero = detectedNotes.map((n) => ({ lineNum: n.lineNum, fret: 0 }))
        return { text: formatTab(allZero), confidence: 60, processing: false }
      }
    }
  }

  // Fallback: full vision model OCR (programmatic detection failed)
  onProgress?.({ status: 'Sending to Claude Vision...', progress: 0.3, processing: true })
  const { base64, mediaType } = canvasToBase64(ctx, w, h)

  const fallbackPrompt = `This image shows 5-string banjo tablature with 5 horizontal lines and fret numbers on them.

Read each fret number from LEFT to RIGHT. For each, identify which line (1=top through 5=bottom) it sits on.

Output a JSON array: [[line_number, fret_number], ...] ordered left to right.
Output ONLY the JSON array.`

  const modelResp = await callVisionModel(base64, mediaType, fallbackPrompt, onProgress)
  return { text: jsonToTab(modelResp), confidence: 80, processing: false }
}
