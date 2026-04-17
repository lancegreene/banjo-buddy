# Lick Source QC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a collapsible "View source" panel to LickPlayer that shows the source page image with the lick's region highlighted, plus author bbox + source-page references for all 30 existing Wave 1 licks.

**Architecture:** Two new optional fields (`sourcePage`, `sourceBbox`) on `LickReference`. New `SourceView` subcomponent (image + absolutely-positioned bbox overlay). Toggle button + state lives in `LickPlayer`. Source page images bundled in `public/sources/`. Two phases: shell + smoke test, then bbox authoring across all 30 licks.

**Tech Stack:** Vite + React 18 + TypeScript. No test suite (per CLAUDE.md). Verification = `npx tsc -p tsconfig.app.json --noEmit` + `npx vite build` + manual browser smoke. Pre-existing type errors on main are out of scope.

**Spec:** `docs/superpowers/specs/2026-04-17-lick-source-qc-design.md`

---

## Important deviations from default skill workflow

1. **No unit tests.** Project has no test suite. Replace TDD pattern with: write code → `npx tsc -p tsconfig.app.json --noEmit` → `npx vite build` → manual smoke. The CLAUDE.md-documented `npx tsc --noEmit` (root) silently checks nothing — always use `-p tsconfig.app.json`.

2. **Worktree:** Not required. Direct work on a feature branch is fine. The previous lick-library work used `feat/lick-library-foundation`; this work should use a new branch `feat/lick-source-qc` off `main`.

3. **Pre-existing type errors:** Branch `main` carries ~33 known TS errors (BanjoAnatomy framer-motion, PracticeSession, fsrs, Library.tsx:212 ReactNode, etc.). These are NOT to be fixed. Bar: this work introduces zero NEW errors on its touched files.

4. **Commit hygiene:** Working tree on `main` has multiple pre-existing uncommitted modifications (CLAUDE.md, App.tsx, etc. from prior sessions). Use `git add` with explicit file paths only. Never `git add -A` or `git add .` — those will sweep in pre-existing changes.

5. **GitHub Pages base path:** App is deployed at `/banjo-buddy/`. All public asset references must use `${import.meta.env.BASE_URL}` to work both locally and in production. Verify in Phase 1 smoke test.

---

## File structure

### Created

```
public/sources/
  splitting-licks-p10.jpg       Copied from training_material/SplittingTheLicks_08.jpg
  splitting-licks-p11.jpg       Copied from training_material/SplittingTheLicks_09.jpg

src/components/LickPlayer/
  SourceView.tsx                Pure presentational: image + bbox overlay + label + image-error fallback
```

### Modified

```
src/data/lickLibrary.ts         Add sourcePage?, sourceBbox? to LickReference; populate on all 30 licks (Phase 2)
src/components/LickPlayer/LickPlayer.tsx   Toggle state + SourceView render
src/App.css                     Append .lick-source-* CSS rules
```

### Unchanged

```
src/components/Library/Library.tsx        Lick grid + filter UI unchanged
src/components/Fretboard/FretboardDiagram.tsx
src/components/LickPlayer/useTabPlayback.ts
src/data/curriculum.ts
public/                                    Other public assets unchanged
```

---

## Phase 1 — Schema, assets, UI shell, smoke test (1 commit)

### Task 1: Setup branch

**Files:** None (git only)

- [ ] **Step 1: Create and switch to feature branch**

Run:
```bash
cd D:/banjo-buddy
git checkout main
git status --short
```

Expected: many `M` lines for pre-existing uncommitted modifications. Note these — do NOT stage them.

```bash
git checkout -b feat/lick-source-qc
git branch --show-current
```

Expected output: `feat/lick-source-qc`

### Task 2: Add schema fields to LickReference

**Files:**
- Modify: `src/data/lickLibrary.ts:1-25` (the `LickReference` interface)

- [ ] **Step 1: Find the `LickReference` interface near the top of the file and add two optional fields**

Locate:
```ts
export interface LickReference {
  id: string
  name: string
  description: string
  key: string
  role: LickRole
  leadsTo?: string
  chord?: string
  measureCount: 1 | 2
  referenceBpm: number
  source?: string
  tab: TabNote[]
}
```

