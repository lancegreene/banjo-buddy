# Banjo Buddy

A progressive web app that helps 5-string banjo players learn Scruggs-style picking through real-time audio feedback, LLM-coach-driven goals, and progress tracking. (Mid-rewrite: Phase 0 of the coach overhaul is complete; Phase 1 will land assessment + goals.)

## Quick Reference

- **Stack**: React 18 + TypeScript + Vite, Zustand (state), Dexie v14/IndexedDB (persistence), Supabase (auth + sync), Tone.js (synth/metronome), pitchy (pitch detection), ONNX Runtime Web (digit/label classification)
- **Build**: `npm run dev` (dev server), `npm run build` (tsc + vite build)
- **Deploy**: `npm run deploy` (gh-pages)
- **No test suite** — verify changes with `npx tsc --noEmit` and `npx vite build`
- **ESM project**: `"type": "module"` in package.json. Use `.cjs` for any CommonJS scripts.
- **Offline-first**: Dexie is the source of truth; Supabase sync is optional backup.

## Architecture

```
src/
  engine/          14 pure-function modules — no React, no side effects
  hooks/           7 React hooks wrapping engines (useNoteCapture, useBanjoSynth, etc.)
  components/      28 feature directories (Practice, Library, Fretboard, CircleOfFifths, etc.)
  data/            Static data: roll patterns, lick library, songs, chords, scales, achievements
  store/           Zustand store (useStore.ts) — single source of truth for all app state
  db/              Dexie schema (db.ts), Supabase client (supabase.ts), sync engine (sync.ts)
  styles/          Design tokens (tokens.css)
  types/           Shared TypeScript types
  utils/           Small utilities (calibration)
  workers/         Web Worker for essentia.js rhythm analysis
scripts/           Python training pipeline (digit/label CNN → ONNX export)
public/models/     ONNX models: digit-classifier.onnx, label-classifier.onnx
```

### Key Data Flow

1. **Audio in**: `useNoteCapture` hook → pitchy pitch detection → `detectOnset()` → `CapturedNote[]`
2. **Roll detection**: `CapturedNote[]` → `RollDetector` (batch, 8-note) or `LiveRollFeedback` (streaming, per-note)
3. **Session logging**: `logSessionItem()` → Dexie tables → enqueue for Supabase sync
4. **Sync**: Dexie → sync queue → push to Supabase (every 30s + on reconnect) → pull remote changes

## Navigation & Routing

No React Router — single `<App>` switches on `currentPage` state from the store.

## Coach-Driven Architecture

After auth + API key setup, every user takes a one-time chat assessment that produces 5–7 personalized goals. The dashboard surfaces 1 "focus" goal + 1–2 "explore" goals; the rest live behind a "see all" view. A 7-day check-in chat updates goal states based on activity and conversation.

### Startup Gates (in order, post-Phase-0 placeholder)

Splash → AuthScreen (skippable → guest mode) → PlaceholderHome (Phase 1 will insert ApiKeyGate + AssessmentChat before this)

### Pages (post-Phase-0)

`splash`, `auth`, `placeholder-home`

Phase 1 adds: `api-key-gate`, `assessment`, `plan-dashboard`, `library`, `check-in`.

**Tool modals** (float over any page): Metronome, Tuner, FretLab

## Tab Scanning Pipeline (Fretboard Lab)

Image-to-tab conversion for importing printed/digital banjo tablature. Entry point: `FretboardLab.tsx` → image upload → crop → `TabOverlayEditor.tsx`.

### Pipeline Steps

1. **Staff line detection** (`tabImageOcr.ts:detectStaffLines`) — horizontal coverage scoring: for each row, measures what fraction of the image width is dark. Staff lines score 50%+ coverage (span full width), unlike notes (localized). Finds peaks, then selects best group of 5 evenly-spaced ones using pair-based gap extrapolation.
2. **Note position detection** (`tabImageOcr.ts:detectNotePositions`) — scans columns between staff lines for dark pixel clusters, applies size/concentration filters to separate notes from stems/beams.
3. **Local digit classification** (`digitClassifier.ts`) — ONNX Runtime Web loads `digit-classifier.onnx` (LeNet-5 variant, ~200KB). Crops 32x32 grayscale patches at each note position, classifies fret number (0-9). Includes 9→0 heuristic: circled zeros in real tabs misread as "9" — auto-correct when confidence < 97%.
4. **Local label classification** (`digitClassifier.ts`) — loads `label-classifier.onnx` for finger labels (T/I/M). Low accuracy on real images (~25% confidence) — trained on synthetic data only. Falls back to string-based defaults (lines 3-5→T, 2→I, 1→M).
5. **Vision API fallback** (`tabImageOcr.ts:callVisionModel`) — Claude claude-sonnet-4-6 reads annotated image with numbered arrows. "Read Tab (AI)" button does frets + labels in one call (~$0.005/scan). "Read Frets" button uses local model only (free).
6. **Overlay editor** (`TabOverlayEditor.tsx`) — interactive canvas overlay for reviewing/correcting detected notes, adjusting staff lines, setting frets/fingers/techniques/durations/groups.
7. **Training data collection** — corrected results saved to `tabTrainingPairs` (IndexedDB) for model retraining. Export as JSON with base64 images.

