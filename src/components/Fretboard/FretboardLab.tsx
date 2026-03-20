// ─── FretboardLab — Sandbox page for developing the fretboard diagram ────────

import { useState, useRef } from 'react'
import { FretboardDiagram } from './FretboardDiagram'
import {
  EXAMPLE_FORWARD_ROLL,
  EXAMPLE_CRIPPLE_CREEK,
  EXAMPLE_FOGGY_MOUNTAIN,
  type FretNote,
} from '../../data/fretboardNotes'
import { parseTab, type ParseResult } from '../../engine/tabParser'
import { notesToTabText } from '../../engine/tabParser'
import { extractTabFromImage, type OcrProgress } from '../../engine/tabImageOcr'
import { TabImageCropper } from './TabImageCropper'

interface SongEntry {
  id: string
  label: string
  notes: FretNote[]
  isImported?: boolean
}

const BUILT_IN_SONGS: SongEntry[] = [
  { id: 'forward-roll', label: 'Forward Roll', notes: EXAMPLE_FORWARD_ROLL },
  { id: 'cripple-creek', label: 'Cripple Creek', notes: EXAMPLE_CRIPPLE_CREEK },
  { id: 'foggy-mountain', label: 'Foggy Mountain', notes: EXAMPLE_FOGGY_MOUNTAIN },
]

const BPM_PRESETS = [60, 80, 100, 120, 140, 160]
const GROUP_SIZE = 8

const EXAMPLE_TAB = `D|---0---0---0---|
B|-----0-------0-|
G|-0-------0-----|
D|---------------|
g|-------0-------|`