Replace with:
```ts
export interface LickReference {
  id: string
  name: string
  description: string
  key: string
  role: LickRole
  leadsTo?: string
  chord?: string
  measureCount: 1 | 2
  referenceBpm: number
  source?: string
  /** Filename in public/sources/ — e.g. 'splitting-licks-p10.jpg'. If absent, source view is hidden. */
  sourcePage?: string
  /** Normalized [0..1] coordinates of the lick's region on its source page. If absent, no highlight rectangle is drawn. */
  sourceBbox?: { x: number; y: number; width: number; height: number }
  tab: TabNote[]
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep lickLibrary`
Expected: no output (no errors on lickLibrary.ts).

### Task 3: Copy source images to `public/sources/`

**Files:**
- Create: `public/sources/splitting-licks-p10.jpg`
- Create: `public/sources/splitting-licks-p11.jpg`

- [ ] **Step 1: Create the directory**

Run: `mkdir -p public/sources`

- [ ] **Step 2: Copy both images with semantic names**

Run:
```bash
cp training_material/SplittingTheLicks_08.jpg public/sources/splitting-licks-p10.jpg
cp training_material/SplittingTheLicks_09.jpg public/sources/splitting-licks-p11.jpg
```

- [ ] **Step 3: Verify both images exist and are readable**

Run: `ls -la public/sources/`
Expected: both `splitting-licks-p10.jpg` and `splitting-licks-p11.jpg` present, each ~200-500 KB.

### Task 4: Create SourceView component

**Files:**
- Create: `src/components/LickPlayer/SourceView.tsx`

- [ ] **Step 1: Write the component**

Create `src/components/LickPlayer/SourceView.tsx` with this exact content:

```tsx
// ─────────────────────────────────────────────────────────────────────────────
// SourceView — Renders a source-page image with an optional bbox overlay.
// Pure presentational. Used by LickPlayer for QC of agent-transcribed licks.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'

export interface SourceBBox {
  x: number       // 0..1, fraction of image width
  y: number       // 0..1, fraction of image height
  width: number   // 0..1, fraction of image width
  height: number  // 0..1, fraction of image height
}

interface SourceViewProps {
  sourcePage: string       // filename, e.g. 'splitting-licks-p10.jpg'
  sourceBbox?: SourceBBox
  sourceLabel: string      // e.g. 'Splitting the Licks, p.10'
}

export function SourceView({ sourcePage, sourceBbox, sourceLabel }: SourceViewProps) {
  const [errored, setErrored] = useState(false)
  const src = `${import.meta.env.BASE_URL}sources/${sourcePage}`

  if (errored) {
    return (
      <div className="lick-source-error">
        Source image unavailable: <code>{sourcePage}</code>
      </div>
    )
  }

  return (
    <div className="lick-source-view">
      <a
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        className="lick-source-image-link"
        title="Open full image in new tab"
      >
        <div className="lick-source-image-wrap">
          <img
            src={src}
            alt={`Source: ${sourceLabel}`}
            className="lick-source-image"
            onError={() => setErrored(true)}
            loading="lazy"
          />
          {sourceBbox && (
            <div
              className="lick-source-bbox-overlay"
              style={{
                left: `${sourceBbox.x * 100}%`,
                top: `${sourceBbox.y * 100}%`,
                width: `${sourceBbox.width * 100}%`,
                height: `${sourceBbox.height * 100}%`,
              }}
              aria-hidden="true"
            />
          )}
        </div>
      </a>
      <div className="lick-source-label">Source: {sourceLabel}</div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -E "SourceView|LickPlayer"`
Expected: no output.

### Task 5: Wire SourceView into LickPlayer

**Files:**
- Modify: `src/components/LickPlayer/LickPlayer.tsx`

- [ ] **Step 1: Read the current file to locate the description block**

Run: `grep -n "lick-player-description\|lick.description" src/components/LickPlayer/LickPlayer.tsx`
Expected: a single hit near the bottom of the JSX returned by the component, where `{lick.description}` renders inside `<p className="lick-player-description">`.

- [ ] **Step 2: Add imports at the top of LickPlayer.tsx**

Find the existing imports:
```tsx
import { useMemo } from 'react'
import type { LickReference } from '../../data/lickLibrary'
import { FretboardDiagram } from '../Fretboard/FretboardDiagram'
import { sectionToFretNotes } from '../../engine/rollToFretNotes'
import { useTabPlayback } from './useTabPlayback'
```