### Synthetic Data Generation

`syntheticTabGenerator.ts` renders thousands of tab images via Canvas with randomized fonts, sizes, noise, rotation, line weights. Generates both full images and 32x32 digit crops with ground truth. Circled zeros render "0" text inside circle to match real tab notation.

### Training Pipeline (`scripts/`)

```bash
python scripts/train_digit_model.py --data export.json --epochs 30 --output public/models/digit-classifier.onnx
```

LeNet-5 variant CNN (Conv→ReLU→Pool ×3 → FC). Trains on exported JSON from TabTrainingManager. Outputs ONNX for browser inference.

### Key Heuristics

- **9→0 correction**: `if (fret === 9 && confidence < 0.97) fret = 0` — circled open-string notation reads as "9"
- **Label crop position**: always at `lineYs[4] + lineGap * 0.8` (below bottom staff line), NOT relative to each note's line
- **Vision API JSON parsing**: extract from markdown code fences first, then non-greedy `{...}` fallback — the model sometimes repeats JSON with commentary

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
Paste into `recordedData.txt` for offline analysis with `node analyze.cjs`. Each frame includes: `t, pitch, clarity, rms, smoothRms, stable, jump, spike, decision`.

Decision types: `onset`, `locked`, `no_onset`, `unstable`, `string_cooldown`, `octave_harmonic`, `rms_floor_str5`, `rms_floor_str4`.

## Data Layer

### Static Data Files (src/data/)

| File | Key Exports | Purpose |
|------|-------------|---------|
| `rollPatterns.ts` | `ROLL_PATTERNS[]`, `ROLL_MAP`, `refreshRollMap()` | 8 built-in Scruggs rolls + custom patterns from DB |
| `lickLibrary.ts` | `LICK_LIBRARY[]`, `LICK_MAP` | Melodic lick references (Foggy Mountain, Cripple Creek, G/C/D licks) for DTW matching |
| `songLibrary.ts` | `SONGS[]`, `SONG_MAP`, `SECTION_MAP` | Full song arrangements with measures, chord changes, tab notes (string/fret/technique) |
| `chordDiagrams.ts` | `CHORD_DIAGRAMS[]`, `CHORD_MAP` | Chord shapes with fret positions |
| `scaleLibrary.ts` | `SCALE_LIBRARY[]`, `SCALE_CATEGORIES` | Major, pentatonic, blues, melodic minor scales |
| `fretboardNotes.ts` | `OPEN_STRINGS`, `getNoteAtFret()` | Banjo fretboard pitch reference |
| `achievements.ts` | `ACHIEVEMENTS[]` | Achievement unlock conditions (streaks, BPM records, skill counts) |
| `tourSteps.ts` | Tour step definitions | Guided tour sequence for onboarding |

### Database (Dexie v14 / IndexedDB)

9 tables (post-Phase-0). Phase 1 will bump to v15 and add 3 more (`goals`, `itemTags`, `checkInRecords`).

| Table | Purpose |
|-------|---------|
| `userProfiles` | User identity: role (solo/admin retained, teacher/student dormant), admin flag |
| `practiceSessions` | Session metadata (start/end timestamps) |
| `sessionItems` | Individual practice items: BPM, scores (rhythm/pitch/tempo/composite), recording ref |
| `noteAccuracyRecords` | Per-note evaluations indexed by `sessionItemId` |
| `recordings` | Audio blobs (local only, not synced) |
| `streakRecords` | One record per practice day for streak tracking |
| `achievements` | Earned achievement timestamps |
| `customRollPatterns` | Custom roll patterns |
| `tabTrainingPairs` | Tab image + corrected notes for digit model training |

### Sync Engine (src/db/sync.ts)

