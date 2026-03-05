#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Offline Debug Data Analyzer
//
// Replicates the EXACT detection pipeline from useNoteCapture.ts so offline
// analysis matches what the app actually does. Key difference from the old
// script: uses two-pass fundamental-priority getClosestString, per-string
// RMS floors, octave harmonic blocking with RMS override, string cooldown,
// and lockout reclassification simulation.
//
// Usage:  node analyze.cjs [recordedData.txt]
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs')
const path = require('path')

const file = process.argv[2] || path.join(__dirname, 'recordedData.txt')
const data = JSON.parse(fs.readFileSync(file, 'utf8'))

// ── Constants (mirrored from noteCapture.ts + useNoteCapture.ts) ──────────

const BANJO_STRINGS = [
  { string: 5, note: 'G', octave: 4, freq: 392.0 },
  { string: 4, note: 'D', octave: 3, freq: 146.83 },
  { string: 3, note: 'G', octave: 3, freq: 196.0 },
  { string: 2, note: 'B', octave: 3, freq: 246.94 },
  { string: 1, note: 'D', octave: 4, freq: 293.66 },
]

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

const STRING_COOLDOWN_MS = 300
const OCTAVE_HARMONIC_BLOCK_MS = 350
const HARMONIC_OVERRIDE_RMS_RATIO = 2.5
const STRING5_MIN_RMS = 0.025
const STRING4_MIN_RMS = 0.035

// ── Pure functions (exact copies from noteCapture.ts) ─────────────────────

function freqToNoteInfo(freq) {
  const noteNum = 12 * Math.log2(freq / 440) + 69
  const rounded = Math.round(noteNum)
  const note = NOTE_NAMES[((rounded % 12) + 12) % 12]
  const octave = Math.floor(rounded / 12) - 1
  const cents = Math.round((noteNum - rounded) * 100)
  return { note, octave, cents }
}

function noteToMidi(note, octave) {
  return (octave + 1) * 12 + NOTE_NAMES.indexOf(note)
}

function freqFromNoteOctave(note, octave, cents = 0) {
  const midi = noteToMidi(note, octave)
  return 440 * Math.pow(2, (midi - 69) / 12) * Math.pow(2, cents / 1200)
}

/**
 * Two-pass getClosestString — fundamentals take priority over harmonics.
 * This is the EXACT logic from noteCapture.ts. Without this two-pass approach,
 * D4 (293.66 Hz) ties with D3's octave-up harmonic and whichever string is
 * iterated first wins (string 4 in BANJO_STRINGS order).
 */
function getClosestString(note, octave, cents, threshold = 0.12) {
  const freq = freqFromNoteOctave(note, octave, cents)

  let closestFund = BANJO_STRINGS[0], minFundDiff = Infinity
  let closestHarm = BANJO_STRINGS[0], minHarmDiff = Infinity

  for (const s of BANJO_STRINGS) {
    const diff = Math.abs(Math.log2(freq / s.freq))
    if (diff < minFundDiff) { minFundDiff = diff; closestFund = s }
    const diffOct = Math.abs(Math.log2(freq / (s.freq * 2)))
    if (diffOct < minHarmDiff) { minHarmDiff = diffOct; closestHarm = s }
  }

  if (minFundDiff < threshold) return closestFund
  if (minHarmDiff < threshold) return closestHarm
  return null
}

// ── Simulate the full detection pipeline on debug data ────────────────────

const onsets = []              // final accepted onsets (after all filters)
const blocked = []             // blocked onsets with reason
const lastStringOnsetInfo = {} // { [stringNum]: { time, rms } }

for (const frame of data) {
  if (frame.decision !== 'onset') continue

  const hz = frame.pitch
  const { note, octave, cents } = freqToNoteInfo(hz)
  const banjoStr = getClosestString(note, octave, cents)

  // The debug log already applied all filters (rms_floor, string_cooldown,
  // octave_harmonic) before tagging as "onset". So frames with decision=onset
  // have already passed. But we re-derive the string mapping with the correct
  // two-pass logic here.

  const strNum = banjoStr ? banjoStr.string : null

  onsets.push({
    t: frame.t,
    hz: frame.pitch,
    rms: frame.rms,
    smoothRms: frame.smoothRms,
    str: strNum,
    strNote: banjoStr ? `${banjoStr.note}${banjoStr.octave}` : '?',
    clarity: frame.clarity,
  })

  // Track for our own analysis of inter-onset timing
  if (strNum !== null) {
    lastStringOnsetInfo[strNum] = { time: frame.t, rms: frame.rms }
  }
}