export function FretboardLab() {
  const [songs, setSongs] = useState<SongEntry[]>(BUILT_IN_SONGS)
  const [songId, setSongId] = useState('cripple-creek')
  const [autoPlay, setAutoPlay] = useState(false)
  const [bpm, setBpm] = useState(100)
  const [groupIdx, setGroupIdx] = useState(0)
  const [showAll, setShowAll] = useState(false)

  // Tab import state
  const [showImport, setShowImport] = useState(false)
  const [tabText, setTabText] = useState('')
  const [tabName, setTabName] = useState('')
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [ocrProgress, setOcrProgress] = useState<OcrProgress | null>(null)
  const [ocrPreviewUrl, setOcrPreviewUrl] = useState<string | null>(null)
  const [cropperImageUrl, setCropperImageUrl] = useState<string | null>(null)
  const [editingSongId, setEditingSongId] = useState<string | null>(null) // track which imported song we're editing
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const song = songs.find((s) => s.id === songId) ?? songs[0]
  const totalGroups = Math.ceil(song.notes.length / GROUP_SIZE)
  const groupNotes = showAll
    ? song.notes
    : song.notes.slice(groupIdx * GROUP_SIZE, (groupIdx + 1) * GROUP_SIZE)

  function changeSong(id: string) {
    setSongId(id)
    setAutoPlay(false)
    setGroupIdx(0)
  }

  function handleParseTab() {
    if (!tabText.trim()) return
    const result = parseTab(tabText)
    setParseResult(result)
  }

  function handleImportTab() {
    if (!parseResult || parseResult.notes.length === 0) return
    const name = tabName.trim() || `Imported Tab ${songs.filter((s) => s.isImported).length + 1}`

    if (editingSongId) {
      // Update existing song
      setSongs((prev) => prev.map((s) =>
        s.id === editingSongId ? { ...s, label: name, notes: parseResult.notes } : s
      ))
      setSongId(editingSongId)
    } else {
      // Create new song
      const id = `imported-${Date.now()}`
      const newSong: SongEntry = {
        id,
        label: name,
        notes: parseResult.notes,
        isImported: true,
      }
      setSongs((prev) => [...prev, newSong])
      setSongId(id)
    }

    setGroupIdx(0)
    setAutoPlay(false)
    setShowImport(false)
    setTabText('')
    setTabName('')
    setParseResult(null)
    setEditingSongId(null)
  }

  function handleEditImported(id: string) {
    const song = songs.find((s) => s.id === id)
    if (!song) return
    setEditingSongId(id)
    setTabText(notesToTabText(song.notes))
    setTabName(song.label)
    setParseResult(null)
    setShowImport(true)
    setTimeout(() => textareaRef.current?.focus(), 100)
  }

  function handleLoadExample() {
    setTabText(EXAMPLE_TAB)
    setParseResult(null)
  }

  function handleRemoveImported(id: string) {
    setSongs((prev) => prev.filter((s) => s.id !== id))
    if (songId === id) changeSong(BUILT_IN_SONGS[0].id)
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = reader.result as string
      setTabText(text)
      setTabName(file.name.replace(/\.(txt|tab)$/i, ''))
      setParseResult(null)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    // Open the cropper with this image
    const url = URL.createObjectURL(file)
    setCropperImageUrl(url)
    setTabName(file.name.replace(/\.(png|jpg|jpeg|webp|bmp|gif)$/i, ''))
    setParseResult(null)
  }

  async function handleCropComplete(croppedBlob: Blob) {
    // Close cropper, show preview of cropped region
    if (cropperImageUrl) URL.revokeObjectURL(cropperImageUrl)
    setCropperImageUrl(null)

    const previewUrl = URL.createObjectURL(croppedBlob)
    setOcrPreviewUrl(previewUrl)

    // Run OCR on cropped image
    try {
      const result = await extractTabFromImage(croppedBlob, setOcrProgress)
      setTabText(result.text)
      setOcrProgress(null)
      setTimeout(() => textareaRef.current?.focus(), 100)
    } catch (err) {
      setOcrProgress(null)
      setTabText(`// OCR failed: ${err instanceof Error ? err.message : 'Unknown error'}\n// Try pasting the tab text manually`)
    }
  }

  function handleCropCancel() {
    if (cropperImageUrl) URL.revokeObjectURL(cropperImageUrl)
    setCropperImageUrl(null)
  }

  function clearOcrPreview() {
    if (ocrPreviewUrl) {
      URL.revokeObjectURL(ocrPreviewUrl)
      setOcrPreviewUrl(null)
    }
  }

  return (
    <div className="fretboard-lab">
      <div className="fretboard-lab-header">
        <h2 className="fretboard-lab-title">Fretboard Lab</h2>
        <p className="fretboard-lab-desc">
          Interactive fretboard diagram — notes light up as you play. Tap the fretboard to advance, or use auto-play.
          Import your own tabs to visualize any song on the fretboard.
        </p>
      </div>

      {/* Song selector */}
      <div className="fretboard-lab-section">
        <label className="fretboard-lab-label">Song / Pattern</label>
        <div className="fretboard-lab-pills">
          {songs.map((s) => (
            <div key={s.id} className="fretboard-lab-pill-wrap">
              <button
                className={`fretboard-lab-pill ${songId === s.id ? 'fretboard-lab-pill-active' : ''}`}
                onClick={() => changeSong(s.id)}
              >
                {s.label}
                <span className="fretboard-lab-pill-count">{s.notes.length} notes</span>
              </button>
              {s.isImported && (
                <>
                  <button
                    className="fretboard-lab-pill-edit"
                    onClick={(e) => { e.stopPropagation(); handleEditImported(s.id) }}
                    title="Edit imported tab"
                  >
                    &#9998;
                  </button>
                  <button
                    className="fretboard-lab-pill-remove"
                    onClick={(e) => { e.stopPropagation(); handleRemoveImported(s.id) }}
                    title="Remove imported tab"
                  >
                    ✕
                  </button>
                </>
              )}
            </div>
          ))}
          <button
            className={`fretboard-lab-pill fretboard-lab-pill-import ${showImport ? 'fretboard-lab-pill-active' : ''}`}
            onClick={() => { setShowImport(!showImport); if (showImport) setEditingSongId(null) }}
          >
            + Import Tab
          </button>
        </div>
      </div>

      {/* Tab import panel */}
      {showImport && (
        <div className="fretboard-lab-import">
          <div className="fretboard-lab-import-header">
            <h3>{editingSongId ? 'Edit Tablature' : 'Import Tablature'}</h3>
            <p>{editingSongId
              ? 'Edit the tab text below, then re-parse and save your changes.'
              : 'Paste tab text, upload a text file, or scan a tab image. Edit the result before importing.'
            }</p>
          </div>

          <div className="fretboard-lab-import-actions-top">
            <label className="fretboard-lab-file-btn">
              Upload Text
              <input type="file" accept=".txt,.tab,.text" onChange={handleFileUpload} hidden />
            </label>
            <label className="fretboard-lab-file-btn fretboard-lab-image-btn">
              Scan Tab Image
              <input type="file" accept="image/*" onChange={handleImageUpload} hidden />
            </label>
            <button className="fretboard-lab-example-btn" onClick={handleLoadExample}>
              Load Example
            </button>
          </div>

          {/* OCR progress indicator */}
          {ocrProgress && (
            <div className="fretboard-lab-ocr-progress">
              <div className="fretboard-lab-ocr-status">
                {ocrProgress.status === 'recognizing text' ? 'Reading tab...' : ocrProgress.status}
              </div>
              <div className="fretboard-lab-ocr-bar">
                <div
                  className="fretboard-lab-ocr-bar-fill"
                  style={{ width: `${Math.round(ocrProgress.progress * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Image preview */}
          {ocrPreviewUrl && (
            <div className="fretboard-lab-ocr-preview">
              <img src={ocrPreviewUrl} alt="Tab image" className="fretboard-lab-ocr-image" />
              <button className="fretboard-lab-ocr-clear" onClick={clearOcrPreview}>✕</button>
            </div>
          )}

          <textarea
            ref={textareaRef}
            className="fretboard-lab-import-textarea"
            value={tabText}
            onChange={(e) => { setTabText(e.target.value); setParseResult(null) }}
            placeholder={`Paste tab here, e.g.:\n\nD|---0---0---0---|\nB|-----0-------0-|\nG|-0-------0-----|\nD|---------------|\ng|-------0-------|`}
            rows={8}
            spellCheck={false}
          />

          <div className="fretboard-lab-import-controls">
            <input
              type="text"
              className="fretboard-lab-import-name"
              value={tabName}
              onChange={(e) => setTabName(e.target.value)}
              placeholder="Tab name (optional)"
            />
            <button
              className="fretboard-lab-parse-btn"
              onClick={handleParseTab}
              disabled={!tabText.trim()}
            >
              Parse Tab
            </button>
          </div>

          {/* Parse results */}
          {parseResult && (
            <div className="fretboard-lab-import-result">
              {parseResult.notes.length > 0 ? (
                <>
                  <div className="fretboard-lab-import-success">
                    Parsed {parseResult.notes.length} notes from {parseResult.lineCount} tab lines
                  </div>
                  {parseResult.warnings.map((w, i) => (
                    <div key={i} className="fretboard-lab-import-warning">{w}</div>
                  ))}

                  {/* Preview of parsed notes */}
                  <div className="fretboard-lab-import-preview">
                    {parseResult.notes.slice(0, 16).map((n, i) => (
                      <span key={i} className="fretboard-lab-import-preview-note">
                        S{n.string}:{n.fret === 0 ? 'O' : n.fret}
                      </span>
                    ))}
                    {parseResult.notes.length > 16 && (
                      <span className="fretboard-lab-import-preview-more">
                        +{parseResult.notes.length - 16} more
                      </span>
                    )}
                  </div>

                  <button className="fretboard-lab-import-btn" onClick={handleImportTab}>
                    {editingSongId ? 'Save Changes' : 'Add to Fretboard Lab'}
                  </button>
                </>
              ) : (
                <div className="fretboard-lab-import-error">
                  No notes found. {parseResult.warnings.join(' ')}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Group navigation */}
      <div className="fretboard-lab-section">
        <label className="fretboard-lab-label">Note Group</label>
        <div className="fretboard-lab-group-nav">
          <button
            className="fretboard-lab-group-btn"
            disabled={showAll || groupIdx === 0}
            onClick={() => setGroupIdx((g) => g - 1)}
          >
            ◀ Prev
          </button>
          <div className="fretboard-lab-group-pills">
            {Array.from({ length: totalGroups }, (_, i) => (
              <button
                key={i}
                className={`fretboard-lab-group-pill ${!showAll && groupIdx === i ? 'fretboard-lab-group-pill-active' : ''}`}
                onClick={() => { setGroupIdx(i); setShowAll(false); setAutoPlay(false) }}
              >
                {i * GROUP_SIZE + 1}–{Math.min((i + 1) * GROUP_SIZE, song.notes.length)}
              </button>
            ))}
            <button
              className={`fretboard-lab-group-pill ${showAll ? 'fretboard-lab-group-pill-active' : ''}`}
              onClick={() => { setShowAll(true); setAutoPlay(false) }}
            >
              All
            </button>
          </div>
          <button
            className="fretboard-lab-group-btn"
            disabled={showAll || groupIdx >= totalGroups - 1}
            onClick={() => setGroupIdx((g) => g + 1)}
          >
            Next ▶
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="fretboard-lab-controls">
        <div className="fretboard-lab-control">
          <label className="fretboard-lab-label">Auto-Play</label>
          <button
            className={`fretboard-lab-toggle ${autoPlay ? 'fretboard-lab-toggle-on' : ''}`}
            onClick={() => setAutoPlay(!autoPlay)}
          >
            {autoPlay ? '■ Stop' : '▶ Play'}
          </button>
        </div>

        <div className="fretboard-lab-control">
          <label className="fretboard-lab-label">
            BPM: <strong>{bpm}</strong>
          </label>
          <input
            type="range"
            className="fretboard-lab-slider"
            min={40}
            max={200}
            value={bpm}
            onChange={(e) => setBpm(Number(e.target.value))}
          />
          <div className="fretboard-lab-presets">
            {BPM_PRESETS.map((p) => (
              <button
                key={p}
                className={`fretboard-lab-preset ${bpm === p ? 'fretboard-lab-preset-active' : ''}`}
                onClick={() => setBpm(p)}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* The diagram (includes tab strip) */}
      <FretboardDiagram
        key={songId + '-' + (showAll ? 'all' : groupIdx) + (autoPlay ? '-auto' : '-manual')}
        notes={groupNotes}
        currentIndex={autoPlay ? 0 : -1}
        autoPlay={autoPlay}
        bpm={bpm}
      />

      {/* Image crop modal */}
      {cropperImageUrl && (
        <TabImageCropper
          imageUrl={cropperImageUrl}
          onCrop={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}
    </div>
  )
}