Offline-first with eventual consistency:

1. All writes go to Dexie first (instant, works offline)
2. Changes enqueue to `syncQueue` with table name + operation
3. `pushPendingChanges()` upserts/deletes to Supabase (camelCase ↔ snake_case mapping)
4. `pullRemoteChanges()` fetches records newer than last sync, merges into Dexie (remote wins if newer)
5. `startAutoSync()` runs full sync every 30s + on `window.online`
6. Blob fields (audio, video, images) excluded from sync — media stays local

## Auth & Multi-User System

### Authentication

Supabase email/password auth. Session auto-restored on app load. Users can skip auth for local-only mode (`banjo-buddy-auth-skipped` in localStorage).

### User Roles

Teacher mode was retired in Phase 0 of the coach overhaul. The `teacher` and `student` literals still exist on the `UserRole` type, but the supporting tables (`teacherConfigs`, `teacherClips`, `skillImageOverrides`) and UI are gone. Only `solo` and `admin` are meaningful today.

| Role | Access |
|------|--------|
| **solo** | Default guest or signed-in user, single profile |
| **admin** | `isAdmin` flag — admin panel access, database stats |
| **teacher** | Dormant — type literal preserved; no functionality |
| **student** | Dormant — type literal preserved; no functionality |

## Curriculum

Retired. The Deep Dive curriculum DAG (`SKILLS[]`), FSRS spaced repetition, skill records, pathway, skill-tree, achievements auto-tracking are gone (Phase 0 of the coach overhaul). Replaced by LLM-driven assessment + persistent goals (Phase 1+). See `docs/superpowers/specs/2026-05-27-coach-overhaul-design.md`.

## Library

Browse-only view of static catalogs. Previously the Quick Pick landing page; Quick Pick mode was retired in Phase 0. In Phase 2 the library will return as a secondary tab off the plan dashboard. The 7 categories are still in place:

- **Chord Charts** — 94 voicings across all 12 keys (major, minor, 7th) with BanjoChordDiagram component
- **Circle of 5ths** — Interactive SVG circle with key selection, diatonic chord display, I-IV-V highlighting with chord diagrams
- **Roll Repo** — Built-in + custom Scruggs roll patterns
- **Lick Library** — Classic bluegrass licks with key/type filters
- **Scales** — Major, pentatonic, blues, melodic minor with ASCII tab strip
- **Song Studio** — Full song arrangements (under construction)
- **Roll Generator** — Create custom roll patterns

Each item loads a FretboardDiagram tab viewer with play/stop + BPM controls. Conversion via `rollPatternToFretNotes()`, `lickToFretNotes()`, `sectionToFretNotes()` in `engine/rollToFretNotes.ts`.

## Key Engine Modules

| Module | Purpose |
|--------|---------|
| `noteCapture.ts` | Core pitch detection, onset detection, D3/D4 handling |
| `rollDetection.ts` | Batch roll matching (8+ notes vs all patterns) |
| `streamingRollMatcher.ts` | Per-note streaming roll evaluation with cursor |
| `streamingSongMatcher.ts` | Streaming matcher for full song sections |
| `dtwMatcher.ts` | Dynamic Time Warping for lick comparison |
| `banjoSynth.ts` | Karplus-Strong synthesis for demo playback |
| `tabParser.ts` | Parse ASCII tablature -> FretNote[] |
| `tabImageOcr.ts` | Staff line detection, note detection, Vision API integration |
| `digitClassifier.ts` | ONNX model loading + digit/label inference |
| `syntheticTabGenerator.ts` | Canvas-rendered synthetic tab images for training |
| `rollToFretNotes.ts` | Convert rolls/licks/song sections -> FretNote[] for fretboard display |
| `rollGenerator.ts` | Generate custom roll patterns |
| `rhythmAnalysis.ts` | Rhythm pattern analysis (uses Web Worker with essentia.js) |
| `recordingService.ts` | Audio recording utilities |

## Conventions

- Engine files are **pure functions** — no React imports, no side effects
- Components are in feature directories: `src/components/FeatureName/Component.tsx`
- Single CSS file: `src/App.css` — class names follow BEM-ish pattern (`component-element-modifier`)
- All DB records use `crypto.randomUUID()` for IDs and ISO timestamps
- Zustand store is the bridge between React UI and Dexie persistence
- File header comments use the `// ───` box style
- Supabase column mapping: camelCase (TS) ↔ snake_case (Postgres) via `toSnake()`/`toCamel()`
