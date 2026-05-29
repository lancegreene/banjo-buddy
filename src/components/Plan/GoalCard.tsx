import { useMemo } from 'react'
import type { Goal, ItemRef, TagValue } from '../../types/coach'
import { useStore } from '../../store/useStore'
import { buildLibraryCatalog } from '../../engine/itemCatalog'

interface GoalCardProps {
  goal: Goal
  onItemClick: (ref: ItemRef) => void
  onStartSession?: (goal: Goal) => void  // optional; Phase 5 wires this. Undefined for MVP.
}

const STATUS_LABEL: Record<Goal['status'], string> = {
  focus: 'Focus',
  explore: 'Explore',
  backlog: 'Up next',
  mastered: 'Mastered',
  shelved: 'Shelved',
}

const STATUS_CLASS: Record<Goal['status'], string> = {
  focus: 'goal-card--focus',
  explore: 'goal-card--explore',
  backlog: 'goal-card--backlog',
  mastered: 'goal-card--mastered',
  shelved: 'goal-card--shelved',
}

// Composite key for matching ItemRef ↔ catalog item ↔ itemTags entry.
// Convention from Task 1.8 setItemTag + Task 2.1 itemCatalog.
function refKey(ref: ItemRef): string {
  if (ref.kind === 'song-section') {
    return `song-section:${ref.songId}/${ref.sectionId}`
  }
  return `${ref.kind}:${ref.id}`
}

// Catalog stores song-section items with id = "songId/sectionId".
// For other kinds, catalog id matches the ref id.
function catalogIdFromRef(ref: ItemRef): string {
  if (ref.kind === 'song-section') return `${ref.songId}/${ref.sectionId}`
  return ref.id
}

export function GoalCard({ goal, onItemClick, onStartSession }: GoalCardProps) {
  const itemTags = useStore((s) => s.itemTags)
  const catalog = useMemo(() => buildLibraryCatalog(), [])
  const catalogIndex = useMemo(() => {
    const idx: Record<string, { name: string; key?: string }> = {}
    for (const c of catalog) idx[`${c.kind}:${c.id}`] = { name: c.name, key: c.key }
    return idx
  }, [catalog])

  return (
    <article className={`goal-card ${STATUS_CLASS[goal.status]}`}>
      <header className="goal-card-header">
        <span className="goal-card-status">{STATUS_LABEL[goal.status]}</span>
        <h3 className="goal-card-title">{goal.title}</h3>
        {goal.description && (
          <p className="goal-card-description">{goal.description}</p>
        )}
      </header>
      <ul className="goal-card-items">
        {goal.supportingItemRefs.map((ref, i) => {
          const key = refKey(ref)
          const tag = itemTags[key]?.tag
          const catalogId = `${ref.kind}:${catalogIdFromRef(ref)}`
          const meta = catalogIndex[catalogId]
          const displayName = meta?.name ?? `${ref.kind}: ${catalogIdFromRef(ref)}`
          return (
            <li key={i}>
              <button
                className="goal-card-item"
                onClick={() => onItemClick(ref)}
              >
                <span className="goal-card-item-name">{displayName}</span>
                {tag && <span className={`tag-badge tag-badge--${tag}`}>{tag}</span>}
              </button>
            </li>
          )
        })}
      </ul>
      {onStartSession && (
        <button
          className="goal-card-start-session"
          onClick={() => onStartSession(goal)}
        >
          ▶ Guided session
        </button>
      )}
    </article>
  )
}

// Keep TagValue exported for downstream Plan dashboard typing reuse.
export type { TagValue }
