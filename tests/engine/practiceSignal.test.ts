import { describe, it, expect } from 'vitest'
import { reflectionToTag, aggregateRecentActivity } from '../../src/engine/practiceSignal'
import type { PracticeEvent } from '../../src/types/coach'

const DAY = 24 * 60 * 60 * 1000
const NOW = new Date('2026-06-05T12:00:00.000Z').getTime()

function ev(partial: Partial<PracticeEvent>): PracticeEvent {
  return {
    id: crypto.randomUUID(),
    userId: 'u1',
    goalId: 'g1',
    sessionId: 's1',
    itemRef: { kind: 'roll', id: 'forward-roll' },
    reflection: 'solid',
    completedAt: new Date(NOW).toISOString(),
    ...partial,
  }
}

describe('reflectionToTag', () => {
  it('maps each reflection to its tag', () => {
    expect(reflectionToTag('solid')).toBe('got-it')
    expect(reflectionToTag('sloppy')).toBe('working')
    expect(reflectionToTag('new')).toBe('new')
  })
})

describe('aggregateRecentActivity', () => {
  it('returns empty for no events', () => {
    expect(aggregateRecentActivity([], NOW)).toEqual([])
  })

  it('groups by itemRef, counts, and tracks the latest timestamp', () => {
    const older = new Date(NOW - 2 * DAY).toISOString()
    const newer = new Date(NOW - 1 * DAY).toISOString()
    const out = aggregateRecentActivity(
      [
        ev({ completedAt: older }),
        ev({ completedAt: newer }),
        ev({ itemRef: { kind: 'lick', id: 'g-lick' }, completedAt: older }),
      ],
      NOW,
    )
    const roll = out.find((e) => e.itemRef.id === 'forward-roll')!
    expect(roll.count).toBe(2)
    expect(roll.lastAt).toBe(newer)
    expect(out.find((e) => e.itemRef.id === 'g-lick')!.count).toBe(1)
  })

  it('excludes events older than 14 days', () => {
    const out = aggregateRecentActivity(
      [ev({ completedAt: new Date(NOW - 15 * DAY).toISOString() })],
      NOW,
    )
    expect(out).toEqual([])
  })

  it('sorts by count descending and caps at 20 groups', () => {
    const events: PracticeEvent[] = []
    // 25 distinct items, item-i practiced (i+1) times
    for (let i = 0; i < 25; i++) {
      for (let n = 0; n <= i; n++) {
        events.push(ev({ itemRef: { kind: 'roll', id: `roll-${i}` } }))
      }
    }
    const out = aggregateRecentActivity(events, NOW)
    expect(out).toHaveLength(20)
    expect(out[0].count).toBeGreaterThanOrEqual(out[1].count)
    expect(out[0].itemRef.id).toBe('roll-24') // most-practiced
  })

  it('keys song-section refs by songId/sectionId', () => {
    const out = aggregateRecentActivity(
      [
        ev({ itemRef: { kind: 'song-section', songId: 'cripple', sectionId: 'A' } }),
        ev({ itemRef: { kind: 'song-section', songId: 'cripple', sectionId: 'A' } }),
      ],
      NOW,
    )
    expect(out).toHaveLength(1)
    expect(out[0].itemRef).toEqual({ kind: 'song-section', id: 'cripple/A' })
    expect(out[0].count).toBe(2)
  })
})
