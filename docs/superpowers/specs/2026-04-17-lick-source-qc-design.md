# Banjo Buddy — Lick Source QC

**Date:** 2026-04-17
**Status:** Design — awaiting user review
**Builds on:** `2026-04-16-lick-library-foundation-design.md`

## Problem

Wave 1 of the lick library shipped 21 net-new licks transcribed by the `banjo-theory` subagent from photographs of *Splitting the Licks* (Janet Davis). Several licks had ambiguous beats that the agent resolved with music-theory inference. The user has no efficient way to verify those transcriptions against the source — they must manually open the book, find the right page, find the right cell in the lick grid, and compare against the rendered tab in the app.

This blocks two things:
1. **Trusting the existing 30 licks.** Without quick visual QC, errors persist undetected.
2. **Scaling the ingestion pipeline.** The user wants to scan more tabs into the system. Trust in the AI-driven transcription is a prerequisite, and trust requires fast verification.

## Goals

- Surface the source page image (with the specific lick highlighted) inside the LickPlayer detail view.
- Make QC a one-click action — toggle a "View source" panel rather than navigate elsewhere.
- Author bounding boxes for the 30 existing Wave 1 licks so each highlight lands on the correct grid cell.
- Establish a schema and pattern that scales to future licks and source books without further design work.

## Non-goals

- Build a full tab-import pipeline (separate, larger spec).
- Build an in-app bounding-box editor (deferred — see [`project_future_features.md`](../../../../../../Users/Lance.Greene/.claude/projects/D--banjo-buddy/memory/project_future_features.md) for the planned admin editor).
- Source-image preprocessing (rotate, crop, dewarp).
- Image zoom/pan controls inside the source panel — clicking the image opens it in a new tab for closer inspection.
- "Next/previous lick on this page" navigation inside the source view.
- Scoring transcription accuracy automatically.
- Adding source images for books we haven't authored licks from yet (Scruggs vols 1 & 2).

## Approach

Tactical QC view layered onto the existing `LickPlayer` component. Two optional schema fields (`sourcePage`, `sourceBbox`) on each lick. A new collapsible `SourceView` subcomponent renders the source page image with an absolutely-positioned bbox overlay. Source page images live in `public/sources/` so they ship with the PWA build. Bboxes are agent-authored once, user-verified visually after deployment.

This avoids three over-engineered alternatives: bundling all training material (~20 MB), per-lick cropped image assets, and a click-drag bbox editor.

---

## Section 1 — Schema additions

Add two optional fields to `LickReference` in `src/data/lickLibrary.ts`:

```ts
export interface LickReference {
  // ... existing fields
  sourcePage?: string         // image filename in public/sources/, e.g. 'splitting-licks-p10.jpg'
  sourceBbox?: {              // normalized [0..1] coordinates of the lick on its page
    x: number                 // left edge, fraction of image width
    y: number                 // top edge, fraction of image height
    width: number             // fraction of image width
    height: number            // fraction of image height
  }
}
```

**Decisions:**

- **Both optional.** A lick without `sourcePage` simply doesn't render the QC view (the toggle button hides). A lick with `sourcePage` but no `sourceBbox` shows the page without a highlight rectangle. Graceful degradation.
- **Normalized 0..1 coordinates** (not pixels). If we ever re-export a source page at a different resolution, the bbox stays correct without recomputation. Trivial conversion at render time: `rect.x = bbox.x * imageNaturalWidth`.
- **Semantic filenames** (e.g. `splitting-licks-p10.jpg`, not `SplittingTheLicks_08.jpg`). The training-material filenames have no relationship to book page numbers; renaming on copy makes the asset reference self-documenting.
- **No new tables, no Dexie changes.** Static data only.

---

## Section 2 — Asset hosting

Add `public/sources/` directory containing only the page images referenced by current licks:

```
public/sources/
  splitting-licks-p10.jpg     (~300 KB) — referenced by ~19 licks
  splitting-licks-p11.jpg     (~300 KB) — referenced by ~11 licks
```

**Source mapping (one-time, this implementation):**

- `training_material/SplittingTheLicks_08.jpg` → `public/sources/splitting-licks-p10.jpg`
- `training_material/SplittingTheLicks_09.jpg` → `public/sources/splitting-licks-p11.jpg`