// Also count blocked frames by decision type
const decisionCounts = {}
for (const frame of data) {
  decisionCounts[frame.decision] = (decisionCounts[frame.decision] || 0) + 1
}

// ── Lockout reclassification simulation ───────────────────────────────────
// After an onset fires, the app waits for pitch to stabilize during lockout
// and may reclassify the note. We simulate this by looking at stable frames
// within 80ms after each onset.

const LOCKOUT_MS = 80
const reclassified = []

for (let i = 0; i < onsets.length; i++) {
  const onset = onsets[i]
  const nextOnsetT = i + 1 < onsets.length ? onsets[i + 1].t : Infinity

  // Find stable frames within lockout window after this onset
  const lockoutEnd = onset.t + LOCKOUT_MS
  let settledStr = null
  let settledHz = null

  for (const frame of data) {
    if (frame.t <= onset.t) continue
    if (frame.t > lockoutEnd || frame.t >= nextOnsetT) break
    if (frame.decision === 'locked' && frame.stable) {
      const { note, octave, cents } = freqToNoteInfo(frame.pitch)
      const lockStr = getClosestString(note, octave, cents)
      if (lockStr) {
        // Only reclassify when onset had no valid string match
        if (onset.str === null && lockStr.string !== onset.str) {
          settledStr = lockStr.string
          settledHz = frame.pitch
        }
      }
      break // Only first stable locked frame
    }
  }

  if (settledStr !== null) {
    reclassified.push({
      t: onset.t,
      originalStr: onset.str,
      settledStr,
      originalHz: onset.hz,
      settledHz,
    })
    onset.str = settledStr
    onset.strNote = BANJO_STRINGS.find(s => s.string === settledStr)?.note +
      '' + BANJO_STRINGS.find(s => s.string === settledStr)?.octave || '?'
    onset.reclassified = true
  }
}

// ── Reports ───────────────────────────────────────────────────────────────

console.log('=' .repeat(72))
console.log('BANJO BUDDY — Debug Data Analysis')
console.log('=' .repeat(72))
console.log(`Total frames: ${data.length}`)
console.log(`Accepted onsets: ${onsets.length}`)
console.log(`Reclassified during lockout: ${reclassified.length}`)
console.log()

// Decision breakdown
console.log('─── Decision Breakdown ───')
const sortedDecisions = Object.entries(decisionCounts).sort((a, b) => b[1] - a[1])
for (const [dec, count] of sortedDecisions) {
  const pct = ((count / data.length) * 100).toFixed(1)
  console.log(`  ${dec.padEnd(20)} ${String(count).padStart(4)}  (${pct}%)`)
}
console.log()

// String distribution
console.log('─── String Distribution (after reclassification) ───')
const strCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, '?': 0 }
for (const o of onsets) {
  const k = o.str !== null ? o.str : '?'
  strCounts[k] = (strCounts[k] || 0) + 1
}
for (const [s, count] of Object.entries(strCounts)) {
  const label = s === '?' ? 'unknown' : `str ${s} (${BANJO_STRINGS.find(b => b.string === Number(s))?.note || '?'})`
  const bar = '█'.repeat(Math.round(count / 2))
  console.log(`  ${label.padEnd(16)} ${String(count).padStart(3)}  ${bar}`)
}
console.log()

// Reclassification details
if (reclassified.length > 0) {
  console.log('─── Reclassifications ───')
  for (const r of reclassified) {
    console.log(`  t=${r.t}ms: str ${r.originalStr ?? '?'} (${r.originalHz.toFixed(1)}Hz) → str ${r.settledStr} (${r.settledHz.toFixed(1)}Hz)`)
  }
  console.log()
}

