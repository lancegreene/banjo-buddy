// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Coach prompt builders
// Pure: assembles system prompts + tool definitions for assessment/check-in chats
// ─────────────────────────────────────────────────────────────────────────────

import type { Goal, ItemTag } from '../types/coach'
import { CONCEPT_TAGS } from '../data/conceptTags'
import { buildLibraryCatalog } from './itemCatalog'

const PERSONA = `You are a Scruggs-style banjo coach helping an intermediate player. The player has past the beginner stage and is working through bluegrass repertoire — they know basic forward and backward rolls, can play a few songs, but are building tempo, ornament technique, and vocabulary.

Your job is to listen to where they are right now (assessment chat) or where they've been this week (check-in chat) and craft personalized goals that point them at concrete library items they can practice. You speak plainly, like an experienced teacher — encouraging but specific. No filler, no "great question" preambles. Ask probing follow-ups when a player's answer is vague (e.g., "what tempo can you hold that cleanly?" or "what's frustrating right now?").

When proposing goals, prefer specific over general ("Push the forward roll to 110 bpm" beats "Get better at rolls"). Tie each goal to 1–3 concrete library items — real songs, licks, rolls — that the player can practice. Keep goals achievable in 1–3 weeks.

Use the concept taxonomy as your pedagogical vocabulary. Use the library catalog as your menu of practiceable items.`

export interface RecentActivityEntry {
  itemRef: { kind: string; id: string }
  count: number
  lastAt: string
}

export interface PromptContext {
  kind: 'assessment' | 'checkin'
  goals: Goal[]
  itemTags: ItemTag[]
  recentActivity: RecentActivityEntry[]
  lastCheckInSummary?: string
}

export function buildSystemPrompt(ctx: PromptContext): string {
  const catalog = buildLibraryCatalog()
  return [
    PERSONA,
    '',
    '# Concept taxonomy',
    JSON.stringify(CONCEPT_TAGS, null, 2),
    '',
    '# Library catalog',
    JSON.stringify(catalog, null, 2),
    '',
    '# Current user state',
    JSON.stringify({
      goals: ctx.goals,
      itemTags: ctx.itemTags,
      recentActivity: ctx.recentActivity,
      lastCheckInSummary: ctx.lastCheckInSummary,
    }, null, 2),
    '',
    ctx.kind === 'assessment'
      ? '# Mode: Initial assessment\nAfter 4–8 substantive turns, emit a single propose_initial_plan tool call with 5–7 goals (1 focus, 1-2 explore, rest backlog). Then stop. Do NOT emit goal proposals before the user has answered at least 3 questions about their playing.'
      : '# Mode: Weekly check-in\nReference real activity in your opener. After 2–4 turns, emit 0–2 goal-change tool calls (update_goal / add_goal / retire_goal) OR acknowledge_no_changes if nothing should change. Soft cap: do not change more than 2 goals in a single check-in unless the user explicitly asks.',
  ].join('\n')
}

const itemRefSchema = {
  type: 'object',
  oneOf: [
    {
      type: 'object',
      properties: { kind: { const: 'lick' }, id: { type: 'string' } },
      required: ['kind', 'id'],
    },
    {
      type: 'object',
      properties: { kind: { const: 'roll' }, id: { type: 'string' } },
      required: ['kind', 'id'],
    },
    {
      type: 'object',
      properties: { kind: { const: 'chord' }, id: { type: 'string' } },
      required: ['kind', 'id'],
    },
    {
      type: 'object',
      properties: { kind: { const: 'scale' }, id: { type: 'string' } },
      required: ['kind', 'id'],
    },
    {
      type: 'object',
      properties: {
        kind: { const: 'song-section' },
        songId: { type: 'string' },
        sectionId: { type: 'string' },
      },
      required: ['kind', 'songId', 'sectionId'],
    },
  ],
}

const goalDraftSchema = {
  type: 'object',
  required: ['title', 'description', 'status', 'supportingItemRefs', 'conceptTags'],
  properties: {
    title: { type: 'string', description: 'Short goal name, e.g. "Build forward roll fluency"' },
    description: { type: 'string', description: 'One-sentence context for the user, e.g. "You play at 90 bpm cleanly; goal is 110"' },
    status: {
      type: 'string',
      enum: ['focus', 'explore', 'backlog', 'mastered', 'shelved'],
    },
    supportingItemRefs: {
      type: 'array',
      items: itemRefSchema,
      minItems: 1,
      maxItems: 5,
    },
    conceptTags: {
      type: 'array',
      items: { type: 'string' },
      description: 'IDs from the concept taxonomy',
    },
  },
}

export interface CoachTool {
  name: string
  description: string
  input_schema: Record<string, unknown>
}

export const ASSESSMENT_TOOLS: CoachTool[] = [
  {
    name: 'propose_initial_plan',
    description: 'Emit the proposed initial plan after gathering enough context. Triggers UI transition to library tag confirmation step. Emit ONCE per assessment.',
    input_schema: {
      type: 'object',
      required: ['goals'],
      properties: {
        goals: {
          type: 'array',
          items: goalDraftSchema,
          minItems: 3,
          maxItems: 8,
          description: 'A handful of goals: typically 1 focus + 1-2 explore + the rest as backlog.',
        },
      },
    },
  },
]

export const CHECKIN_TOOLS: CoachTool[] = [
  {
    name: 'update_goal',
    description: 'Modify an existing goal. Use to promote/demote status or refresh supportingItemRefs.',
    input_schema: {
      type: 'object',
      required: ['goalId'],
      properties: {
        goalId: { type: 'string' },
        status: {
          type: 'string',
          enum: ['focus', 'explore', 'backlog', 'mastered', 'shelved'],
        },
        title: { type: 'string' },
        description: { type: 'string' },
        supportingItemRefs: {
          type: 'array',
          items: itemRefSchema,
        },
      },
    },
  },
  {
    name: 'add_goal',
    description: 'Add a new goal to the plan.',
    input_schema: {
      type: 'object',
      required: ['goal'],
      properties: { goal: goalDraftSchema },
    },
  },
  {
    name: 'retire_goal',
    description: 'Retire a goal (mark mastered or shelved).',
    input_schema: {
      type: 'object',
      required: ['goalId'],
      properties: {
        goalId: { type: 'string' },
        reason: { type: 'string' },
        outcome: { type: 'string', enum: ['mastered', 'shelved'] },
      },
    },
  },
  {
    name: 'acknowledge_no_changes',
    description: 'Explicit signal that no goal changes are warranted from this check-in.',
    input_schema: { type: 'object', properties: {} },
  },
]
