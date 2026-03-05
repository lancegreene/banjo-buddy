# Banjo Buddy

A web app that helps 5-string banjo players learn Scruggs-style picking through real-time audio feedback, curriculum-guided practice sessions, and progress tracking.

## Quick Reference

- **Stack**: React 18 + TypeScript + Vite, Zustand (state), Dexie/IndexedDB (persistence), Tone.js (metronome), pitchy (pitch detection)
- **Build**: `npm run dev` (dev server), `npm run build` (tsc + vite build)
- **Deploy**: `npm run deploy` (gh-pages)
- **No test suite** — verify changes with `npx tsc --noEmit` and `npx vite build`
- **ESM project**: `"type": "module"` in package.json. Use `.cjs` for any CommonJS scripts.

## Architecture

```
src/
  engine/          Pure functions — no React. Pitch detection, roll matching, recommendations.
  hooks/           React hooks wrapping engines (useNoteCapture, useAudioRecorder)
  components/      UI components organized by feature
  data/            Static data: curriculum skills, roll patterns, lick library, chord diagrams
  store/           Zustand store (useStore.ts) — app state + Dexie persistence bridge
  db/              Dexie schema, helpers (db.ts)
  utils/           Small utilities (calibration)
```

### Key Data Flow

1. **Audio in**: `useNoteCapture` hook → pitchy pitch detection → `detectOnset()` → `CapturedNote[]`
2. **Roll detection**: `CapturedNote[]` → `RollDetector` (batch, 8-note) or `LiveRollFeedback` (streaming, per-note)
3. **Session logging**: `PracticeSession` → `useStore.logSessionItem()` → Dexie tables
4. **Recommendations**: `buildSessionPlan()` reads skill records + recent session items → prioritized practice plan

## Note Detection Engine (Critical Path)

The most complex and tuning-sensitive code. Lives in `src/engine/noteCapture.ts` (pure functions) and `src/hooks/useNoteCapture.ts` (RAF loop + state).

### How Onset Detection Works

Each `requestAnimationFrame` (~16ms):
1. pitchy reads pitch + clarity from 1024-sample FFT window
2. RMS computed from raw audio buffer
3. Smooth RMS updated (EMA, 0.70/0.30 decay)
4. **Stability check**: pitch must agree with previous frame within 30 cents (bypassed for large pitch jumps or RMS spikes)
5. **`detectOnset()`**: two methods — pitch change (≥80 cents) OR RMS spike (≥1.25× smooth)
6. **Guards** (in order): global lockout → per-string RMS floor → same-string cooldown → octave harmonic block (with RMS override)
7. **Lockout reclassification**: after onset fires, pitch may settle to a different string during the 80ms lockout — reclassify the note

### Banjo String Frequencies (Open G Tuning)

| String | Note | Freq (Hz) | Finger |
|--------|------|-----------|--------|
| 5 | G4 | 392.0 | Thumb (short drone) |
| 4 | D3 | 146.83 | Thumb |
| 3 | G3 | 196.0 | Thumb |
| 2 | B3 | 246.94 | Index |
| 1 | D4 | 293.66 | Middle |

### The D3/D4 Octave Problem

**String 1 (D4, 293.66 Hz) and string 4 (D3, 146.83 Hz) are exactly one octave apart.** This is the hardest detection challenge:

- When D3 (string 4) is plucked, its octave harmonic rings at exactly 293.66 Hz — indistinguishable from a D4 pluck by frequency alone
- When D4 (string 1) is plucked, pitchy sometimes reads the initial transient at half-frequency (~147 Hz), looking like D3
- `getClosestString()` uses a two-pass approach: fundamentals take priority over harmonic matches, so 294 Hz → string 1 (correct)
- The **octave harmonic block** prevents D3's lingering harmonic from triggering a false string-1 onset
- The **RMS override** (`HARMONIC_OVERRIDE_RMS_RATIO = 2.5`) lets real D4 plucks through — a fresh pluck has much higher RMS than a decaying harmonic

**When tuning detection constants, always test with a forward roll** (3→2→1→5) — it exercises the D3/D4 boundary on every cycle.

### Detection Constants (useNoteCapture.ts)

| Constant | Value | Purpose |
|----------|-------|---------|
| `STRING_COOLDOWN_MS` | 300 | Same-string re-trigger block |
| `OCTAVE_HARMONIC_BLOCK_MS` | 350 | Cross-string harmonic block window |
| `HARMONIC_OVERRIDE_RMS_RATIO` | 2.5 | RMS ratio to override harmonic block (real pluck vs lingering harmonic) |
| `STRING5_MIN_RMS` | 0.025 | Floor for string 5 — filters ghost onsets from sympathetic resonance |
| `STRING4_MIN_RMS` | 0.035 | Floor for string 4 — filters D4-misreads at half-frequency |

### Debug Mode

Set `localStorage.setItem('banjo-debug', 'true')` in browser console, then listen. After playing, run:
```js
copy(JSON.stringify(window.__banjoDebug()))
```
Paste into `recordedData.txt` for offline analysis. Each frame includes: `t, pitch, clarity, rms, smoothRms, stable, jump, spike, decision`.

Decision types: `onset`, `locked`, `no_onset`, `unstable`, `string_cooldown`, `octave_harmonic`, `rms_floor_str5`, `rms_floor_str4`.

## Roll Patterns

Defined in `src/data/rollPatterns.ts`. All are 8-note sequences referencing string numbers 1-5.

- **Forward Roll**: `3-2-1-5-3-1-5-1` (the benchmark pattern for testing detection)
- Two detection modes:
  - `RollDetector` — batch: waits for 8 notes, scores against all patterns
  - `LiveRollFeedback` — streaming: per-note evaluation against a known pattern, with cursor + hit/miss UI

## Curriculum & Recommendations

- Skills defined in `src/data/curriculum.ts` with prerequisites forming a DAG
- Paths: `newby`, `beginner`, `intermediate`
- Status progression: `locked → unlocked → active → progressed → mastered`
- `buildSessionPlan()` factors in: BPM gap, recency, practice count, and **accuracy score** from recent session items
- Low accuracy (<70%) triggers: higher priority, lower suggested BPM, accuracy-aware reason text

## Database (Dexie v2)

Tables: `userProfiles`, `skillRecords`, `practiceSessions`, `sessionItems`, `recordings`, `streakRecords`, `noteAccuracyRecords`.

`noteAccuracyRecords` stores per-note evaluations from `LiveRollFeedback` with compound index `[skillId+patternId+position]` for weak-spot queries.

## Conventions

- Engine files are **pure functions** — no React imports, no side effects
- Components are in feature directories: `src/components/FeatureName/Component.tsx`
- Single CSS file: `src/App.css` — class names follow BEM-ish pattern (`component-element-modifier`)
- All DB records use `crypto.randomUUID()` for IDs and ISO timestamps
- Zustand store is the bridge between React UI and Dexie persistence
- File header comments use the `// ───` box style
