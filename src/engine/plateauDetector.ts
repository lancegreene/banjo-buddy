import { db } from '../db/db'
import type { SessionItem } from '../db/db'

export interface PlateauInfo {
  skillId: string
  sessionsAnalyzed: number
  avgScore: number
  avgBpm: number
  weakestMetric: 'rhythm' | 'pitch' | 'tempo' | null
  suggestion: string
}

const PLATEAU_SESSIONS = 5
const IMPROVEMENT_THRESHOLD = 3 // percent

export async function detectPlateaus(
  skillIds: string[],
  lastN: number = 10
): Promise<PlateauInfo[]> {
  const plateaus: PlateauInfo[] = []

  for (const skillId of skillIds) {
    const items = await db.sessionItems
      .where('[skillId+completedAt]')
      .between([skillId, ''], [skillId, '\uffff'])
      .toArray()

    if (items.length < PLATEAU_SESSIONS) continue

    const recent = items
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
      .slice(0, lastN)

    // Check score improvement
    const scores = recent
      .filter(i => i.compositeScore !== null)
      .map(i => i.compositeScore!)

    if (scores.length < PLATEAU_SESSIONS) continue

    const firstHalf = scores.slice(Math.floor(scores.length / 2))
    const secondHalf = scores.slice(0, Math.floor(scores.length / 2))

    const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
    const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length
    const improvement = avgSecond - avgFirst

    // Check BPM improvement
    const bpms = recent
      .filter(i => i.achievedBpm !== null)
      .map(i => i.achievedBpm!)

    const bpmRange = bpms.length >= 2 ? Math.max(...bpms) - Math.min(...bpms) : 999

    if (improvement < IMPROVEMENT_THRESHOLD && bpmRange <= 5) {
      // Find weakest metric
      const weakest = findWeakestMetric(recent)
      const suggestion = generateSuggestion(weakest, avgSecond)

      plateaus.push({
        skillId,
        sessionsAnalyzed: recent.length,
        avgScore: Math.round(avgSecond),
        avgBpm: bpms.length > 0 ? Math.round(bpms.reduce((a, b) => a + b, 0) / bpms.length) : 0,
        weakestMetric: weakest,
        suggestion,
      })
    }
  }

  return plateaus
}

function findWeakestMetric(items: SessionItem[]): 'rhythm' | 'pitch' | 'tempo' | null {
  const metrics = { rhythm: 0, pitch: 0, tempo: 0 }
  const counts = { rhythm: 0, pitch: 0, tempo: 0 }

  for (const item of items) {
    if (item.rhythmScore !== null) { metrics.rhythm += item.rhythmScore; counts.rhythm++ }
    if (item.pitchScore !== null) { metrics.pitch += item.pitchScore; counts.pitch++ }
    if (item.tempoScore !== null) { metrics.tempo += item.tempoScore; counts.tempo++ }
  }

  const avgs: [string, number][] = []
  if (counts.rhythm > 0) avgs.push(['rhythm', metrics.rhythm / counts.rhythm])
  if (counts.pitch > 0) avgs.push(['pitch', metrics.pitch / counts.pitch])
  if (counts.tempo > 0) avgs.push(['tempo', metrics.tempo / counts.tempo])

  if (avgs.length === 0) return null
  avgs.sort((a, b) => a[1] - b[1])
  return avgs[0][0] as 'rhythm' | 'pitch' | 'tempo'
}

function generateSuggestion(weakest: 'rhythm' | 'pitch' | 'tempo' | null, avgScore: number): string {
  if (!weakest) return 'Try practicing at a slower tempo with focus on clean notes.'

  switch (weakest) {
    case 'rhythm':
      return avgScore < 60
        ? 'Focus on rhythm: use the metronome and practice at half speed. Count out loud.'
        : 'Your rhythm needs attention. Try interleaving different tempos to build flexibility.'
    case 'pitch':
      return 'Focus on clean fretting: press firmly behind the fret. Check tuning before each session.'
    case 'tempo':
      return avgScore < 60
        ? 'Slow down! Practice at 60% of your target BPM until evenness improves.'
        : 'Try tempo interleaving: randomize BPM within a range to build adaptability.'
  }
}

export async function getSkillProgressTrend(
  skillId: string,
  lastN: number = 10
): Promise<{ date: string; score: number; bpm: number | null }[]> {
  const items = await db.sessionItems
    .where('[skillId+completedAt]')
    .between([skillId, ''], [skillId, '\uffff'])
    .toArray()

  return items
    .filter(i => i.compositeScore !== null)
    .sort((a, b) => a.completedAt.localeCompare(b.completedAt))
    .slice(-lastN)
    .map(i => ({
      date: i.completedAt.slice(0, 10),
      score: i.compositeScore!,
      bpm: i.achievedBpm,
    }))
}
