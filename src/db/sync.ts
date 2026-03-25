// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Offline-First Sync Engine
// Syncs local Dexie data to Supabase in the background.
//
// Strategy:
//   1. All writes go to Dexie first (instant, offline-safe)
//   2. A sync queue tracks pending changes
//   3. When online, push pending changes to Supabase
//   4. Pull remote changes that are newer than local
//   5. Blob data (recordings, teacher clips) stays local-only for now
//      (Supabase Storage can be added later for cross-device media)
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from './supabase'
import { db, type SkillRecord, type PracticeSession, type SessionItem, type NoteAccuracyRecord } from './db'
import type { User } from '@supabase/supabase-js'

// ─── Sync Queue (persisted in IndexedDB) ────────────────────────────────────

interface SyncQueueItem {
  id?: number
  table: string
  recordId: string
  operation: 'upsert' | 'delete'
  data: Record<string, unknown>
  createdAt: string
}

// Add sync queue table to Dexie (we'll init this lazily)
let syncQueueReady = false

async function ensureSyncQueue() {
  if (syncQueueReady) return
  // Check if syncQueue table exists; if not, bump version
  if (!db.tables.some(t => t.name === 'syncQueue')) {
    const currentVersion = db.verno
    db.version(currentVersion + 1).stores({
      syncQueue: '++id, table, recordId, createdAt',
    })
    // Re-open if needed
    if (!db.isOpen()) await db.open()
  }
  syncQueueReady = true
}

/** Enqueue a change for sync to Supabase */
export async function enqueueSync(table: string, recordId: string, operation: 'upsert' | 'delete', data: Record<string, unknown> = {}) {
  try {
    await ensureSyncQueue()
    await (db as any).syncQueue.add({
      table,
      recordId,
      operation,
      data,
      createdAt: new Date().toISOString(),
    } as SyncQueueItem)
  } catch {
    // Sync queue failure is non-fatal — data is still in Dexie
    console.warn('[Sync] Failed to enqueue change')
  }
}

// ─── Column name mapping (camelCase ↔ snake_case) ───────────────────────────

