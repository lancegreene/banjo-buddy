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

import { db } from '../db/db'
import { loadDigitModel, loadLabelModel, classifyDigit, classifyLabel, isModelAvailable, isLabelModelAvailable, type LabelPrediction } from './digitClassifier'
import { cropDigit } from './syntheticTabGenerator'

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
export async function imageToCanvas(source: File | Blob | string): Promise<{
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

export function canvasToBase64(ctx: CanvasRenderingContext2D, w: number, h: number): { base64: string; mediaType: string } {
  const canvas = ctx.canvas
  // Ensure canvas dimensions match (they should, but be safe)
  void w; void h
  const dataUrl = canvas.toDataURL('image/png')
  const [header, data] = dataUrl.split(',')
  const mediaType = header.match(/data:(.*?);/)?.[1] ?? 'image/png'
  return { base64: data, mediaType }
}

// ─── Programmatic staff line + note detection ────────────────────────────────

export interface DetectedNote {
  lineNum: number   // 1-5 (which staff line)
  centerX: number   // horizontal center of the note cluster
  clusterWidth: number
}

/**
 * Detect staff lines by finding rows with the most horizontal dark pixel coverage.
 * Returns the Y centers of the 5 lines, or null if detection fails.
 *
 * Key insight: staff lines span nearly the entire image width. Notes, text, stems
 * are localized. So the "horizontal dark coverage" of a staff line row is much
 * higher than any other feature.
 *
 * Algorithm:
 * 1. For each row, count what fraction of columns have dark pixels → "hScore"
 * 2. Find peaks in the hScore profile (rows with high horizontal coverage)
 * 3. Pick the best 5 evenly-spaced peaks
 */
export function detectStaffLines(ctx: CanvasRenderingContext2D, w: number, h: number): number[] | null {
  const imageData = ctx.getImageData(0, 0, w, h)
  const px = imageData.data

  const bright = (x: number, y: number) => {
    const i = (y * w + x) * 4
    return px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114
  }

  // Adaptive dark threshold from image
  const sampleBrightnesses: number[] = []
  for (let y = 0; y < h; y += 3) {
    for (let x = 0; x < w; x += 10) {
      sampleBrightnesses.push(bright(x, y))
    }
  }
  sampleBrightnesses.sort((a, b) => a - b)
  const bgB = sampleBrightnesses[Math.floor(sampleBrightnesses.length * 0.8)]
  const darkThresh = bgB - 15

  // For each row, count what fraction of the width is dark (horizontal coverage)
  const hScore: number[] = []
  for (let y = 0; y < h; y++) {
    let darkCount = 0
    // Sample every 2nd pixel for speed
    for (let x = 0; x < w; x += 2) {
      if (bright(x, y) < darkThresh) darkCount++
    }
    hScore.push(darkCount / (w / 2)) // fraction of sampled pixels that are dark
  }

  // Smooth hScore with a small window
  const smoothR = 2
  const smoothed: number[] = []
  for (let y = 0; y < h; y++) {
    let sum = 0, count = 0
    for (let dy = -smoothR; dy <= smoothR; dy++) {
      const yy = y + dy
      if (yy >= 0 && yy < h) { sum += hScore[yy]; count++ }
    }
    smoothed.push(sum / count)
  }

  // Find peaks: rows where hScore is a local maximum and above a minimum threshold
  // Staff lines typically cover 50%+ of the image width
  const minCoverage = 0.3
  const minSep = Math.max(5, Math.round(h * 0.015))

  interface Peak { y: number; score: number }
  const peaks: Peak[] = []

  for (let y = minSep; y < h - minSep; y++) {
    if (smoothed[y] < minCoverage) continue

    // Local maximum within minSep
    let isMax = true
    for (let dy = 1; dy <= minSep; dy++) {
      if (smoothed[y - dy] > smoothed[y] || smoothed[y + dy] > smoothed[y]) {
        isMax = false
        break
      }
    }
    if (!isMax) continue
    peaks.push({ y, score: smoothed[y] })
  }

  // Merge nearby peaks (within minSep*2) — keep the stronger one
  const merged: Peak[] = []
  for (const peak of peaks) {
    const last = merged[merged.length - 1]
    if (last && peak.y - last.y < minSep * 2) {
      if (peak.score > last.score) merged[merged.length - 1] = peak
    } else {
      merged.push(peak)
    }
  }

  console.log(`[staffLines] image=${w}x${h}, bgB=${bgB.toFixed(0)}, darkThresh=${darkThresh.toFixed(0)}`)
  console.log(`[staffLines] ${peaks.length} raw peaks → ${merged.length} merged`)
  console.log(`[staffLines] peaks:`, merged.map((p) => `y=${p.y} score=${(p.score * 100).toFixed(1)}%`))

  if (merged.length < 5) {
    console.log(`[staffLines] FAILED: only ${merged.length} peaks (need 5)`)
    return null
  }

  if (merged.length === 5) {
    const ys = merged.map((p) => p.y)
    if (validateSpacing(ys)) {
      console.log(`[staffLines] exact 5: [${ys.join(', ')}]`)
      return ys
    }
  }

  // More than 5 peaks — find best group of 5 that are evenly spaced
  // Try all pairs as adjacent lines, extrapolate to 5
  const byScore = [...merged].sort((a, b) => b.score - a.score)
  let bestMatch: number[] | null = null
  let bestScore = -Infinity

  for (let i = 0; i < Math.min(byScore.length, 12); i++) {
    for (let j = i + 1; j < Math.min(byScore.length, 12); j++) {
      const y1 = Math.min(byScore[i].y, byScore[j].y)
      const y2 = Math.max(byScore[i].y, byScore[j].y)
      const rawGap = y2 - y1

      // Try this gap as spacing between lines k apart (k=1,2,3,4)
      for (let k = 1; k <= 4; k++) {
        const gap = rawGap / k

        // Need reasonable gap size (at least 2% of image height)
        if (gap < h * 0.02) continue

        // For each possible starting position
        for (let startIdx = 0; startIdx < 5; startIdx++) {
          const firstLine = y1 - startIdx * gap
          if (firstLine < -gap * 0.3) continue

          const expected = Array.from({ length: 5 }, (_, n) => firstLine + n * gap)
          if (expected[4] >= h + gap * 0.3) continue

          // Score: sum of hScore at matched positions, penalty for missing
          let score = 0
          const matched: number[] = []
          const tolerance = gap * 0.3

          for (const ey of expected) {
            const closest = merged.reduce((best, p) =>
              Math.abs(p.y - ey) < Math.abs(best.y - ey) ? p : best
            )
            if (Math.abs(closest.y - ey) <= tolerance) {
              score += closest.score * 100 // reward matched peaks
              matched.push(closest.y)
            } else {
              // Check if there's at least decent hScore at the expected position
              const ry = Math.round(Math.max(0, Math.min(h - 1, ey)))
              if (smoothed[ry] > minCoverage * 0.5) {
                score += smoothed[ry] * 30 // partial credit
                matched.push(ry)
              } else {
                score -= 20 // strong penalty for missing line
                matched.push(ry)
              }
            }
          }

          // Bonus for how well-matched the actual peaks are
          const uniqueMatched = new Set(matched).size
          if (uniqueMatched < 4) continue // at least 4 distinct positions

          if (score > bestScore) {
            bestScore = score
            bestMatch = matched
          }
        }
      }
    }
  }

  if (bestMatch && validateSpacing(bestMatch)) {
    console.log(`[staffLines] found: [${bestMatch.join(', ')}], score=${bestScore.toFixed(1)}`)
    return bestMatch
  }

  // Fallback: just take the 5 with highest hScore, sorted by Y
  const top5 = byScore.slice(0, 5).sort((a, b) => a.y - b.y).map((p) => p.y)
  if (validateSpacing(top5)) {
    console.log(`[staffLines] fallback top5: [${top5.join(', ')}]`)
    return top5
  }

  console.log(`[staffLines] FAILED: could not find 5 evenly-spaced lines among`, merged.map((p) => p.y))
  return null
}

/** Check that 5 Y-values are approximately evenly spaced (within 40% tolerance) */
function validateSpacing(ys: number[]): boolean {
  const gaps = ys.slice(1).map((y, i) => y - ys[i])
  const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length
  if (avgGap < 5) return false
  return gaps.every((g) => Math.abs(g - avgGap) / avgGap < 0.4)
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
export function detectNotePositions(
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
  const noteThreshold = baselineDark + 3 // at least 3 extra dark pixels = note present
  console.log(`[detectNotes] baseline=${baselineDark}, noteThreshold=${noteThreshold}, staffArea=${staffTop}-${staffBottom}`)

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

  console.log(`[detectNotes] ${noteColumns.length} note columns → ${clusters.length} raw clusters`)

  // Filter clusters by size:
  // - Too narrow (< 3px): probably a bar line or artifact
  // - Too wide (> 2 * lineGap): probably a thick bar or bracket
  const minNoteWidth = 3
  const maxNoteWidth = lineGap * 2
  const sizedClusters = clusters.filter(([s, e]) => {
    const cw = e - s + 1
    return cw >= minNoteWidth && cw < maxNoteWidth
  })
  console.log(`[detectNotes] ${sizedClusters.length} clusters after size filter (min=${minNoteWidth}, max=${maxNoteWidth.toFixed(0)})`)

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
    if (maxExtra < 3) {
      console.log(`[detectNotes] cluster x=${x0}-${x1} rejected: maxExtra=${maxExtra} < 3`)
      continue
    }

    // Concentration check: the winning line must be clearly dominant
    // Sort extras descending — winner must be >= 1.1x the runner-up
    // (lowered from 1.3 because barlines add dark pixels on ALL lines,
    //  making it hard for notes near barlines to pass)
    const sortedExtra = [...extra].sort((a, b) => b - a)
    if (sortedExtra[1] > 0 && sortedExtra[0] < sortedExtra[1] * 1.1) {
      console.log(`[detectNotes] cluster x=${x0}-${x1} rejected: concentration ${sortedExtra[0]}/${sortedExtra[1]} < 1.1`)
      continue
    }

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
export function fingerForLine(lineNum: number): 'T' | 'I' | 'M' {
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
    // Finger: use provided label if available, otherwise auto-assign from string
    const finger = fingers?.[i] ?? fingerForLine(lineNum)
    // Column width = max of fret string length and finger label length
    const colWidth = Math.max(fretStr.length, finger.length)
    for (let s = 1; s <= 5; s++) {
      const val = s === lineNum ? fretStr : '-'.repeat(fretStr.length)
      lines[s] += val + '-'.repeat(colWidth - val.length)
    }
    fingerRow += finger + '-'.repeat(colWidth - finger.length)
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

// ─── Training data types ──────────────────────────────────────────────────────

export interface TrainingExample {
  imageBase64: string
  imageMimeType: string
  frets: number[]
  noteCount: number
}

// ─── Local digit classification ──────────────────────────────────────────────

/**
 * Attempt to classify fret numbers and finger+technique labels locally.
 * For each detected note:
 *   - Crops 32x32 at the note position → digit classifier → fret number
 *   - Crops 32x32 below the staff (label area) → label classifier → finger + technique
 * Returns null if the digit model is not available.
 */
export async function classifyDetectedNotes(
  ctx: CanvasRenderingContext2D,
  detectedNotes: DetectedNote[],
  lineYs: number[],
): Promise<{
  frets: number[]
  labels: LabelPrediction[]
  confidence: number
} | null> {
  const digitSession = await loadDigitModel()
  if (!digitSession) return null

  const frets: number[] = []
  const labels: LabelPrediction[] = []
  let totalConfidence = 0

  // Label area: below the 5th line, offset by ~1 line gap
  const lineGap = lineYs[1] - lineYs[0]
  const labelY = lineYs[4] + lineGap * 0.8

  // Try loading label model (optional — digit model is required)
  const labelSession = await loadLabelModel()

  for (const note of detectedNotes) {
    const noteY = lineYs[note.lineNum - 1]

    // Classify fret number
    const digitCrop = cropDigit(ctx, note.centerX, noteY)
    const digitPred = await classifyDigit(digitSession, digitCrop)
    // Banjo heuristic: fret 9 is almost always a misread circled-0
    let fret = digitPred.digit
    if (fret === 9 && digitPred.confidence < 0.97) fret = 0
    frets.push(fret)
    totalConfidence += digitPred.confidence

    // Classify finger+technique label (if model available)
    if (labelSession) {
      const labelCrop = cropDigit(ctx, note.centerX, labelY)
      const labelPred = await classifyLabel(labelSession, labelCrop)
      labels.push(labelPred)
    } else {
      // Default: auto-assign finger from string, no technique
      labels.push({
        label: note.lineNum >= 3 ? 'T' : note.lineNum === 2 ? 'I' : 'M',
        finger: note.lineNum >= 3 ? 'T' : note.lineNum === 2 ? 'I' : 'M',
        technique: null,
        confidence: 0,
      })
    }
  }

  const avgConfidence = detectedNotes.length > 0 ? totalConfidence / detectedNotes.length : 0
  return { frets, labels, confidence: avgConfidence }
}

// ─── Vision model API call ───────────────────────────────────────────────────

export async function callVisionModel(
  base64: string,
  mediaType: string,
  prompt: string,
  onProgress?: (p: OcrProgress) => void,
  fewShotExamples?: TrainingExample[],
): Promise<string> {
  // Build messages — optionally prepend few-shot examples
  const messages: object[] = []

  if (fewShotExamples && fewShotExamples.length > 0) {
    for (const ex of fewShotExamples) {
      // User turn: show the example image with the same prompt structure
      messages.push({
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: ex.imageMimeType, data: ex.imageBase64 } },
          { type: 'text', text: `This tablature image has ${ex.noteCount} notes. Read the fret number for each note from left to right.\n\nOutput a JSON object with:\n- "frets": array of fret numbers in order\n\nOutput ONLY the JSON object.` },
        ],
      })
      // Assistant turn: show the correct answer
      messages.push({
        role: 'assistant',
        content: [
          { type: 'text', text: JSON.stringify({ frets: ex.frets }) },
        ],
      })
    }
  }

  // Final user turn: the actual image to process
  messages.push({
    role: 'user',
    content: [
      { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
      { type: 'text', text: prompt },
    ],
  })

  const body = {
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages,
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

// ─── Load training examples from DB ──────────────────────────────────────────

/**
 * Load up to `maxExamples` training pairs from the database and convert
 * their images to base64 for use as few-shot examples in the Vision API call.
 * Picks the most recent examples.
 */
async function loadTrainingExamples(maxExamples: number = 3): Promise<TrainingExample[]> {
  try {
    const pairs = await db.tabTrainingPairs.orderBy('createdAt').reverse().limit(maxExamples).toArray()
    if (pairs.length === 0) return []

    const examples: TrainingExample[] = []
    for (const pair of pairs) {
      const notes: { fret: number }[] = JSON.parse(pair.correctedNotes)
      const frets = notes.map((n) => n.fret ?? 0)

      // Convert blob to base64
      const arrayBuf = await pair.imageBlob.arrayBuffer()
      const bytes = new Uint8Array(arrayBuf)
      let binary = ''
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i])
      }
      const base64 = btoa(binary)

      examples.push({
        imageBase64: base64,
        imageMimeType: pair.imageBlob.type || 'image/png',
        frets,
        noteCount: frets.length,
      })
    }
    return examples
  } catch {
    return []
  }
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
    console.log('[tabOcr] Staff lines found at:', lineYs)
    const detectedNotes = detectNotePositions(ctx, w, h, lineYs)
    console.log('[tabOcr] Detected notes:', detectedNotes.length, detectedNotes)

    if (detectedNotes.length > 0) {
      // Step 1b: Try local digit classification first (fast, free, offline)
      // Attempt to load the model if not already loaded (lazy init)
      if (!isModelAvailable()) {
        console.log('[tabOcr] Loading digit model...')
        await loadDigitModel()
      }
      console.log('[tabOcr] Digit model available:', isModelAvailable())
      if (isModelAvailable()) {
        onProgress?.({ status: 'Classifying digits locally...', progress: 0.3, processing: true })
        const localResult = await classifyDetectedNotes(ctx, detectedNotes, lineYs)
        console.log('[tabOcr] Local classification result:', localResult ? {
          frets: localResult.frets,
          confidence: localResult.confidence.toFixed(3),
          labels: localResult.labels.map(l => `${l.label}(${l.confidence.toFixed(2)})`),
        } : 'null')
        if (localResult && localResult.confidence >= 0.85) {
          const combined = detectedNotes.map((n, i) => ({
            lineNum: n.lineNum,
            fret: localResult.frets[i],
          }))
          // Use label predictions for finger annotations if available
          const fingers = localResult.labels.map((l) => l.label)
          const hasLabels = localResult.labels.some((l) => l.confidence > 0)
          return {
            text: formatTab(combined, hasLabels ? fingers : null),
            confidence: Math.round(localResult.confidence * 100),
            processing: false,
          }
        }
        // Low confidence — fall through to Vision API
      }

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
      // Load training examples for few-shot prompting
      onProgress?.({ status: 'Loading training data...', progress: 0.35, processing: true })
      const trainingExamples = await loadTrainingExamples(3)

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
        const modelResp = await callVisionModel(base64, mediaType, prompt, onProgress, trainingExamples)

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
