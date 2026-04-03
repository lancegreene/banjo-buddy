// ─── TabTrainingManager — Browse, review, and export training data pairs ──────

import { useState, useEffect } from 'react'
import { getAllTrainingPairs, deleteTrainingPair, saveTrainingPair, type TabTrainingPair } from '../../db/db'
import type { FretNote } from '../../data/fretboardNotes'
import { generateBatch, type BatchProgress } from '../../engine/syntheticTabGenerator'
import { loadDigitModel, loadLabelModel, isModelAvailable, isLabelModelAvailable } from '../../engine/digitClassifier'

const STRING_LABELS: Record<number, string> = { 1: 'D', 2: 'B', 3: 'G', 4: 'd', 5: 'g' }
const STRING_COLORS: Record<number, string> = {
  1: '#e74c3c', 2: '#f39c12', 3: '#27ae60', 4: '#3498db', 5: '#9b59b6',
}

const BATCH_SIZES = [100, 500, 1000, 5000] as const

interface TabTrainingManagerProps {
  onClose: () => void
}

export function TabTrainingManager({ onClose }: TabTrainingManagerProps) {
  const [pairs, setPairs] = useState<TabTrainingPair[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({})
  const [exporting, setExporting] = useState(false)

  // Synthetic generation state
  const [genCount, setGenCount] = useState<number>(500)
  const [generating, setGenerating] = useState(false)
  const [genProgress, setGenProgress] = useState<BatchProgress | null>(null)

  // Model status
  const [modelStatus, setModelStatus] = useState<'checking' | 'loaded' | 'not-found'>('checking')

  useEffect(() => {
    loadPairs()
    checkModelStatus()
  }, [])

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      Object.values(previewUrls).forEach(URL.revokeObjectURL)
    }
  }, [previewUrls])

  async function checkModelStatus() {
    if (isModelAvailable()) {
      setModelStatus('loaded')
    } else {
      const session = await loadDigitModel()
      setModelStatus(session ? 'loaded' : 'not-found')
    }
    // Also try loading label model (non-blocking)
    if (!isLabelModelAvailable()) {
      await loadLabelModel()
    }
  }

  async function loadPairs() {
    setLoading(true)
    const data = await getAllTrainingPairs()
    setPairs(data)
    setLoading(false)
  }

  function getPreviewUrl(pair: TabTrainingPair): string {
    if (previewUrls[pair.id]) return previewUrls[pair.id]
    const url = URL.createObjectURL(pair.imageBlob)
    setPreviewUrls((prev) => ({ ...prev, [pair.id]: url }))
    return url
  }

  function parseNotes(pair: TabTrainingPair): FretNote[] {
    try {
      return JSON.parse(pair.correctedNotes)
    } catch {
      return []
    }
  }

  async function handleDelete(id: string) {
    await deleteTrainingPair(id)
    if (previewUrls[id]) {
      URL.revokeObjectURL(previewUrls[id])
      setPreviewUrls((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
    }
    setPairs((prev) => prev.filter((p) => p.id !== id))
  }

  async function handleExportAll() {
    setExporting(true)
    try {
      // Export as JSON with base64 images — build incrementally to avoid
      // "Invalid string length" on large datasets (1000+ images)
      const parts: string[] = []
      parts.push(`{"exportedAt":"${new Date().toISOString()}","trainingData":[\n`)

      for (let i = 0; i < pairs.length; i++) {
        const pair = pairs[i]
        const arrayBuf = await pair.imageBlob.arrayBuffer()
        const bytes = new Uint8Array(arrayBuf)
        // Convert to base64 in chunks to avoid string length limits
        let binary = ''
        const CHUNK = 8192
        for (let j = 0; j < bytes.length; j += CHUNK) {
          binary += String.fromCharCode(...bytes.subarray(j, j + CHUNK))
        }
        const base64 = btoa(binary)
        const entry = JSON.stringify({
          id: pair.id,
          label: pair.label,
          imageBase64: base64,
          imageMimeType: pair.imageBlob.type || 'image/png',
          correctedNotes: JSON.parse(pair.correctedNotes),
          noteCount: pair.noteCount,
          createdAt: pair.createdAt,
        })
        parts.push(entry)
        if (i < pairs.length - 1) parts.push(',\n')
      }

      parts.push('\n]}')
      const blob = new Blob(parts, { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `banjo-tab-training-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  async function handleDeleteAllSynthetic() {
    const syntheticPairs = pairs.filter((p) => p.label.startsWith('synthetic:'))
    for (const pair of syntheticPairs) {
      if (previewUrls[pair.id]) {
        URL.revokeObjectURL(previewUrls[pair.id])
      }
      await deleteTrainingPair(pair.id)
    }
    setPreviewUrls((prev) => {
      const next = { ...prev }
      for (const p of syntheticPairs) delete next[p.id]
      return next
    })
    setPairs((prev) => prev.filter((p) => !p.label.startsWith('synthetic:')))
  }

  async function handleGenerateSynthetic() {
    setGenerating(true)
    setGenProgress({ completed: 0, total: genCount })
    try {
      const { results } = await generateBatch(genCount, (p) => setGenProgress(p))

      // Save each synthetic tab as a training pair
      for (const result of results) {
        const notes = result.digits.map((d) => ({
          string: d.lineNum,
          fret: d.digit,
          finger: d.label.split('-')[0] as 'T' | 'I' | 'M',
          label: d.label,  // combined finger+technique label: T, I, M, T-P, T-H, etc.
          // Include pixel positions so the Python trainer can crop directly
          cx: d.centerX,
          cy: d.centerY,
          lcx: d.labelCenterX,  // label crop center
          lcy: d.labelCenterY,
        }))
        await saveTrainingPair(
          result.imageBlob,
          notes,
          `synthetic: ${result.digits.map((d) => d.digit).join(',')}`,
        )
      }

      // Reload pairs to show new data
      await loadPairs()
    } finally {
      setGenerating(false)
      setGenProgress(null)
    }
  }

  const syntheticCount = pairs.filter((p) => p.label.startsWith('synthetic:')).length
  const realCount = pairs.length - syntheticCount

  return (
    <div className="tab-training-wrap">
      <div className="tab-training-modal">
        <div className="tab-training-header">
          <h3>Tab Training Data</h3>
          <p>
            {pairs.length} saved pair{pairs.length !== 1 ? 's' : ''}
            {pairs.length > 0 && ` (${realCount} real, ${syntheticCount} synthetic)`}
            {' '}&mdash; each contains an original tab image
            and the corrected note sequence. These are used to improve future tab scanning accuracy.
          </p>
        </div>

        {/* Model status indicator */}
        <div className={`tab-training-model-status ${modelStatus}`}>
          {modelStatus === 'checking' && 'Checking models...'}
          {modelStatus === 'loaded' && (
            <>Digit model loaded{isLabelModelAvailable() ? ' + Label model loaded' : ' (no label model)'}</>
          )}
          {modelStatus === 'not-found' && 'No digit model found — using Vision API fallback'}
        </div>

        {/* Synthetic generation controls */}
        <div className="tab-training-gen-controls">
          <label>
            Generate synthetic data:
            <select
              value={genCount}
              onChange={(e) => setGenCount(Number(e.target.value))}
              disabled={generating}
            >
              {BATCH_SIZES.map((n) => (
                <option key={n} value={n}>{n} images</option>
              ))}
            </select>
          </label>
          <button
            className="btn btn-sm"
            onClick={handleGenerateSynthetic}
            disabled={generating}
          >
            {generating ? 'Generating...' : 'Generate Synthetic'}
          </button>
          {syntheticCount > 0 && (
            <button
              className="btn btn-sm"
              onClick={handleDeleteAllSynthetic}
              disabled={generating}
            >
              Delete Synthetic ({syntheticCount})
            </button>
          )}
        </div>

        {/* Progress bar during generation */}
        {genProgress && (
          <div className="tab-training-progress">
            <div
              className="tab-training-progress-bar"
              style={{ width: `${(genProgress.completed / genProgress.total) * 100}%` }}
            />
            <span>{genProgress.completed} / {genProgress.total}</span>
          </div>
        )}

        {loading ? (
          <div className="tab-training-loading">Loading...</div>
        ) : pairs.length === 0 ? (
          <div className="tab-training-empty">
            No training data yet. Scan a tab image and confirm with "Save as training data" checked,
            or generate synthetic data above.
          </div>
        ) : (
          <div className="tab-training-list">
            {pairs.map((pair) => {
              const isExpanded = expandedId === pair.id
              const notes = isExpanded ? parseNotes(pair) : []

              return (
                <div key={pair.id} className="tab-training-item">
                  <div
                    className="tab-training-item-header"
                    onClick={() => setExpandedId(isExpanded ? null : pair.id)}
                  >
                    <div className="tab-training-item-info">
                      <strong>{pair.label}</strong>
                      <span className="tab-training-item-meta">
                        {pair.noteCount} notes &middot; {new Date(pair.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="tab-training-item-actions">
                      <button
                        className="btn btn-sm"
                        onClick={(e) => { e.stopPropagation(); handleDelete(pair.id) }}
                        title="Delete training pair"
                      >
                        Delete
                      </button>
                      <span className="tab-training-expand">{isExpanded ? '\u25B2' : '\u25BC'}</span>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="tab-training-item-detail">
                      <img
                        src={getPreviewUrl(pair)}
                        alt={pair.label}
                        className="tab-training-preview-img"
                      />
                      <div className="tab-training-notes-strip">
                        {notes.map((n, i) => (
                          <span
                            key={i}
                            className="tab-overlay-summary-note"
                            style={{
                              borderColor: STRING_COLORS[n.string],
                              color: STRING_COLORS[n.string],
                            }}
                          >
                            {STRING_LABELS[n.string]}:{n.fret}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <div className="tab-training-toolbar">
          <button
            className="btn btn-sm"
            onClick={handleExportAll}
            disabled={pairs.length === 0 || exporting}
          >
            {exporting ? 'Exporting...' : `Export All (${pairs.length})`}
          </button>
          <button className="btn btn-sm" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