function toSnake(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`)
    result[snakeKey] = value
  }
  return result
}

function toCamel(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
    result[camelKey] = value
  }
  return result
}

// ─── Table mapping ──────────────────────────────────────────────────────────

const TABLE_MAP: Record<string, string> = {
  userProfiles: 'profiles',
  skillRecords: 'skill_records',
  practiceSessions: 'practice_sessions',
  sessionItems: 'session_items',
  streakRecords: 'streak_records',
  noteAccuracyRecords: 'note_accuracy_records',
  achievements: 'achievements',
  customRollPatterns: 'custom_roll_patterns',
  teacherConfigs: 'teacher_configs',
  skillImageOverrides: 'skill_image_overrides',
}

// Fields to exclude from sync (blobs, local-only data)
const EXCLUDE_FIELDS = new Set(['audioBlob', 'videoBlob', 'imageBlob', 'thumbnailBlob'])

function cleanForSync(data: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    if (EXCLUDE_FIELDS.has(key)) continue
    if (value instanceof Blob) continue
    cleaned[key] = value
  }
  return cleaned
}

// ─── Push: Local → Supabase ─────────────────────────────────────────────────

/** Process the sync queue — push pending changes to Supabase */
export async function pushPendingChanges(): Promise<{ pushed: number; errors: number }> {
  await ensureSyncQueue()

  const items: SyncQueueItem[] = await (db as any).syncQueue.toArray()
  if (items.length === 0) return { pushed: 0, errors: 0 }

  let pushed = 0
  let errors = 0

  for (const item of items) {
    const supabaseTable = TABLE_MAP[item.table]
    if (!supabaseTable) {
      // Unknown table, remove from queue
      await (db as any).syncQueue.delete(item.id)
      continue
    }

    try {
      // skillImageOverrides uses skill_id as primary key, not id
      const pkColumn = item.table === 'skillImageOverrides' ? 'skill_id' : 'id'

      if (item.operation === 'delete') {
        const { error } = await supabase
          .from(supabaseTable)
          .delete()
          .eq(pkColumn, item.recordId)

        if (error) throw error
      } else {
        const snakeData = toSnake(cleanForSync(item.data))
        const { error } = await supabase
          .from(supabaseTable)
          .upsert(snakeData, { onConflict: pkColumn })

        if (error) throw error
      }

      // Remove from queue on success
      await (db as any).syncQueue.delete(item.id)
      pushed++
    } catch (err) {
      console.warn(`[Sync] Failed to push ${item.table}/${item.recordId}:`, err)
      errors++
    }
  }

  return { pushed, errors }
}

// ─── Pull: Supabase → Local ─────────────────────────────────────────────────

/** Pull remote changes newer than our last sync */
export async function pullRemoteChanges(userId: string): Promise<{ pulled: number }> {
  // Get last sync timestamp
  const { data: syncMeta } = await supabase
    .from('sync_metadata')
    .select('last_synced_at')
    .eq('user_id', userId)
    .single()

  const lastSynced = syncMeta?.last_synced_at ?? '1970-01-01T00:00:00Z'
  let pulled = 0

  // Pull skill records
  const { data: remoteSkills } = await supabase
    .from('skill_records')
    .select('*')
    .eq('user_id', userId)
    .gt('updated_at', lastSynced)

  if (remoteSkills) {
    for (const remote of remoteSkills) {
      const local = toCamel(remote) as unknown as SkillRecord
      const existing = await db.skillRecords
        .where('[userId+skillId]')
        .equals([local.userId, local.skillId])
        .first()

      // Remote wins if newer
      if (!existing || (existing.updatedAt && local.updatedAt && local.updatedAt > existing.updatedAt)) {
        await db.skillRecords.put(local)
        pulled++
      }
    }
  }

  // Pull practice sessions
  const { data: remoteSessions } = await supabase
    .from('practice_sessions')
    .select('*')
    .eq('user_id', userId)
    .gt('created_at', lastSynced)

  if (remoteSessions) {
    for (const remote of remoteSessions) {
      const local = toCamel(remote) as unknown as PracticeSession
      const existing = await db.practiceSessions.get(local.id)
      if (!existing) {
        await db.practiceSessions.put(local)
        pulled++
      }
    }
  }

  // Pull session items
  const { data: remoteItems } = await supabase
    .from('session_items')
    .select('*')
    .eq('user_id', userId)
    .gt('completed_at', lastSynced)

  if (remoteItems) {
    for (const remote of remoteItems) {
      const local = toCamel(remote) as unknown as SessionItem
      const existing = await db.sessionItems.get(local.id)
      if (!existing) {
        await db.sessionItems.put(local)
        pulled++
      }
    }
  }

  // Pull streak records
  const { data: remoteStreaks } = await supabase
    .from('streak_records')
    .select('*')
    .eq('user_id', userId)
    .gt('created_at', lastSynced)

  if (remoteStreaks) {
    for (const remote of remoteStreaks) {
      const local = toCamel(remote) as unknown as any
      const existing = await db.streakRecords
        .where('[userId+date]')
        .equals([local.userId, local.date])
        .first()
      if (!existing) {
        await db.streakRecords.put(local)
        pulled++
      }
    }
  }

  // Pull note accuracy records
  const { data: remoteAccuracy } = await supabase
    .from('note_accuracy_records')
    .select('*')
    .eq('user_id', userId)
    .gt('created_at', lastSynced)

  if (remoteAccuracy) {
    for (const remote of remoteAccuracy) {
      const local = toCamel(remote) as unknown as NoteAccuracyRecord
      const existing = await db.noteAccuracyRecords.get(local.id)
      if (!existing) {
        await db.noteAccuracyRecords.put(local)
        pulled++
      }
    }
  }

  // Pull achievements
  const { data: remoteAchievements } = await supabase
    .from('achievements')
    .select('*')
    .eq('user_id', userId)
    .gt('created_at', lastSynced)

  if (remoteAchievements) {
    for (const remote of remoteAchievements) {
      const local = toCamel(remote) as unknown as any
      const existing = await db.achievements
        .where({ achievementId: local.achievementId, userId: local.userId })
        .first()
      if (!existing) {
        await db.achievements.put(local)
        pulled++
      }
    }
  }

  // Pull skill image overrides (global, not per-user)
  const { data: remoteImageOverrides } = await supabase
    .from('skill_image_overrides')
    .select('*')
    .gt('updated_at', lastSynced)

  if (remoteImageOverrides) {
    for (const remote of remoteImageOverrides) {
      const local = toCamel(remote) as unknown as any
      const existing = await db.skillImageOverrides.get(local.skillId)
      if (!existing || (existing.updatedAt && local.updatedAt && local.updatedAt > existing.updatedAt)) {
        await db.skillImageOverrides.put(local)
        pulled++
      }
    }
  }

  // Update sync timestamp
  await supabase
    .from('sync_metadata')
    .upsert({
      user_id: userId,
      last_synced_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

  return { pulled }
}

// ─── Full Sync ──────────────────────────────────────────────────────────────

/** Run a full bidirectional sync */
export async function fullSync(userId: string): Promise<{ pushed: number; pulled: number; errors: number }> {
  const { pushed, errors } = await pushPendingChanges()
  const { pulled } = await pullRemoteChanges(userId)
  return { pushed, pulled, errors }
}

// ─── Auto-Sync (background) ────────────────────────────────────────────────

let syncInterval: ReturnType<typeof setInterval> | null = null

/** Start background sync every N seconds */
export function startAutoSync(userId: string, intervalMs: number = 30_000) {
  stopAutoSync()
  // Initial sync
  fullSync(userId).catch(() => {})
  // Periodic sync
  syncInterval = setInterval(() => {
    fullSync(userId).catch(() => {})
  }, intervalMs)
  // Sync on reconnect
  window.addEventListener('online', () => fullSync(userId).catch(() => {}))
}

/** Stop background sync */
export function stopAutoSync() {
  if (syncInterval) {
    clearInterval(syncInterval)
    syncInterval = null
  }
}

// ─── Initial upload (migrate local data to cloud on first auth) ─────────────

/** Push all local Dexie data to Supabase for a newly authenticated user */
export async function uploadLocalData(localUserId: string, cloudUserId: string): Promise<void> {
  // Skill records
  const skills = await db.skillRecords.where('userId').equals(localUserId).toArray()
  for (const record of skills) {
    const data = { ...record, userId: cloudUserId }
    await enqueueSync('skillRecords', record.id, 'upsert', data)
  }

  // Practice sessions
  const sessions = await db.practiceSessions.where('userId').equals(localUserId).toArray()
  for (const session of sessions) {
    const data = { ...session, userId: cloudUserId }
    await enqueueSync('practiceSessions', session.id, 'upsert', data)
  }

  // Session items (need userId added)
  for (const session of sessions) {
    const items = await db.sessionItems.where('sessionId').equals(session.id).toArray()
    for (const item of items) {
      const data = { ...item, userId: cloudUserId }
      await enqueueSync('sessionItems', item.id, 'upsert', data)
    }
  }

  // Streak records
  const streaks = await db.streakRecords.where('userId').equals(localUserId).toArray()
  for (const streak of streaks) {
    const data = { ...streak, userId: cloudUserId }
    await enqueueSync('streakRecords', streak.id, 'upsert', data)
  }

  // Achievements
  const achievements = await db.achievements.where('userId').equals(localUserId).toArray()
  for (const achievement of achievements) {
    const data = { ...achievement, userId: cloudUserId }
    await enqueueSync('achievements', achievement.id, 'upsert', data)
  }

  // Push everything
  await pushPendingChanges()
}
