// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Coach overhaul types
// Goals, item tags, check-in records, LLM tool-call structures
// ─────────────────────────────────────────────────────────────────────────────

export type GoalStatus =
  | 'focus'      // primary attention, max 1
  | 'explore'    // secondary, soft cap 1-2
  | 'backlog'    // queued, lives behind "see all"
  | 'mastered'   // completed
  | 'shelved'    // retired without mastering

export type ItemRef =
  | { kind: 'lick'; id: string }
  | { kind: 'roll'; id: string }
  | { kind: 'song-section'; songId: string; sectionId: string }
  | { kind: 'chord'; id: string }
  | { kind: 'scale'; id: string }

export interface GoalHistoryEntry {
  at: string                          // ISO
  from: GoalStatus
  to: GoalStatus
  reason?: string                     // LLM-provided
  checkInId?: string
}

export interface Goal {
  id: string                          // uuid
  userId: string                      // owner (matches userProfiles.id)
  title: string                       // LLM-generated
  description: string                 // LLM-generated context
  status: GoalStatus
  supportingItemRefs: ItemRef[]
  conceptTags: string[]               // CONCEPT_TAG ids
  createdAt: string                   // ISO
  updatedAt: string
  completedAt?: string
  history: GoalHistoryEntry[]
}

export type TagValue = 'got-it' | 'working' | 'new'

export interface ItemTag {
  id: string                          // composite "kind:id" (or "song-section:songId/sectionId") — also primary key
  userId: string
  itemRef: ItemRef
  tag: TagValue
  updatedAt: string
}

export interface CoachMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  toolCallId?: string
  toolName?: string
  toolArgs?: unknown
  timestamp: string                   // ISO
}

export type GoalDelta =
  | { op: 'add'; goal: Goal }
  | { op: 'update'; goalId: string; before: Partial<Goal>; after: Partial<Goal> }
  | { op: 'retire'; goalId: string; reason?: string }
  | { op: 'noop' }

export interface CheckInRecord {
  id: string                          // uuid
  userId: string
  kind: 'assessment' | 'checkin'
  startedAt: string                   // ISO
  endedAt: string
  transcript: CoachMessage[]          // local-only, not synced
  goalDeltas: GoalDelta[]
  apiCost?: number                    // USD, computed from token usage
}

export interface GoalDraft {
  title: string
  description: string
  status: GoalStatus
  supportingItemRefs: ItemRef[]
  conceptTags: string[]
}

export interface ConceptTag {
  id: string                          // kebab-case slug, e.g. 'forward-roll'
  label: string                       // display name, e.g. 'Forward Roll'
  description: string                 // short LLM-readable description
}

// Compact catalog entry passed to the LLM. Built from library data files.
export interface LibraryCatalogItem {
  id: string
  kind: ItemRef['kind']
  name: string
  key?: string
  role?: string
  conceptTags: string[]
  brief: string                       // 1-line description for LLM context
}