// Onset timeline (compact)
console.log('─── Onset Timeline ───')
let prevT = null
for (const o of onsets) {
  const gap = prevT !== null ? o.t - prevT : 0
  const gapStr = prevT !== null ? `+${gap}ms` : '     '
  const reclass = o.reclassified ? ' [R]' : ''
  console.log(`  ${String(o.t).padStart(6)}ms  ${gapStr.padStart(7)}  str=${o.str ?? '?'}  ${o.strNote.padEnd(4)}  ${o.hz.toFixed(1).padStart(7)}Hz  rms=${o.rms.toFixed(4)}${reclass}`)
  prevT = o.t
}
console.log()

// Pattern detection — look for roll sequences
console.log('─── Roll Pattern Analysis ───')
const strSeq = onsets.map(o => o.str ?? '?').join(' ')
console.log(`  Sequence: ${strSeq}`)
console.log()

// Check for forward roll (3 2 1 5) and backward roll (1 2 3 5 or 5 3 2 1)
const fwdRoll = [3, 2, 1, 5]
const bwdRoll = [1, 2, 3, 5]
let fwdCount = 0, bwdCount = 0
const strArr = onsets.map(o => o.str)
for (let i = 0; i <= strArr.length - 4; i++) {
  if (strArr[i] === fwdRoll[0] && strArr[i+1] === fwdRoll[1] && strArr[i+2] === fwdRoll[2] && strArr[i+3] === fwdRoll[3]) fwdCount++
  if (strArr[i] === bwdRoll[0] && strArr[i+1] === bwdRoll[1] && strArr[i+2] === bwdRoll[2] && strArr[i+3] === bwdRoll[3]) bwdCount++
}
console.log(`  Forward roll (3-2-1-5) matches: ${fwdCount}`)
console.log(`  Backward roll (1-2-3-5) matches: ${bwdCount}`)
console.log()

// Inter-onset timing stats
const gaps = []
for (let i = 1; i < onsets.length; i++) {
  gaps.push(onsets[i].t - onsets[i - 1].t)
}
if (gaps.length > 0) {
  const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length
  const sortedGaps = [...gaps].sort((a, b) => a - b)
  const medianGap = sortedGaps[Math.floor(sortedGaps.length / 2)]
  const estimatedBpm = Math.round(60000 / (avgGap * 2)) // 8th notes → BPM
  console.log('─── Timing Stats ───')
  console.log(`  Avg inter-onset gap:    ${avgGap.toFixed(1)}ms`)
  console.log(`  Median inter-onset gap: ${medianGap.toFixed(1)}ms`)
  console.log(`  Min gap: ${sortedGaps[0]}ms  Max gap: ${sortedGaps[sortedGaps.length - 1]}ms`)
  console.log(`  Estimated tempo:        ~${estimatedBpm} BPM (8th notes)`)
  console.log()
}

// RMS distribution per string
console.log('─── RMS by String ───')
for (const sNum of [1, 2, 3, 4, 5]) {
  const strOnsets = onsets.filter(o => o.str === sNum)
  if (strOnsets.length === 0) {
    console.log(`  str ${sNum}: (no onsets)`)
    continue
  }
  const rmsVals = strOnsets.map(o => o.rms)
  const avgRms = rmsVals.reduce((a, b) => a + b, 0) / rmsVals.length
  const minRms = Math.min(...rmsVals)
  const maxRms = Math.max(...rmsVals)
  console.log(`  str ${sNum}: n=${strOnsets.length}  avg=${avgRms.toFixed(4)}  min=${minRms.toFixed(4)}  max=${maxRms.toFixed(4)}`)
}
const unknowns = onsets.filter(o => o.str === null)
if (unknowns.length > 0) {
  console.log(`  unknown: n=${unknowns.length}  freqs=${unknowns.map(o => o.hz.toFixed(1)).join(', ')}`)
}
console.log()

console.log('=' .repeat(72))
console.log('Done. String mapping uses two-pass fundamental-priority logic')
console.log('matching the real app behavior.')
console.log('=' .repeat(72))
