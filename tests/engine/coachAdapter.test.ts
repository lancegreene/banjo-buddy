import { describe, it, expect } from 'vitest'
import { validateGoalDraft, parseToolCall, applyGoalDelta } from '../../src/engine/coachAdapter'
import { buildLibraryCatalog } from '../../src/engine/itemCatalog'
import type { Goal } from '../../src/types/coach'

// Pull a real ref from the catalog so tests don't lie about validity
const catalog = buildLibraryCatalog()
const aRoll = catalog.find(c => c.kind === 'roll')!
const aLick = catalog.find(c => c.kind === 'lick')!

describe('validateGoalDraft', () => {
  it('accepts a well-formed draft', () => {
    const result = validateGoalDraft({
      title: 'Forward roll',
      description: 'Push to 110',
      status: 'focus',
      supportingItemRefs: [{ kind: aRoll.kind as any, id: aRoll.id }],
      conceptTags: ['forward-roll'],
    })
    expect(result.ok).toBe(true)
  })

  it('rejects missing title', () => {
    const result = validateGoalDraft({
      title: '',
      description: 'x',
      status: 'focus',
      supportingItemRefs: [],
      conceptTags: [],
    })
    expect(result.ok).toBe(false)
  })

  it('rejects unknown concept tags', () => {
    const result = validateGoalDraft({
      title: 'x',
      description: 'x',
      status: 'focus',
      supportingItemRefs: [{ kind: aRoll.kind as any, id: aRoll.id }],
      conceptTags: ['nonsense-tag'],
    })
    expect(result.ok).toBe(false)
  })

  it('rejects unknown library item refs', () => {
    const result = validateGoalDraft({
      title: 'x',
      description: 'x',
      status: 'focus',
      supportingItemRefs: [{ kind: 'roll', id: 'does-not-exist' }],
      conceptTags: [],
    })
    expect(result.ok).toBe(false)
  })

  it('rejects invalid status', () => {
    const result = validateGoalDraft({
      title: 'x',
      description: 'x',
      status: 'completed' as any,
      supportingItemRefs: [],
      conceptTags: [],
    })
    expect(result.ok).toBe(false)
  })
})

describe('parseToolCall', () => {
  it('parses propose_initial_plan into add deltas', () => {
    const out = parseToolCall(
      {
        name: 'propose_initial_plan',
        input: {
          goals: [{
            title: 'x',
            description: 'x',
            status: 'focus',
            supportingItemRefs: [{ kind: aRoll.kind, id: aRoll.id }],
            conceptTags: ['forward-roll'],
          }],
        },
      },
      'u1',
    )
    expect(out.length).toBe(1)
    expect(out[0].op).toBe('add')
  })

  it('drops invalid drafts in propose_initial_plan', () => {
    const out = parseToolCall(
      {
        name: 'propose_initial_plan',
        input: {
          goals: [
            { title: 'good', description: 'd', status: 'focus', supportingItemRefs: [{ kind: aRoll.kind, id: aRoll.id }], conceptTags: ['forward-roll'] },
            { title: '', description: 'd', status: 'focus', supportingItemRefs: [], conceptTags: [] }, // bad title
          ],
        },
      },
      'u1',
    )
    expect(out.length).toBe(1)
  })

  it('returns noop on acknowledge_no_changes', () => {
    const out = parseToolCall({ name: 'acknowledge_no_changes', input: {} }, 'u1')
    expect(out).toEqual([{ op: 'noop' }])
  })

  it('rejects update_goal targeting unknown id', () => {
    const out = parseToolCall(
      { name: 'update_goal', input: { goalId: 'nonexistent', status: 'mastered' } },
      'u1',
      [],
    )
    expect(out.length).toBe(0)
  })

  it('parses update_goal targeting known id', () => {
    const existing: Goal = {
      id: 'g1', userId: 'u1', title: 't', description: 'd', status: 'focus',
      supportingItemRefs: [], conceptTags: [], createdAt: '2026-05-27T00:00:00Z',
      updatedAt: '2026-05-27T00:00:00Z', history: [],
    }
    const out = parseToolCall(
      { name: 'update_goal', input: { goalId: 'g1', status: 'mastered' } },
      'u1',
      [existing],
    )
    expect(out.length).toBe(1)
    expect(out[0].op).toBe('update')
  })

  it('returns empty on unknown tool name', () => {
    const out = parseToolCall({ name: 'fly_to_the_moon', input: {} }, 'u1')
    expect(out.length).toBe(0)
  })
})

describe('applyGoalDelta', () => {
  const baseGoal: Goal = {
    id: 'g1', userId: 'u1', title: 't', description: 'd', status: 'focus',
    supportingItemRefs: [], conceptTags: [], createdAt: '2026-05-27T00:00:00Z',
    updatedAt: '2026-05-27T00:00:00Z', history: [],
  }

  it('add appends new goal', () => {
    const newGoal: Goal = { ...baseGoal, id: 'g2' }
    const out = applyGoalDelta({ op: 'add', goal: newGoal }, [baseGoal])
    expect(out.length).toBe(2)
    expect(out[1].id).toBe('g2')
  })

  it('update modifies the matching goal and appends history', () => {
    const out = applyGoalDelta(
      { op: 'update', goalId: 'g1', before: {}, after: { status: 'mastered' } },
      [baseGoal],
    )
    expect(out[0].status).toBe('mastered')
    expect(out[0].history.length).toBe(1)
  })

  it('retire sets status shelved and completedAt', () => {
    const out = applyGoalDelta({ op: 'retire', goalId: 'g1', reason: 'lost interest' }, [baseGoal])
    expect(out[0].status).toBe('shelved')
    expect(out[0].completedAt).toBeDefined()
    expect(out[0].history[0].reason).toBe('lost interest')
  })

  it('noop returns input unchanged', () => {
    const out = applyGoalDelta({ op: 'noop' }, [baseGoal])
    expect(out).toBe(out)
    expect(out.length).toBe(1)
  })

  it('update against unknown id is a no-op', () => {
    const input = [baseGoal]
    const out = applyGoalDelta(
      { op: 'update', goalId: 'nonexistent', before: {}, after: { status: 'mastered' } },
      input,
    )
    expect(out).toBe(input) // ref-equal
  })
})
