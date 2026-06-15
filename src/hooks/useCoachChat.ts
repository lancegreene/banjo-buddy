// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — useCoachChat hook
// Orchestrates Anthropic SDK calls, persists transcript + GoalDeltas via store
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useRef, useState } from 'react'
import Anthropic from '@anthropic-ai/sdk'
import { useStore } from '../store/useStore'
import {
  buildSystemPrompt,
  ASSESSMENT_TOOLS,
  CHECKIN_TOOLS,
} from '../engine/coachPrompts'
import type { RecentActivityEntry } from '../engine/coachPrompts'
import { parseToolCall } from '../engine/coachAdapter'
import { db } from '../db/db'
import type {
  CoachMessage,
  GoalDelta,
  CheckInRecord,
} from '../types/coach'

const MODEL = 'claude-sonnet-4-6'
const MAX_TOKENS = 2000
const PER_CONV_BUDGET_USD = 0.5

// Claude Sonnet 4.6 pricing (per million tokens, USD).
const PRICING = {
  inputUncached: 3.0,
  inputCached: 0.30,        // cache reads
  inputCacheWrite: 3.75,    // cache writes (5-min TTL)
  output: 15.0,
}

export type ChatKind = 'assessment' | 'checkin'

export interface UseCoachChatOptions {
  kind: ChatKind
  onComplete: (deltas: GoalDelta[], record: CheckInRecord) => void
}

export interface UseCoachChatResult {
  messages: CoachMessage[]
  isStreaming: boolean
  error: string | null
  cumulativeCost: number
  sendUserMessage: (text: string) => Promise<void>
  start: () => Promise<void>
}

// Strip the bracketed system-bootstrap markers from user-visible transcripts.
const SYSTEM_BOOTSTRAP_PREFIX = '[COACH BOOTSTRAP]'

