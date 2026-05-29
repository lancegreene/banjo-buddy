// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Coach tool-call adapter
// Pure: validates and normalizes LLM tool calls into GoalDelta[]
// ─────────────────────────────────────────────────────────────────────────────

import type { Goal, GoalDelta, GoalDraft, GoalStatus, ItemRef } from '../types/coach'
import { CONCEPT_TAG_MAP } from '../data/conceptTags'
import { buildLibraryCatalog } from './itemCatalog'

const VALID_STATUSES: GoalStatus[] = ['focus', 'explore', 'backlog', 'mastered', 'shelved']

let cachedKnownIds: Set<string> | null = null
function knownItemRefKeys(): Set<string> {
  if (!cachedKnownIds) {
    const catalog = buildLibraryCatalog()
    cachedKnownIds = new Set(catalog.map(c => `${c.kind}:${c.id}`))
  }
  return cachedKnownIds
}

/** Composite key matching the convention used by itemCatalog + setItemTag.
 *  For song-section: `song-section:${songId}/${sectionId}` (matches catalog id "songId/sectionId").
 *  For other kinds: `${kind}:${id}`.
 */
function refKey(ref: ItemRef): string {
  if (ref.kind === 'song-section') {
    return `song-section:${ref.songId}/${ref.sectionId}`
  }
  return `${ref.kind}:${ref.id}`
}

export type ValidateResult =
  | { ok: true }
  | { ok: false; reason: string }

export function validateGoalDraft(d: Partial<GoalDraft>): ValidateResult {
  if (!d.title || !d.title.trim()) return { ok: false, reason: 'missing title' }
  if (!d.description || !d.description.trim()) return { ok: false, reason: 'missing description' }
  if (!d.status || !VALID_STATUSES.includes(d.status)) {
    return { ok: false, reason: `invalid status: ${String(d.status)}` }
  }
  if (!Array.isArray(d.supportingItemRefs)) {
    return { ok: false, reason: 'supportingItemRefs not an array' }
  }
  if (!Array.isArray(d.conceptTags)) {
    return { ok: false, reason: 'conceptTags not an array' }
  }
  const known = knownItemRefKeys()
  for (const ref of d.supportingItemRefs) {
    if (!known.has(refKey(ref))) {
      return { ok: false, reason: `unknown item ref: ${refKey(ref)}` }
    }
  }
  for (const tag of d.conceptTags) {
    if (!CONCEPT_TAG_MAP[tag]) {
      return { ok: false, reason: `unknown concept tag: ${tag}` }
    }
  }
  return { ok: true }
}

export interface ToolCall {
  name: string
  input: any
}

/** Convert an LLM tool call into one or more GoalDeltas. Drops invalid ones. */
export function parseToolCall(
  call: ToolCall,
  userId: string,
  existingGoals: Goal[] = [],
): GoalDelta[] {
  const now = new Date().toISOString()

  switch (call.name) {
    case 'propose_initial_plan': {
      const drafts: Partial<GoalDraft>[] = call.input?.goals ?? []
      const deltas: GoalDelta[] = []
      for (const d of drafts) {
        const v = validateGoalDraft(d)
        if (!v.ok) continue
        deltas.push({
          op: 'add',
          goal: {
            id: crypto.randomUUID(),
            userId,
            title: d.title!,
            description: d.description!,
            status: d.status!,
            supportingItemRefs: d.supportingItemRefs!,
            conceptTags: d.conceptTags!,
            createdAt: now,
            updatedAt: now,
            history: [],
          },
        })
      }
      return deltas
    }

    case 'add_goal': {
      const d = call.input?.goal as Partial<GoalDraft> | undefined
      if (!d) return []
      const v = validateGoalDraft(d)
      if (!v.ok) return []
      return [{
        op: 'add',
        goal: {
          id: crypto.randomUUID(),
          userId,
          title: d.title!,
          description: d.description!,
          status: d.status!,
          supportingItemRefs: d.supportingItemRefs!,
          conceptTags: d.conceptTags!,
          createdAt: now,
          updatedAt: now,
          history: [],
        },
      }]
    }

    case 'update_goal': {
      const { goalId, ...changes } = call.input ?? {}
      const existing = existingGoals.find(g => g.id === goalId)
      if (!existing) return []
      const allowed = ['status', 'title', 'description', 'supportingItemRefs'] as const
      const after: Partial<Goal> = {}
      for (const k of allowed) {
        if (k in changes) (after as any)[k] = changes[k]
      }
      // Validate status if present
      if (after.status && !VALID_STATUSES.includes(after.status)) return []
      // Validate item refs if present
      if (after.supportingItemRefs) {
        const known = knownItemRefKeys()
        for (const ref of after.supportingItemRefs) {
          if (!known.has(refKey(ref))) return []
        }
      }
      return [{
        op: 'update',
        goalId,
        before: {
          status: existing.status,
          title: existing.title,
          description: existing.description,
        },
        after,
      }]
    }

    case 'retire_goal': {
      const goalId = call.input?.goalId
      if (!existingGoals.find(g => g.id === goalId)) return []
      return [{
        op: 'retire',
        goalId,
        reason: call.input?.reason,
      }]
    }

    case 'acknowledge_no_changes':
      return [{ op: 'noop' }]

    default:
      return []
  }
}

/** Apply a single delta to a list of goals, returning a new list (does not mutate). */
export function applyGoalDelta(delta: GoalDelta, existing: Goal[]): Goal[] {
  switch (delta.op) {
    case 'add':
      return [...existing, delta.goal]
    case 'update': {
      const idx = existing.findIndex(g => g.id === delta.goalId)
      if (idx < 0) return existing
      const now = new Date().toISOString()
      const target = existing[idx]
      const updated: Goal = {
        ...target,
        ...delta.after,
        updatedAt: now,
        history: [
          ...target.history,
          {
            at: now,
            from: target.status,
            to: (delta.after.status ?? target.status),
            reason: 'updated by check-in',
          },
        ],
      }
      const copy = [...existing]
      copy[idx] = updated
      return copy
    }
    case 'retire': {
      const idx = existing.findIndex(g => g.id === delta.goalId)
      if (idx < 0) return existing
      const now = new Date().toISOString()
      const target = existing[idx]
      const updated: Goal = {
        ...target,
        status: 'shelved',
        updatedAt: now,
        completedAt: now,
        history: [
          ...target.history,
          {
            at: now,
            from: target.status,
            to: 'shelved',
            reason: delta.reason,
          },
        ],
      }
      const copy = [...existing]
      copy[idx] = updated
      return copy
    }
    case 'noop':
      return existing
  }
}
