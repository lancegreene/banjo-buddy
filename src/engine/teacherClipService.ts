// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Teacher Media Storage Service
// CRUD for teacher video/audio/image demo clips attached to skills and rolls.
// ─────────────────────────────────────────────────────────────────────────────

import { db, newId, nowISO } from '../db/db'
import type { TeacherClip, MediaType } from '../db/db'

const STORAGE_WARNING_BYTES = 500 * 1024 * 1024 // 500 MB

export async function saveClip(
  clip: Omit<TeacherClip, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const id = newId()
  const now = nowISO()
  await db.teacherClips.add({ ...clip, id, createdAt: now, updatedAt: now })
  return id
}

export async function getClip(id: string): Promise<TeacherClip | undefined> {
  return db.teacherClips.get(id)
}

export async function getClipsForSkill(skillId: string): Promise<TeacherClip[]> {
  return db.teacherClips.where('skillId').equals(skillId).reverse().sortBy('createdAt')
}

export async function getClipsForPattern(rollPatternId: string): Promise<TeacherClip[]> {
  return db.teacherClips.where('rollPatternId').equals(rollPatternId).reverse().sortBy('createdAt')
}

export async function getClipsByTeacher(teacherId: string): Promise<TeacherClip[]> {
  return db.teacherClips.where('teacherId').equals(teacherId).reverse().sortBy('createdAt')
}

export async function getClipsForSkillOrPattern(
  skillId: string | null,
  rollPatternId: string | null
): Promise<TeacherClip[]> {
  if (!skillId && !rollPatternId) return []
  const all = await db.teacherClips.toArray()
  return all
    .filter((c) => {
      // Exclude tab_crop source images — only show the crops themselves
      if (c.mediaType === 'image' && all.some((other) => other.sourceImageId === c.id)) return false
      return (skillId && c.skillId === skillId) || (rollPatternId && c.rollPatternId === rollPatternId)
    })
    .sort((a, b) => {
      // Sort by sortOrder first (if set), then by creation date
      const sa = a.sortOrder ?? Infinity
      const sb = b.sortOrder ?? Infinity
      if (sa !== sb) return sa - sb
      return b.createdAt.localeCompare(a.createdAt)
    })
}

export async function getTabCropsForSource(sourceImageId: string): Promise<TeacherClip[]> {
  const all = await db.teacherClips.where('sourceImageId').equals(sourceImageId).toArray()
  return all.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
}

export async function updateClip(
  id: string,
  updates: Partial<Pick<TeacherClip, 'title' | 'trimStart' | 'trimEnd' | 'skillId' | 'rollPatternId' | 'thumbnailBlob' | 'imageBlob' | 'audioBlob' | 'cropRect' | 'sortOrder'>>
): Promise<void> {
  await db.teacherClips.update(id, { ...updates, updatedAt: nowISO() })
}

export async function deleteClip(id: string): Promise<void> {
  // If this is a source image, also delete its tab crops
  const crops = await db.teacherClips.where('sourceImageId').equals(id).toArray()
  for (const crop of crops) {
    await db.teacherClips.delete(crop.id)
  }
  await db.teacherClips.delete(id)
}

export interface ClipStorageUsage {
  totalBytes: number
  clipCount: number
  isNearLimit: boolean
}

export async function getMediaStorageUsage(): Promise<ClipStorageUsage> {
  const clips = await db.teacherClips.toArray()
  let totalBytes = 0
  for (const c of clips) {
    if (c.videoBlob) totalBytes += c.videoBlob.size
    if (c.audioBlob) totalBytes += c.audioBlob.size
    if (c.imageBlob) totalBytes += c.imageBlob.size
    if (c.thumbnailBlob) totalBytes += c.thumbnailBlob.size
  }
  return {
    totalBytes,
    clipCount: clips.length,
    isNearLimit: totalBytes >= STORAGE_WARNING_BYTES,
  }
}

export async function reorderClips(orderedIds: string[]): Promise<void> {
  const now = nowISO()
  await db.transaction('rw', db.teacherClips, async () => {
    for (let i = 0; i < orderedIds.length; i++) {
      await db.teacherClips.update(orderedIds[i], { sortOrder: i, updatedAt: now })
    }
  })
}

// Legacy alias
export const getVideoStorageUsage = getMediaStorageUsage