Replace the `useMemo` import line and add the SourceView import:
```tsx
import { useMemo, useState } from 'react'
import type { LickReference } from '../../data/lickLibrary'
import { FretboardDiagram } from '../Fretboard/FretboardDiagram'
import { sectionToFretNotes } from '../../engine/rollToFretNotes'
import { useTabPlayback } from './useTabPlayback'
import { SourceView } from './SourceView'
```

- [ ] **Step 3: Add toggle state inside the `LickPlayer` function body**

Locate the line `const pb = useTabPlayback({ bpmDefault: lick.referenceBpm })` near the top of the function body. Immediately after it, add:

```tsx
  const [showSource, setShowSource] = useState(false)
```

- [ ] **Step 4: Add the toggle button + collapsible source panel below the description**

Find the description block at the bottom of the JSX:
```tsx
      {/* Description */}
      {lick.description && (
        <p className="lick-player-description">{lick.description}</p>
      )}
    </div>
  )
}
```

Replace with:
```tsx
      {/* Description */}
      {lick.description && (
        <p className="lick-player-description">{lick.description}</p>
      )}

      {/* Source view — collapsible QC panel, only shown when sourcePage is set */}
      {lick.sourcePage && (
        <div className="lick-source-section">
          <button
            type="button"
            className="lick-source-toggle"
            onClick={() => setShowSource(v => !v)}
            aria-expanded={showSource}
          >
            <span className="lick-source-toggle-icon">{showSource ? '▼' : '▶'}</span>
            <span className="lick-source-toggle-text">
              {showSource ? 'Hide source' : `View source${lick.source ? ` (${lick.source})` : ''}`}
            </span>
            <span className="lick-source-toggle-text-mobile">📖 Source</span>
          </button>
          {showSource && (
            <SourceView
              key={lick.id}
              sourcePage={lick.sourcePage}
              sourceBbox={lick.sourceBbox}
              sourceLabel={lick.source || lick.sourcePage}
            />
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Reset toggle when lick changes**

The `key={lick.id}` on `<SourceView>` only resets the SourceView's internal state. Reset the parent's `showSource` too — change the `useState(false)` declaration to use `lick.id` as a dependency by replacing it with a `useEffect`-driven reset. Find:

```tsx
  const [showSource, setShowSource] = useState(false)
```

Replace with:
```tsx
  const [showSource, setShowSource] = useState(false)
  // Reset source toggle when the lick changes
  useMemo(() => { setShowSource(false); return null }, [lick.id])
```

(`useMemo` with a side-effect side-by-side with state init is unusual but acceptable for this single-purpose reset; an alternative is `useEffect`. Pick `useMemo` — it runs synchronously during render before children mount, avoiding a flash of the previous lick's expanded state.)

- [ ] **Step 6: Typecheck**

Run: `npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep LickPlayer`
Expected: no output.

### Task 6: Add CSS for source view

**Files:**
- Modify: `src/App.css` (append at end of file)

- [ ] **Step 1: Append the source-view styles to App.css**

Append to the very end of `src/App.css`:

```css
/* ─── LickPlayer source view (QC panel) ──────────────────────────────────── */

.lick-source-section {
  border-top: 1px solid rgba(245, 166, 35, 0.1);
  padding-top: 12px;
  margin-top: 8px;
}

.lick-source-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: transparent;
  color: var(--text-secondary, #a89583);
  border: 1px solid rgba(245, 166, 35, 0.2);
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.1s ease, color 0.1s ease;
}

