// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Practice signal (pure)
// Reflection→tag mapping + recent-activity aggregation over practiceEvents.
// No React, no Dexie — takes plain data in, returns plain data out.
// ─────────────────────────────────────────────────────────────────────────────

import type { PracticeEvent, Reflection, ItemRef, TagValue } from '../types/coach'
import type { RecentActivityEntry } from './coachPrompts'

const ACTIVITY_WINDOW_MS = 14 * 24 * 60 * 60 * 1000
const MAX_ACTIVITY_GROUPS = 20

// The 3 reflection buttons map onto the existing item-tag vocabulary so the
// coach sees reflections through the itemTags it already reads.
const REFLECTION_TAG: Record<Reflection, TagValue> = {
  solid: 'got-it',
  sloppy: 'working',
  new: 'new',
}

export function reflectionToTag(reflection: Reflection): TagValue {
  return REFLECTION_TAG[reflection]
}

// Flatten an ItemRef to the { kind, id } pair used by RecentActivityEntry and
// the library catalog (song-section id = "songId/sectionId").
function refToKindId(ref: ItemRef): { kind: string; id: string } {
  if (ref.kind === 'song-section') {
    return { kind: 'song-section', id: `${ref.songId}/${ref.sectionId}` }
  }
  return { kind: ref.kind, id: ref.id }
}

/**
 * Aggregate practice events from the last 14 days into RecentActivityEntry[]:
 * one entry per distinct item, with practice count and most-recent timestamp,
 * sorted by count descending and capped at the top 20.
 */
export function aggregateRecentActivity(
  events: PracticeEvent[],
  now: number,
): RecentActivityEntry[] {
  const cutoff = now - ACTIVITY_WINDOW_MS
  const byKey = new Map<string, RecentActivityEntry>()

  for (const e of events) {
    if (new Date(e.completedAt).getTime() < cutoff) continue
    const { kind, id } = refToKindId(e.itemRef)
    const key = `${kind}:${id}`
    const existing = byKey.get(key)
    if (existing) {
      existing.count += 1
      if (e.completedAt > existing.lastAt) existing.lastAt = e.completedAt
    } else {
      byKey.set(key, { itemRef: { kind, id }, count: 1, lastAt: e.completedAt })
    }
  }

  return Array.from(byKey.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, MAX_ACTIVITY_GROUPS)
}
