// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — LibraryConfirmation
// After assessment chat proposes goals, ask the user to tag 3–5 of the
// supporting library items as "Got it / Working / New". Seeds itemTags so the
// first check-in has real signal.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react'
import type { Goal, ItemRef, TagValue } from '../../types/coach'
import { buildLibraryCatalog } from '../../engine/itemCatalog'

interface Props {
  proposedGoals: Goal[]
  onConfirm: (tags: { itemRef: ItemRef; tag: TagValue }[]) => void
}

function refKey(ref: ItemRef): string {
  if (ref.kind === 'song-section') {
    return `song-section:${ref.songId}/${ref.sectionId}`
  }
  return `${ref.kind}:${ref.id}`
}

// The catalog stores song-section items with id = "songId/sectionId".
function catalogIdFromRef(ref: ItemRef): string {
  if (ref.kind === 'song-section') return `${ref.songId}/${ref.sectionId}`
  return ref.id
}

const TAG_OPTIONS: { value: TagValue; label: string }[] = [
  { value: 'got-it', label: 'Got it' },
  { value: 'working', label: 'Working' },
  { value: 'new', label: 'New' },
]

export function LibraryConfirmation({ proposedGoals, onConfirm }: Props) {
  // Pick 3-5 items from the proposed goals' supportingItemRefs (deduplicated).
  const itemsToTag = useMemo(() => {
    const catalog = buildLibraryCatalog()
    const catalogIndex: Record<string, { name: string; brief: string; key?: string }> = {}
    for (const c of catalog) {
      catalogIndex[`${c.kind}:${c.id}`] = { name: c.name, brief: c.brief, key: c.key }
    }
    const seen = new Set<string>()
    const items: Array<{ ref: ItemRef; meta: { name: string; brief: string; key?: string } }> = []
    for (const goal of proposedGoals) {
      for (const ref of goal.supportingItemRefs) {
        const key = refKey(ref)
        if (seen.has(key)) continue
        seen.add(key)
        const lookup = `${ref.kind}:${catalogIdFromRef(ref)}`
        const meta = catalogIndex[lookup]
        if (!meta) continue
        items.push({ ref, meta })
        if (items.length >= 5) break
      }
      if (items.length >= 5) break
    }
    return items
  }, [proposedGoals])

  const [tags, setTags] = useState<Record<string, TagValue>>({})

  const setTag = (ref: ItemRef, tag: TagValue) => {
    setTags((t) => ({ ...t, [refKey(ref)]: tag }))
  }

  const handleSubmit = () => {
    const result = itemsToTag
      .filter(({ ref }) => tags[refKey(ref)])
      .map(({ ref }) => ({ itemRef: ref, tag: tags[refKey(ref)] }))
    onConfirm(result)
  }

  if (itemsToTag.length === 0) {
    // No taggable items found — proceed immediately.
    return (
      <div className="library-confirmation">
        <h2>Generating your plan...</h2>
        <button className="lc-submit" onClick={() => onConfirm([])}>
          Continue
        </button>
      </div>
    )
  }

  return (
    <div className="library-confirmation">
      <header>
        <h2>One last thing</h2>
        <p>How do these feel right now?</p>
      </header>

      <ul className="lc-items">
        {itemsToTag.map(({ ref, meta }) => {
          const k = refKey(ref)
          const current = tags[k]
          return (
            <li key={k} className="lc-item">
              <div className="lc-item-info">
                <div className="lc-item-name">{meta.name}</div>
                <div className="lc-item-brief">{meta.brief}</div>
              </div>
              <div className="lc-tag-buttons">
                {TAG_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`tag-btn tag-btn--${opt.value} ${current === opt.value ? 'active' : ''}`}
                    onClick={() => setTag(ref, opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </li>
          )
        })}
      </ul>

      <button className="lc-submit" onClick={handleSubmit}>
        Generate my plan
      </button>
    </div>
  )
}
