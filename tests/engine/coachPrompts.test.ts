import { describe, it, expect } from 'vitest'
import { buildSystemPrompt, ASSESSMENT_TOOLS, CHECKIN_TOOLS } from '../../src/engine/coachPrompts'
import type { Goal } from '../../src/types/coach'

const sampleGoal: Goal = {
  id: 'g1',
  userId: 'u1',
  title: 'Forward roll @ 110',
  description: 'Stretch tempo',
  status: 'focus',
  supportingItemRefs: [{ kind: 'roll', id: 'forward-roll-basic' }],
  conceptTags: ['forward-roll'],
  createdAt: '2026-05-27T00:00:00Z',
  updatedAt: '2026-05-27T00:00:00Z',
  history: [],
}

describe('buildSystemPrompt', () => {
  it('produces a non-empty string', () => {
    const out = buildSystemPrompt({ kind: 'assessment', goals: [], itemTags: [], recentActivity: [] })
    expect(out.length).toBeGreaterThan(500)
  })

  it('includes the concept taxonomy', () => {
    const out = buildSystemPrompt({ kind: 'assessment', goals: [], itemTags: [], recentActivity: [] })
    expect(out).toContain('forward-roll')
  })

  it('includes current goals for check-in', () => {
    const out = buildSystemPrompt({ kind: 'checkin', goals: [sampleGoal], itemTags: [], recentActivity: [] })
    expect(out).toContain('Forward roll @ 110')
  })

  it('includes the catalog with at least one lick', () => {
    const out = buildSystemPrompt({ kind: 'assessment', goals: [], itemTags: [], recentActivity: [] })
    expect(out).toMatch(/"kind":\s*"lick"/)
  })

  it('mode header differs between assessment and checkin', () => {
    const a = buildSystemPrompt({ kind: 'assessment', goals: [], itemTags: [], recentActivity: [] })
    const c = buildSystemPrompt({ kind: 'checkin', goals: [], itemTags: [], recentActivity: [] })
    expect(a).toContain('Initial assessment')
    expect(c).toContain('Weekly check-in')
  })
})

describe('tool definitions', () => {
  it('assessment tools include propose_initial_plan', () => {
    expect(ASSESSMENT_TOOLS.find(t => t.name === 'propose_initial_plan')).toBeDefined()
  })

  it('propose_initial_plan requires a goals array with minimum size', () => {
    const tool = ASSESSMENT_TOOLS.find(t => t.name === 'propose_initial_plan')
    const schema: any = tool?.input_schema
    expect(schema.properties.goals.minItems).toBeGreaterThanOrEqual(1)
  })

  it('check-in tools include the 4 expected entries', () => {
    const names = CHECKIN_TOOLS.map(t => t.name)
    expect(names).toContain('update_goal')
    expect(names).toContain('add_goal')
    expect(names).toContain('retire_goal')
    expect(names).toContain('acknowledge_no_changes')
  })

  it('every tool has a description', () => {
    for (const t of [...ASSESSMENT_TOOLS, ...CHECKIN_TOOLS]) {
      expect(t.description.length).toBeGreaterThan(10)
    }
  })
})
