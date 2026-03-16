// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Recording Storage Service
// Wires up the existing but unused `recordings` table in db.ts.
// ─────────────────────────────────────────────────────────────────────────────

import { db, newId, nowISO } from '../db/db'
import type { Recording } from '../db/db'

const STORAGE_WARNING_BYTES = 500 * 1024 * 1024 // 500 MB

export async function saveRecording(
  sessionItemId: string,
  skillId: string,
  audioBlob: Blob,
  duration: number,
  bpm: number | null
): Promise<string> {
  const id = newId()
  const recording: Recording = {
    id,
    sessionItemId,
    skillId,
    audioBlob,
    durationSeconds: duration,
    bpm,
    createdAt: nowISO(),
  }
  await db.recordings.add(recording)

  // Link to session item
  await db.sessionItems.update(sessionItemId, {
    hasRecording: true,
    recordingKey: id,
  })

  return id
}

export async function getRecording(id: string): Promise<Recording | undefined> {
  return db.recordings.get(id)
}

export async function getRecordingsForSkill(skillId: string): Promise<Recording[]> {
  return db.recordings
    .where('skillId')
    .equals(skillId)
    .reverse()
    .sortBy('createdAt')
}

export async function deleteRecording(id: string): Promise<void> {
  const recording = await db.recordings.get(id)
  if (!recording) return

  await db.recordings.delete(id)

  // Unlink from session item
  if (recording.sessionItemId) {
    await db.sessionItems.update(recording.sessionItemId, {
      hasRecording: false,
      recordingKey: null,
    })
  }
}

export interface StorageUsage {
  totalBytes: number
  recordingCount: number
  isNearLimit: boolean
}

export async function getStorageUsage(): Promise<StorageUsage> {
  const recordings = await db.recordings.toArray()
  let totalBytes = 0
  for (const r of recordings) {
    totalBytes += r.audioBlob.size
  }

  return {
    totalBytes,
    recordingCount: recordings.length,
    isNearLimit: totalBytes >= STORAGE_WARNING_BYTES,
  }
}

export async function deleteOldestRecordings(count: number): Promise<number> {
  const recordings = await db.recordings
    .orderBy('createdAt')
    .limit(count)
    .toArray()

  let deleted = 0
  for (const r of recordings) {
    await deleteRecording(r.id)
    deleted++
  }
  return deleted
}