**Lick `sourcePage` field uses just the filename** — e.g. `splitting-licks-p10.jpg`. Components prepend `${import.meta.env.BASE_URL}sources/` to build the runtime URL. This works at the GitHub Pages base path (`/banjo-buddy/sources/...`) and locally (`/sources/...`).

**No registry / catalog file.** The lick's `sourcePage` field IS the link. If a file is missing, the `<img>` 404s and the source view shows an inline "Source image unavailable" message.

**Future pages** drop in via the same pattern: someone copies `EarlScruggs_15.jpg` → `public/sources/scruggs-vol1-p15.jpg`, then references it from new licks via `sourcePage: 'scruggs-vol1-p15.jpg'`.

**Build size impact for current Wave 1:** ~600 KB added to `dist/sources/`. Negligible.

---

## Section 3 — UI: collapsible source view

**Layout in `LickPlayer.tsx` below the description block:**

```
[Lick name + meta]
[Tab strip + cursor]
[Controls: Play, Loop, Count-in, Synth, Click, BPM]
[Description]

[ ▶ View source (Splitting the Licks, p.10) ]    ← collapsed default

  ↓ when expanded:
[ Source view ]
  ┌────────────────────────────────────────┐
  │  [page image, max-width: 100%]         │
  │  ┌──────────┐                          │
  │  │ ░░░░░░░░ │   ← amber outline         │
  │  │ ░bbox░░░ │      drawn over the image │
  │  └──────────┘                          │
  │                                        │
  │  Source: Splitting the Licks, p.10     │
  └────────────────────────────────────────┘
[ ▼ Hide source ]
```

**Component decisions:**

- **Single new local component** `SourceView` colocated in `src/components/LickPlayer/SourceView.tsx`. Takes `{ sourcePage: string, sourceBbox?: BBox, sourceLabel: string }`. Pure presentational.
- **Bbox rendered as an absolutely-positioned overlay** on the image: a transparent `<div>` with `position: absolute; left: bbox.x * 100%; top: bbox.y * 100%; width: bbox.width * 100%; height: bbox.height * 100%; outline: 2px solid var(--accent); border-radius: 4px;`. Container is `position: relative`. The image gets `display: block; width: 100%; height: auto`. Bbox scales correctly at any rendered size because it's percentage-based.
- **Toggle state lives in `LickPlayer`** (component-local `useState<boolean>(false)`). Resets to closed on lick change (key the SourceView on `lick.id` so it remounts).
- **Hide the toggle entirely if `lick.sourcePage` is undefined.** No confusing dead button.
- **Image errors:** `<img onError>` swaps to a small gray box with text "Source image unavailable: {sourcePage}". Doesn't break the layout.
- **No zoom/pan.** Click the image to open it in a new tab (`<a href target="_blank">`) for closer inspection.

**Mobile considerations:**

- Image full width of the player container.
- Toggle text shrinks to "📖 Source" on viewports below 480px to avoid wrapping.
- No layout breakage in the 3-column lick grid because the LickPlayer is already `grid-column: 1 / -1` when expanded.

---

## Section 4 — Bbox authoring (the 30 existing licks)

**Process:**