.lick-source-toggle:hover {
  background: rgba(245, 166, 35, 0.08);
  color: var(--text-primary, #f5e6d3);
}

.lick-source-toggle-icon {
  font-size: 10px;
  width: 12px;
  text-align: center;
}

.lick-source-toggle-text-mobile {
  display: none;
}

@media (max-width: 480px) {
  .lick-source-toggle-text {
    display: none;
  }
  .lick-source-toggle-text-mobile {
    display: inline;
  }
}

.lick-source-view {
  margin-top: 12px;
}

.lick-source-image-link {
  display: block;
  text-decoration: none;
  color: inherit;
}

.lick-source-image-wrap {
  position: relative;
  display: block;
  width: 100%;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  overflow: hidden;
}

.lick-source-image {
  display: block;
  width: 100%;
  height: auto;
}

.lick-source-bbox-overlay {
  position: absolute;
  outline: 2px solid var(--accent, #f5a623);
  outline-offset: -1px;
  border-radius: 4px;
  background: rgba(245, 166, 35, 0.08);
  pointer-events: none;
  box-shadow: 0 0 0 1000px rgba(0, 0, 0, 0.25);
  /* The huge box-shadow dims the rest of the page; the cutout effect is implicit
     because outline + offset draws ON the bbox region, leaving it bright. */
}

.lick-source-label {
  margin-top: 6px;
  font-size: 12px;
  color: var(--text-secondary, #a89583);
  text-align: center;
}

.lick-source-error {
  padding: 12px;
  background: rgba(231, 76, 60, 0.08);
  border: 1px solid rgba(231, 76, 60, 0.25);
  border-radius: 6px;
  color: var(--text-secondary, #a89583);
  font-size: 13px;
}

.lick-source-error code {
  font-family: var(--font-mono, monospace);
  color: var(--text-primary, #f5e6d3);
}
```

- [ ] **Step 2: Verify build picks up the CSS**

Run: `npx vite build 2>&1 | tail -5`
Expected: `✓ built in N.NNs` with `dist/sources/splitting-licks-p10.jpg` and `splitting-licks-p11.jpg` listed in the asset table.

### Task 7: Smoke test Phase 1 with one hardcoded lick

**Files:**
- Modify: `src/data/lickLibrary.ts` (add sourcePage + sourceBbox to ONE lick temporarily)

- [ ] **Step 1: Find `g_lick_basic` in lickLibrary.ts and add a temporary sourcePage + sourceBbox**

Locate:
```ts
  {
    id: 'g_lick_basic',
    name: 'G-Lick — Basic (the "Godfather")',
    description: 'The classic Scruggs-style phrase-ending lick in G. Pull-off from 3rd to open on string 2, resolve to open G.',
    key: 'G', role: 'ending', chord: 'G',
    measureCount: 1, referenceBpm: 80,
    source: 'Splitting the Licks, p.10',
    tab: [
```

Insert two new fields between `source:` and `tab:`:
```ts
    source: 'Splitting the Licks, p.10',
    sourcePage: 'splitting-licks-p10.jpg',
    sourceBbox: { x: 0.05, y: 0.10, width: 0.20, height: 0.10 },
    tab: [
```

(These bbox values are placeholders — they put the rectangle in the top-left region of the page. Phase 2 replaces them with the real bbox.)

- [ ] **Step 2: Run dev server and smoke test**

Run: `npm run dev` (background)

In the browser:
1. Navigate to Library → Lick Library.
2. Find and click "G-Lick — Basic (the 'Godfather')".
3. The LickPlayer expands. Below the description, a `[ ▶ View source (Splitting the Licks, p.10) ]` button appears.
4. Click it. The page image renders. An amber outline rectangle appears in the top-left region (where the placeholder bbox points).
5. Toggle "▼ Hide source" — image collapses, button text returns to "View source (...)".
6. Click another lick (no `sourcePage` yet). Confirm NO source toggle button appears.
7. Click `g_lick_basic` again. Source view should be COLLAPSED by default (state reset on lick change).
8. Resize browser to ~400px width. Toggle text should switch to "📖 Source".
9. Open browser devtools → Network tab → reload. Confirm `splitting-licks-p10.jpg` loads from `/sources/` (or `/banjo-buddy/sources/` if base path is set).
10. Browser console: no errors.

If any step fails, fix before moving on. Common issues:
- Image 404: check `import.meta.env.BASE_URL` is being used in `SourceView.tsx`.
- Bbox not visible: check CSS `.lick-source-bbox-overlay` is loading; check the bbox is inside the image bounds (placeholder values are 5-25% horizontally, 10-20% vertically — should be visible).
- Toggle doesn't reset on lick change: check the `useMemo` reset hook in `LickPlayer.tsx`.

- [ ] **Step 3: Stop dev server, REMOVE the temporary sourceBbox**

Stop the dev server (kill the `npm run dev` background process).

Edit `g_lick_basic` and remove ONLY the `sourceBbox` line, keeping `sourcePage`:

```ts
    source: 'Splitting the Licks, p.10',
    sourcePage: 'splitting-licks-p10.jpg',
    tab: [
```

(Keep `sourcePage` so the source toggle still works after Phase 1 commit. Phase 2 will add real bboxes for all 30 licks.)

- [ ] **Step 4: Verify the placeholder bbox is gone**

Run: `grep -n "sourceBbox" src/data/lickLibrary.ts`
Expected: no output.

### Task 8: Commit Phase 1

- [ ] **Step 1: Confirm only intended files are staged**

Run: `git status --short`
Expected:
- `M src/components/LickPlayer/LickPlayer.tsx`
- `M src/data/lickLibrary.ts`
- `M src/App.css`
- `?? src/components/LickPlayer/SourceView.tsx`
- `?? public/sources/splitting-licks-p10.jpg`
- `?? public/sources/splitting-licks-p11.jpg`
- Plus many pre-existing `M` lines for unrelated files. Do NOT stage those.

- [ ] **Step 2: Stage exactly the Phase 1 files**

Run:
```bash
git add src/components/LickPlayer/LickPlayer.tsx \
        src/components/LickPlayer/SourceView.tsx \
        src/data/lickLibrary.ts \
        src/App.css \
        public/sources/splitting-licks-p10.jpg \
        public/sources/splitting-licks-p11.jpg
```

- [ ] **Step 3: Verify staged diff is clean**

Run: `git diff --cached --stat`
Expected: exactly 6 files. No extras. If any extras appear, run `git restore --staged <file>` for those.

- [ ] **Step 4: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(licks): add collapsible source-page QC view to LickPlayer

- Schema: sourcePage and sourceBbox optional fields on LickReference
- New SourceView component: image + absolutely-positioned bbox overlay,
  with image-error fallback and click-to-open in new tab
- LickPlayer: collapsible "View source" toggle (closed by default,
  resets on lick change). Hidden when sourcePage is undefined.
- CSS: .lick-source-* rules with mobile-friendly compact toggle
- Public assets: splitting-licks-p10.jpg + p11.jpg copied from
  training_material with semantic filenames (~600 KB total)
- Phase 1 of 2 — Phase 2 adds bboxes to all 30 existing licks

Spec: docs/superpowers/specs/2026-04-17-lick-source-qc-design.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 5: Confirm commit landed**

Run: `git log -1 --oneline`
Expected: a commit beginning with `feat(licks): add collapsible source-page QC view`.

---

## Phase 2 — Author bboxes for all 30 licks (1 commit)

### Task 9: Author bboxes by reading both source pages

**Files:**
- Modify: `src/data/lickLibrary.ts` (add sourcePage + sourceBbox to all 30 licks)
- Read: `D:/banjo-buddy/training_material/SplittingTheLicks_08.jpg` (book p.10)
- Read: `D:/banjo-buddy/training_material/SplittingTheLicks_09.jpg` (book p.11)

This task is image-reading work. **Recommend dispatching a fresh subagent** with the Read tool capability for image files (general-purpose subagent works). Below is the full prompt to use.

- [ ] **Step 1: Dispatch the bbox-authoring subagent**

Use the `Agent` tool with `subagent_type: "general-purpose"`, model `sonnet`. Prompt:

````
You are a bbox-authoring subagent for the Banjo Buddy lick library QC feature.

## Task

Read two source page images and produce normalized bounding boxes (0..1 coordinates)
for each of 30 licks, identifying the rectangle that visually contains each lick's
tab grid cell on its source page. Then update src/data/lickLibrary.ts to add
sourcePage + sourceBbox fields on each lick.

## Source images

- D:/banjo-buddy/training_material/SplittingTheLicks_08.jpg  ← book page 10
- D:/banjo-buddy/training_material/SplittingTheLicks_09.jpg  ← book page 11

Read both with the Read tool — they are JPG files, supported.

## What's on each page

**Page 10 (SplittingTheLicks_08.jpg):**
- Top-left section: G CHORD LICKS (grid of ~6-10 G licks)
- Below G grid: "Leads to C chord" row of 3 G→C transition licks
- Top-middle: C CHORD LICKS (grid of ~6 C licks)
- Top-right: D CHORD LICKS (grid begins, continues to p.11)
- Right edge: "Combination licks (two measures)" column with 2-measure G phrases
- Bottom: C CHORD ENDING LICKS section, possibly more

**Page 11 (SplittingTheLicks_09.jpg):**
- Top: D CHORD LICKS continuation (most D licks live here)
- Middle: "Combined licks (two measures)" / fill-in licks for D
- Bottom: D CHORD ENDING LICKS section (with note "These licks are all played
  for a D chord, and will (generally) be followed by a G chord")

## Lick mapping (which lick is on which page)

All 30 licks live in src/data/lickLibrary.ts. Read that file to see each lick's
id, name, description, key, and role. Use those + the existing `source` field
(e.g. 'Splitting the Licks, p.10') to determine which page each lick belongs to.

The 9 ORIGINAL chord licks (g_lick_basic, g_lick_tag, g_lick_forward_roll,
c_lick_basic, c_lick_hammer, c_lick_fill, d_lick_basic, d_lick_pull_off,
d_lick_transition) source field says 'Splitting the Licks, p.10' or 'p.11' —
use that. The 21 NEW Wave 1 licks all have explicit source fields citing p.10 or p.11.

## Bbox format

Each bbox is a normalized 0..1 rectangle:
- `x`: left edge as fraction of image width (0.0 = leftmost, 1.0 = rightmost)
- `y`: top edge as fraction of image height (0.0 = top, 1.0 = bottom)
- `width`: width as fraction of image width
- `height`: height as fraction of image height

A lick that occupies a small grid cell at top-left might be:
{ x: 0.05, y: 0.08, width: 0.18, height: 0.07 }

A combination lick (2 measures, wider) might be:
{ x: 0.50, y: 0.30, width: 0.45, height: 0.10 }

## Authoring guidance

- **Slightly oversize the boxes.** A box that's 5-10% larger than the strict cell
  boundary still reads as "this lick is here" and is robust to small mis-readings.
- **Cluster naming helps.** Note that licks 1-5 of the new G grid likely cluster
  in the top-left rows of p.10. C basic licks cluster in the middle column. D
  licks cluster on p.11.
- **You don't need to be pixel-perfect.** Be in the right region. The user will
  visually verify after deployment and report mismatches.

## What to update in lickLibrary.ts

For EACH of the 30 licks, add two fields between the existing `source:` and `tab:`
fields:

  source: 'Splitting the Licks, p.10',
  sourcePage: 'splitting-licks-p10.jpg',  // or splitting-licks-p11.jpg
  sourceBbox: { x: 0.XX, y: 0.XX, width: 0.XX, height: 0.XX },
  tab: [

Use Edit tool calls — one per lick, OR a single replace_all if you're confident.

The `g_lick_basic` lick already has `sourcePage: 'splitting-licks-p10.jpg'` from
Phase 1 — add the `sourceBbox` line next to it (do not duplicate sourcePage).

## Verification before reporting DONE

1. Run: `grep -c "sourceBbox:" src/data/lickLibrary.ts`
   Expected: 30
2. Run: `grep -c "sourcePage:" src/data/lickLibrary.ts`
   Expected: 30
3. Run: `npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep lickLibrary`
   Expected: no output
4. Run: `npx vite build 2>&1 | tail -3`
   Expected: build succeeds

## Status reporting

End with **DONE** / **DONE_WITH_CONCERNS** / **NEEDS_CONTEXT** / **BLOCKED**.

Include in your report:
- Brief notes on bbox confidence per lick group (e.g. "G basics on p.10 high
  confidence — top-left cluster very clear; D fill on p.11 medium — page edge
  cuts off slightly")
- Any licks you were uncertain about (so the user can prioritize verification)
- The output of the verification grep counts

## Do NOT

- Modify any files besides src/data/lickLibrary.ts
- Touch the existing tab arrays, ids, names, descriptions, or other fields
- Sweep in unrelated changes
- Commit (the controller will commit after review)
````

- [ ] **Step 2: Review the subagent output**

Read the subagent's report. Spot-check 2-3 bboxes by:
- Open `D:/banjo-buddy/training_material/SplittingTheLicks_08.jpg` in any image viewer
- Note the dimensions (W x H pixels)
- For a sample lick, multiply bbox.x * W and bbox.y * H to get pixel coordinates
- Sanity-check that those coordinates land inside or near the lick's visual cell

If 2-3 spot-checks pass, proceed. If they fail, dispatch the subagent again with corrections.

- [ ] **Step 3: Run verification gates**

Run:
```bash
grep -c "sourceBbox:" src/data/lickLibrary.ts
grep -c "sourcePage:" src/data/lickLibrary.ts
npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep lickLibrary
npx vite build 2>&1 | tail -3
```

Expected: 30, 30, no output, build succeeds.

### Task 10: Smoke test Phase 2

- [ ] **Step 1: Run dev server**

Run: `npm run dev`

- [ ] **Step 2: Click through licks and verify highlights**

For each role chip in the Library's lick filter, open at least one lick in that role and verify:
- "View source" toggle appears
- Click expands to show the page image
- Amber rectangle is in the right region (matches the visible tab grid cell on the page)
- Click the image — opens the full-resolution image in a new tab

Note any mismatches. They are NOT blockers — record them as a follow-up list. The user will fix specific bboxes via direct edits later.

- [ ] **Step 3: Stop dev server**

Kill the `npm run dev` background process.

### Task 11: Commit Phase 2

- [ ] **Step 1: Stage only lickLibrary.ts**

Run: `git add src/data/lickLibrary.ts`

- [ ] **Step 2: Verify diff is clean**

Run: `git diff --cached --stat`
Expected: only `src/data/lickLibrary.ts` modified.

- [ ] **Step 3: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(licks): author source-page bboxes for all 30 Wave 1 licks

Each lick now has sourcePage + sourceBbox fields pointing to its
location in Splitting the Licks p.10 or p.11. Bboxes are normalized
0..1 coordinates, slightly oversized for robustness against
small reading errors.

Phase 2 of 2 — Phase 1 added the schema + UI shell.
Spec: docs/superpowers/specs/2026-04-17-lick-source-qc-design.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Final verification

### Task 12: End-to-end verification sweep

- [ ] **Step 1: Typecheck (no new errors on touched files)**

Run: `npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -E "(lickLibrary|LickPlayer|SourceView)"`
Expected: no output.

- [ ] **Step 2: Build**

Run: `npx vite build 2>&1 | tail -10`
Expected: build succeeds; `dist/sources/splitting-licks-p10.jpg` and `dist/sources/splitting-licks-p11.jpg` listed in the asset table.

- [ ] **Step 3: Confirm 30 licks have both fields**

Run:
```bash
grep -c "sourceBbox:" src/data/lickLibrary.ts
grep -c "sourcePage:" src/data/lickLibrary.ts
```
Expected: both output `30`.

- [ ] **Step 4: Final manual smoke test (full flow)**

Run: `npm run dev`
- Library → Lick Library
- Click each role filter (Basic, Fill, Ending, Transition, Combination)
- For at least one lick in each role: open it, click "View source", confirm highlight is in the expected region
- Toggle "Hide source" — collapses cleanly
- Switch licks without expanding source — confirm no leftover state
- Mobile width (~400px): toggle text shows "📖 Source"
- Click the source image — opens full image in new tab

- [ ] **Step 5: Commit list summary**

Run: `git log --oneline main..HEAD`
Expected: 2 commits:
- `feat(licks): author source-page bboxes for all 30 Wave 1 licks`
- `feat(licks): add collapsible source-page QC view to LickPlayer`

---

## Self-review checklist results

**Spec coverage:**
- §1 Data model → Task 2 ✓
- §2 Asset hosting → Task 3 ✓
- §3 UI: collapsible source view → Tasks 4, 5, 6 ✓
- §4 Bbox authoring → Task 9 ✓
- §5 Implementation order & verification → Tasks 7, 8, 10, 11, 12 ✓

**Placeholder scan:** no TBD / TODO / "implement later" / "write tests for the above". The bbox numbers in Phase 1's smoke test (`{ x: 0.05, y: 0.10, width: 0.20, height: 0.10 }`) are explicit placeholder values used intentionally for visual verification, removed in Task 7 Step 3 before commit.

**Type consistency:** `SourceBBox` in SourceView.tsx vs `sourceBbox?: { x; y; width; height }` in LickReference — same shape. `SourceView` props use `sourcePage` (string) + `sourceBbox?` (SourceBBox) + `sourceLabel` (string), consistent with how LickPlayer passes them in Task 5 Step 4.

**Known quirks documented:**
- Pre-existing TS errors not in scope (header).
- `tsc --noEmit` at root is broken — must use `-p tsconfig.app.json` (header).
- Working tree has pre-existing uncommitted changes — must use explicit file paths in `git add` (header + Task 8).
- `import.meta.env.BASE_URL` required for GitHub Pages base path (header + Task 4 + Task 7 smoke).
