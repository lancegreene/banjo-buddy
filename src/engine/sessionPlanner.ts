import type { Skill } from '../data/curriculum'
import type { SkillRecord } from '../db/db'
import type { RecommendedItem, SessionPlan } from './recommendationEngine'
import { buildSessionPlan } from './recommendationEngine'
import type { WarmUpItem } from './warmupEngine'
import { generateWarmUp } from './warmupEngine'
import type { Path } from '../data/curriculum'

export interface SmartSession {
  warmUp: WarmUpItem[]
  blocks: SessionBlock[]
  review: RecommendedItem[]
  totalEstimatedMinutes: number
  isSmartMix: boolean
}

export interface SessionBlock {
  type: 'technique' | 'roll' | 'lick' | 'song' | 'theory'
  items: RecommendedItem[]
  durationMinutes: number
}

const BLOCK_DURATION_MINUTES = 4
const CATEGORY_TO_BLOCK_TYPE: Record<string, SessionBlock['type']> = {
  rolls: 'roll',
  techniques: 'technique',
  licks: 'lick',
  songs: 'song',
  theory: 'theory',
  'ear-training': 'theory',
  chords: 'technique',
  exercises: 'technique',
}

export async function buildSmartSession(
  path: Path,
  allRecords: Map<string, SkillRecord>,
  userId: string,
  targetMinutes: number = 30,
  recentItemsBySkill: Map<string, import('../db/db').SessionItem[]> = new Map()
): Promise<SmartSession> {
  // Get warm-up items
  const warmUp = await generateWarmUp(allRecords, userId)

  // Get base session plan
  const plan = buildSessionPlan(path, allRecords, targetMinutes, recentItemsBySkill)

  // Flatten all items
  const allItems = [...plan.newSkills, ...plan.activeWork, ...plan.maintenance]

  if (allItems.length === 0) {
    return { warmUp, blocks: [], review: [], totalEstimatedMinutes: 0, isSmartMix: true }
  }

  // Group by skill category
  const grouped = new Map<SessionBlock['type'], RecommendedItem[]>()
  for (const item of allItems) {
    const blockType = CATEGORY_TO_BLOCK_TYPE[item.skill.category] ?? 'technique'
    const arr = grouped.get(blockType) ?? []
    arr.push(item)
    grouped.set(blockType, arr)
  }

  // Round-robin interleave groups into blocks
  const blocks: SessionBlock[] = []
  const types = Array.from(grouped.keys())
  let typeIndex = 0
  const used = new Map<string, number>(types.map(t => [t, 0]))

  const remainingMinutes = targetMinutes - (warmUp.length > 0 ? 5 : 0)
  const maxBlocks = Math.floor(remainingMinutes / BLOCK_DURATION_MINUTES)

  for (let b = 0; b < maxBlocks && types.length > 0; b++) {
    const type = types[typeIndex % types.length]
    const items = grouped.get(type) ?? []
    const idx = used.get(type) ?? 0

    if (idx < items.length) {
      // Take 1-2 items per block
      const blockItems = items.slice(idx, idx + 2)
      blocks.push({
        type,
        items: blockItems,
        durationMinutes: BLOCK_DURATION_MINUTES,
      })
      used.set(type, idx + blockItems.length)
    }

    typeIndex++

    // Remove exhausted types
    for (const t of [...types]) {
      if ((used.get(t) ?? 0) >= (grouped.get(t)?.length ?? 0)) {
        types.splice(types.indexOf(t), 1)
      }
    }
  }

  // Last block is review (maintenance items not yet included)
  const review = plan.maintenance.slice(0, 2)

  const totalEstimatedMinutes = (warmUp.length > 0 ? 5 : 0) + blocks.length * BLOCK_DURATION_MINUTES + (review.length > 0 ? 3 : 0)

  return { warmUp, blocks, review, totalEstimatedMinutes, isSmartMix: true }
}
