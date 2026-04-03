// ─── digitClassifier — Client-side digit + label recognition via ONNX Runtime Web
//
// Two models:
//   1. digit-classifier.onnx — reads fret numbers (0-12) from 32x32 crops
//   2. label-classifier.onnx — reads finger+technique labels (T, I, M, T-P, etc.)
//      from 32x32 crops below the staff
//
// Both loaded lazily via dynamic import of onnxruntime-web.

import { LABEL_CLASSES } from './syntheticTabGenerator'

// Lazy-loaded ONNX runtime types
type InferenceSession = import('onnxruntime-web').InferenceSession
type Tensor = import('onnxruntime-web').Tensor

let _digitSession: InferenceSession | null = null
let _labelSession: InferenceSession | null = null
let _digitLoadPromise: Promise<InferenceSession | null> | null = null
let _labelLoadPromise: Promise<InferenceSession | null> | null = null
let _ort: typeof import('onnxruntime-web') | null = null

/**
 * Dynamically import onnxruntime-web to avoid bundle bloat.
 * Returns null if the library is not installed.
 */
async function getOrt(): Promise<typeof import('onnxruntime-web') | null> {
  if (_ort) return _ort
  try {
    _ort = await import('onnxruntime-web')
    return _ort
  } catch {
    console.warn('[digitClassifier] onnxruntime-web not available')
    return null
  }
}

/** Generic model loader — fetches and creates an ONNX session */
async function loadModel(filename: string): Promise<InferenceSession | null> {
  const ort = await getOrt()
  if (!ort) return null

  ort.env.wasm.numThreads = 1

  const modelPath = import.meta.env.BASE_URL + 'models/' + filename
  const response = await fetch(modelPath)
  if (!response.ok) {
    console.warn(`[digitClassifier] Model not found at ${modelPath} (${response.status})`)
    return null
  }

  const buffer = await response.arrayBuffer()
  return ort.InferenceSession.create(buffer, {
    executionProviders: ['wasm'],
  })
}

/**
 * Load the digit classifier ONNX model (fret numbers 0-12).
 * Caches the session — safe to call repeatedly.
 */
export async function loadDigitModel(): Promise<InferenceSession | null> {
  if (_digitSession) return _digitSession
  if (_digitLoadPromise) return _digitLoadPromise

  _digitLoadPromise = (async () => {
    try {
      _digitSession = await loadModel('digit-classifier.onnx')
      if (_digitSession) console.log('[digitClassifier] Digit model loaded')
      return _digitSession
    } catch (err) {
      console.warn('[digitClassifier] Failed to load digit model:', err)
      return null
    } finally {
      _digitLoadPromise = null
    }
  })()

  return _digitLoadPromise
}

/**
 * Load the label classifier ONNX model (finger+technique labels).
 * Caches the session — safe to call repeatedly.
 */
export async function loadLabelModel(): Promise<InferenceSession | null> {
  if (_labelSession) return _labelSession
  if (_labelLoadPromise) return _labelLoadPromise

  _labelLoadPromise = (async () => {
    try {
      _labelSession = await loadModel('label-classifier.onnx')
      if (_labelSession) console.log('[digitClassifier] Label model loaded')
      return _labelSession
    } catch (err) {
      console.warn('[digitClassifier] Failed to load label model:', err)
      return null
    } finally {
      _labelLoadPromise = null
    }
  })()

  return _labelLoadPromise
}

/** Check if the digit model is loaded and ready. */
export function isModelAvailable(): boolean {
  return _digitSession !== null
}

/** Check if the label model is loaded and ready. */
export function isLabelModelAvailable(): boolean {
  return _labelSession !== null
}

/**
 * Preprocess a 32x32 RGBA ImageData into a 1x1x32x32 float32 tensor.
 * Converts to grayscale, normalizes to [0,1], and inverts (dark on light → white on black).
 */