1. Claude opens `splitting-licks-p10.jpg` and `splitting-licks-p11.jpg` (which exist after Section 2's copy step).
2. For each of the 30 licks, Claude reads the page image and identifies the rectangle that visually contains its tab grid cell.
3. Claude produces a normalized bbox (`x`, `y`, `width`, `height`, all 0..1) and adds it to the lick's data along with `sourcePage`.

**Distribution of work:**

| Source page | Lick count | Notes |
|-------------|-----------|-------|
| `splitting-licks-p10.jpg` | ~19 | All G basics + most C licks + G fills + G combination + G→C transitions |
| `splitting-licks-p11.jpg` | ~11 | All D licks + 1 D ending + (the C→G transition might also reference p.10) |

**Accuracy expectations:**

- Right *general region* every time (correct row/column on the page).
- Pixel-perfect alignment most of the time but not always — book pages are photographed at angles, grids aren't perfectly rectangular.
- After implementation lands, the user smoke-tests by clicking through licks. Mismatches are visually obvious — the highlight will sit slightly off, on a neighboring cell, etc.
- Fix is one of two things: (a) edit the bbox numbers in the lick data, or (b) tell Claude which lick is wrong and Claude re-authors. Either is cheap.

**One simplification:** bboxes will be sized slightly larger than the strict cell boundary so partial mismatches still show the right region. A slightly oversized highlight reads as "this lick is in this area" which is fine for QC.

**No editor for now.** When the admin lick editor (deferred future feature) lands, it can include bbox click-drag adjustment. For Wave 1's 30 licks, agent-authored is sufficient.

---

## Section 5 — Implementation order & verification

**File touch list:**

```
public/sources/                                    [new]
  splitting-licks-p10.jpg                          (copied from training_material/)
  splitting-licks-p11.jpg                          (copied from training_material/)

src/data/lickLibrary.ts                            [modified]
  - Add sourcePage?: string and sourceBbox? to LickReference interface
  - Add sourcePage + sourceBbox to all 30 licks

src/components/LickPlayer/SourceView.tsx           [new]
  - Pure presentational: image + bbox overlay + label + image-error fallback

src/components/LickPlayer/LickPlayer.tsx           [modified]
  - Import SourceView
  - useState toggle for source visibility
  - Render SourceView + toggle button below description, only when lick.sourcePage exists

src/App.css                                        [modified]
  - .lick-source-view, .lick-source-toggle, .lick-source-bbox-overlay, .lick-source-error
```

**Build path handling:** `src/components/LickPlayer/SourceView.tsx` constructs the image src as `${import.meta.env.BASE_URL}sources/${sourcePage}`. Works at the GitHub Pages base path and locally.

**Implementation phases (one commit each):**

1. **Phase 1: Schema + assets + UI shell**
   - Add schema fields (no data yet).
   - Copy 2 source images to `public/sources/`.
   - Build `SourceView` + toggle wiring in `LickPlayer` + CSS.
   - Smoke test with a hardcoded `sourcePage` on one lick to verify rendering before Phase 2.

2. **Phase 2: Author bboxes for all 30 licks**
   - Claude reads both source pages and produces bbox + sourcePage for each lick.
   - Single commit updating all 30 lick entries.
   - User smoke-tests by clicking each lick → "View source" → eyeballing whether the highlight is in the right region.

**Verification gates:**

- `npx tsc -p tsconfig.app.json --noEmit` — no new errors on touched files (pre-existing errors on main are not in scope).
- `npx vite build` — succeeds and the built `dist/sources/` contains both images.
- Manual smoke test:
  - Library → Lick Library → click a lick → "View source" → image renders with amber rectangle in the expected region.
  - Toggle "Hide source" → image collapses, toggle returns to "View source".
  - Click a different lick → its source view is collapsed by default (toggle reset).
  - Visit a lick whose `sourcePage` is undefined (none currently, but verify the toggle hides gracefully).
  - Mobile (DevTools responsive mode, ≤480px): toggle text shows "📖 Source", image fills container.

---

## Risks

- **Bbox accuracy.** Worst case: highlight lands on a neighboring lick. Mitigation: oversized bboxes + visual smoke test + cheap fix path. This is the same accuracy class as the lick transcriptions themselves; if the user is comfortable with one, they're comfortable with the other.
- **Image asset bloat over time.** Adding pages for new books inflates `dist/sources/` linearly. At ~300 KB per page and ~50-100 pages of useful book content, this caps at ~30 MB. Still acceptable for a PWA. If it grows beyond that, revisit asset hosting (Section 2 → option c, IndexedDB caching).
- **Vite path handling on GitHub Pages.** Forgetting `import.meta.env.BASE_URL` would 404 every source image in production. Phase 1's smoke test catches this before Phase 2 lands.

## Follow-ups (separate specs)

- **Admin lick editor** (already in [`project_future_features.md`](../../../../../../Users/Lance.Greene/.claude/projects/D--banjo-buddy/memory/project_future_features.md)) — should include bbox click-drag adjustment when it lands.
- **Tab ingestion pipeline** — connect the existing FretLab tab scanner (`TabOverlayEditor`, `tabImageOcr`, `digitClassifier`, `tabTrainingPairs`) to the lick library so scan → review → publish is one end-to-end loop. Reuses the schema and asset-hosting pattern from this spec.
- **Wave 2 lick corpus** — same flow, source-page-by-source-page; just drop new pages into `public/sources/` and reference them.
