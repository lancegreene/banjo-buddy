// Banjo Buddy — Rhythm Analysis (essentia.js wrapper)
// Lazy-loaded WASM module for beat tracking & onset detection.

export interface BeatGrid {
  beats: number[]        // timestamps in seconds
  tempo: number          // detected BPM
  confidence: number     // 0-1
}

export interface OnsetResult {
  onsets: number[]       // timestamps in seconds
  method: string
}

let essentiaInstance: any = null

async function getEssentia(): Promise<any> {
  if (essentiaInstance) return essentiaInstance
  // Dynamic import — only loads the ~2MB WASM when first called
  const { Essentia, EssentiaWASM } = await import('essentia.js')
  const wasm = await EssentiaWASM()
  essentiaInstance = new Essentia(wasm)
  return essentiaInstance
}

export async function detectBeats(audioBuffer: Float32Array, sampleRate: number): Promise<BeatGrid> {
  const essentia = await getEssentia()
  const signal = essentia.arrayToVector(audioBuffer)

  const rhythm = essentia.RhythmExtractor2013(signal)

  return {
    beats: Array.from(rhythm.ticks) as number[],
    tempo: rhythm.bpm,
    confidence: rhythm.confidence,
  }
}

export async function detectOnsets(audioBuffer: Float32Array, sampleRate: number): Promise<OnsetResult> {
  const essentia = await getEssentia()
  const signal = essentia.arrayToVector(audioBuffer)

  const result = essentia.OnsetDetection(signal, sampleRate)

  return {
    onsets: Array.from(result.onsetDetections) as number[],
    method: 'essentia-hfc',
  }
}

export async function alignToBeatGrid(
  onsets: number[],
  beatGrid: BeatGrid
): Promise<{ alignedOnsets: number[]; deviations: number[] }> {
  const alignedOnsets: number[] = []
  const deviations: number[] = []

  for (const onset of onsets) {
    // Find nearest beat
    let minDist = Infinity
    let nearestBeat = 0
    for (const beat of beatGrid.beats) {
      const dist = Math.abs(onset - beat)
      if (dist < minDist) {
        minDist = dist
        nearestBeat = beat
      }
    }
    alignedOnsets.push(nearestBeat)
    deviations.push(onset - nearestBeat)
  }

  return { alignedOnsets, deviations }
}
