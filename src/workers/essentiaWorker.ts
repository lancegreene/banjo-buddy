// Banjo Buddy — Essentia Web Worker
// Runs rhythm analysis off the main thread to avoid jank.

import { detectBeats, detectOnsets, alignToBeatGrid } from '../engine/rhythmAnalysis'

export interface WorkerMessage {
  type: 'detectBeats' | 'detectOnsets' | 'alignToBeatGrid'
  id: string
  payload: any
}

export interface WorkerResponse {
  type: 'result' | 'error'
  id: string
  payload: any
}

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const { type, id, payload } = e.data

  try {
    let result: any

    switch (type) {
      case 'detectBeats':
        result = await detectBeats(payload.audioBuffer, payload.sampleRate)
        break
      case 'detectOnsets':
        result = await detectOnsets(payload.audioBuffer, payload.sampleRate)
        break
      case 'alignToBeatGrid':
        result = await alignToBeatGrid(payload.onsets, payload.beatGrid)
        break
      default:
        throw new Error(`Unknown message type: ${type}`)
    }

    self.postMessage({ type: 'result', id, payload: result } as WorkerResponse)
  } catch (err: any) {
    self.postMessage({ type: 'error', id, payload: err.message } as WorkerResponse)
  }
}