export function useCoachChat({ kind, onComplete }: UseCoachChatOptions): UseCoachChatResult {
  const apiKey = useStore((s) => s.apiKey)
  const goals = useStore((s) => s.goals)
  const itemTags = useStore((s) => s.itemTags)
  const userId = useStore((s) => s.user?.id)

  const [messages, setMessages] = useState<CoachMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cumulativeCost, setCumulativeCost] = useState(0)
  const startedAt = useRef<string>(new Date().toISOString())

  const sendUserMessage = useCallback(async (text: string) => {
    if (!apiKey) { setError('Missing API key'); return }
    if (!userId) { setError('No user id'); return }
    if (cumulativeCost > PER_CONV_BUDGET_USD) {
      setError(`Conversation cost cap reached ($${PER_CONV_BUDGET_USD.toFixed(2)})`)
      return
    }

    setError(null)
    setIsStreaming(true)

    const isBootstrap = text.startsWith(SYSTEM_BOOTSTRAP_PREFIX)

    // Build the new conversation array.
    // For the bootstrap message, we DON'T add it to user-visible messages but still
    // send it to the model as a user turn so it has something to respond to.
    const newUserMsg: CoachMessage = {
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    }
    const updatedMessages = [...messages, newUserMsg]
    if (!isBootstrap) {
      setMessages(updatedMessages)
    }

    const client = new Anthropic({
      apiKey,
      dangerouslyAllowBrowser: true,
    })

    // Load the last 14 days of practice from Dexie, aggregated into the shape
    // buildSystemPrompt expects. NOTE: SessionItem carries no ItemRef today — only a
    // legacy curriculum `skillId` — so we key activity by skillId with a 'skill' kind.
    // Also note nothing writes sessionItems post-Phase-0 (the logging path was deleted;
    // only sync.ts pulls remote rows), so this returns empty for current users until
    // Phase 5 adds item-keyed practice logging.
    const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
    const items = await db.sessionItems
      .where('completedAt')
      .aboveOrEqual(cutoff)
      .toArray()
    const byKey = new Map<string, RecentActivityEntry>()
    for (const item of items) {
      if (!item.skillId) continue
      const existing = byKey.get(item.skillId)
      if (existing) {
        existing.count += 1
        if (item.completedAt > existing.lastAt) existing.lastAt = item.completedAt
      } else {
        byKey.set(item.skillId, {
          itemRef: { kind: 'skill', id: item.skillId },
          count: 1,
          lastAt: item.completedAt,
        })
      }
    }
    const recentActivity = Array.from(byKey.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)

    const systemPrompt = buildSystemPrompt({
      kind,
      goals,
      itemTags: Object.values(itemTags),
      recentActivity,
    })

    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: [
          {
            type: 'text',
            text: systemPrompt,
            cache_control: { type: 'ephemeral' },
          },
        ],
        tools: (kind === 'assessment' ? ASSESSMENT_TOOLS : CHECKIN_TOOLS) as any,
        messages: updatedMessages.map(m => ({
          role: m.role === 'tool' ? 'user' : m.role,
          content: m.content,
        })) as any,
      })

      // Cost tracking — Anthropic SDK exposes usage fields differently across versions.
      const usage = response.usage as any
      const inputCacheRead = usage?.cache_read_input_tokens ?? 0
      const inputCacheWrite = usage?.cache_creation_input_tokens ?? 0
      const inputUncached = Math.max(
        0,
        (usage?.input_tokens ?? 0) - inputCacheRead - inputCacheWrite,
      )
      const outputTokens = usage?.output_tokens ?? 0
      const cost =
        (inputCacheRead / 1e6) * PRICING.inputCached +
        (inputCacheWrite / 1e6) * PRICING.inputCacheWrite +
        (inputUncached / 1e6) * PRICING.inputUncached +
        (outputTokens / 1e6) * PRICING.output
      setCumulativeCost((c) => c + cost)

      // Process content blocks
      const toolCalls: Array<{ name: string; input: any }> = []
      let assistantText = ''
      for (const block of response.content) {
        if (block.type === 'text') assistantText += block.text
        if (block.type === 'tool_use') {
          toolCalls.push({ name: block.name, input: block.input })
        }
      }

      const assistantMsg: CoachMessage = {
        role: 'assistant',
        content: assistantText,
        timestamp: new Date().toISOString(),
      }
      const allMessages = [...updatedMessages, assistantMsg]
      setMessages(allMessages)

      // If LLM emitted tool calls, parse + finalize
      if (toolCalls.length > 0) {
        const allDeltas: GoalDelta[] = []
        for (const call of toolCalls) {
          allDeltas.push(...parseToolCall(call, userId, goals))
        }
        const record: CheckInRecord = {
          id: crypto.randomUUID(),
          userId,
          kind,
          startedAt: startedAt.current,
          endedAt: new Date().toISOString(),
          transcript: allMessages,
          goalDeltas: allDeltas,
          apiCost: cumulativeCost + cost,
        }
        onComplete(allDeltas, record)
      }
    } catch (e: any) {
      const status = e?.status
      if (status === 401) setError('Invalid API key. Check Settings → Disconnect API key.')
      else if (status === 429) setError('Rate limited. Try again in a moment.')
      else if (status >= 500) setError('Anthropic service error. Try again shortly.')
      else setError(e?.message ?? 'Unknown error contacting Claude')
    } finally {
      setIsStreaming(false)
    }
  }, [apiKey, messages, kind, goals, itemTags, userId, cumulativeCost, onComplete])

  const start = useCallback(async () => {
    startedAt.current = new Date().toISOString()
    setMessages([])
    setCumulativeCost(0)
    setError(null)
    const bootstrap = kind === 'assessment'
      ? `${SYSTEM_BOOTSTRAP_PREFIX} Begin the assessment. Greet the player briefly and ask one focused opening question about their playing.`
      : `${SYSTEM_BOOTSTRAP_PREFIX} Begin the weekly check-in. Open by referencing their recent activity if any.`
    await sendUserMessage(bootstrap)
  }, [kind, sendUserMessage])

  // Internal state keeps the bootstrap kickoff turn (the API requires the first
  // message to be role 'user'), but it's an instruction to the model, not user
  // text — so hide it from the visible transcript.
  const visibleMessages = messages.filter(
    (m) => !m.content.startsWith(SYSTEM_BOOTSTRAP_PREFIX),
  )

  return {
    messages: visibleMessages,
    isStreaming,
    error,
    cumulativeCost,
    sendUserMessage,
    start,
  }
}