export async function preprocessDigitCrop(imageData: ImageData): Promise<Float32Array> {
  const { data, width, height } = imageData
  const tensor = new Float32Array(width * height)

  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4]
    const g = data[i * 4 + 1]
    const b = data[i * 4 + 2]
    const gray = (r * 0.299 + g * 0.587 + b * 0.114) / 255
    tensor[i] = 1.0 - gray
  }

  return tensor
}

export interface DigitPrediction {
  digit: number
  confidence: number
}

export interface LabelPrediction {
  label: string       // e.g. 'T', 'I', 'M', 'T-P', 'T-H'
  finger: 'T' | 'I' | 'M'
  technique: 'hammer' | 'pull' | 'slide' | null
  confidence: number
}

/** Run inference on a session and return softmax probabilities */
async function runInference(session: InferenceSession, crop: ImageData): Promise<number[]> {
  const ort = await getOrt()
  if (!ort) throw new Error('ONNX runtime not available')

  const inputData = await preprocessDigitCrop(crop)
  const inputTensor: Tensor = new ort.Tensor('float32', inputData, [1, 1, 32, 32])

  const feeds: Record<string, Tensor> = {}
  feeds[session.inputNames[0]] = inputTensor

  const results = await session.run(feeds)
  const output = results[session.outputNames[0]].data as Float32Array

  // Softmax
  const maxLogit = Math.max(...Array.from(output))
  const exps = Array.from(output).map((v) => Math.exp(v - maxLogit))
  const sumExp = exps.reduce((a, b) => a + b, 0)
  return exps.map((e) => e / sumExp)
}

/** Find the index + probability of the best class */
function argmax(probs: number[]): [number, number] {
  let bestIdx = 0
  let bestProb = probs[0]
  for (let i = 1; i < probs.length; i++) {
    if (probs[i] > bestProb) {
      bestIdx = i
      bestProb = probs[i]
    }
  }
  return [bestIdx, bestProb]
}

/** Parse a combined label string into finger + technique */
function parseLabel(label: string): { finger: 'T' | 'I' | 'M'; technique: 'hammer' | 'pull' | 'slide' | null } {
  const parts = label.split('-')
  const finger = (parts[0] as 'T' | 'I' | 'M') || 'T'
  let technique: 'hammer' | 'pull' | 'slide' | null = null
  if (parts[1]) {
    const tech = parts[1].toUpperCase()
    if (tech === 'H') technique = 'hammer'
    else if (tech === 'P') technique = 'pull'
    else if (tech === 'SL') technique = 'slide'
  }
  return { finger, technique }
}

/**
 * Classify a single 32x32 digit crop.
 * Returns the predicted fret number and confidence.
 */
export async function classifyDigit(
  session: InferenceSession,
  crop: ImageData,
): Promise<DigitPrediction> {
  const probs = await runInference(session, crop)
  const [bestIdx, bestProb] = argmax(probs)
  return { digit: bestIdx, confidence: bestProb }
}

/**
 * Classify a single 32x32 label crop.
 * Returns the predicted combined label, parsed finger/technique, and confidence.
 */
export async function classifyLabel(
  session: InferenceSession,
  crop: ImageData,
): Promise<LabelPrediction> {
  const probs = await runInference(session, crop)
  const [bestIdx, bestProb] = argmax(probs)
  const label = LABEL_CLASSES[bestIdx] || 'T'
  const { finger, technique } = parseLabel(label)
  return { label, finger, technique, confidence: bestProb }
}

/**
 * Classify multiple digit crops in sequence.
 */
export async function classifyDigits(
  session: InferenceSession,
  crops: ImageData[],
): Promise<DigitPrediction[]> {
  const predictions: DigitPrediction[] = []
  for (const crop of crops) {
    predictions.push(await classifyDigit(session, crop))
  }
  return predictions
}

/**
 * Classify multiple label crops in sequence.
 */
export async function classifyLabels(
  session: InferenceSession,
  crops: ImageData[],
): Promise<LabelPrediction[]> {
  const predictions: LabelPrediction[] = []
  for (const crop of crops) {
    predictions.push(await classifyLabel(session, crop))
  }
  return predictions
}
