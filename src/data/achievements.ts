// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Achievement Definitions
// ─────────────────────────────────────────────────────────────────────────────

export interface AchievementDef {
  id: string
  title: string
  description: string
  category: 'streak' | 'skills' | 'speed' | 'time' | 'special'
  condition: AchievementCondition
}

export type AchievementCondition =
  | { type: 'streak'; days: number }
  | { type: 'skills_count'; status: string; count: number }
  | { type: 'bpm_record'; bpm: number }
  | { type: 'total_minutes'; minutes: number }
  | { type: 'total_sessions'; count: number }
  | { type: 'total_items'; count: number }

export const ACHIEVEMENTS: AchievementDef[] = [
  // Streak milestones
  { id: 'streak-3', title: 'Getting Started', description: 'Practice 3 days in a row', category: 'streak', condition: { type: 'streak', days: 3 } },
  { id: 'streak-7', title: 'Week Warrior', description: 'Practice 7 days in a row', category: 'streak', condition: { type: 'streak', days: 7 } },
  { id: 'streak-14', title: 'Two-Week Trekker', description: 'Practice 14 days in a row', category: 'streak', condition: { type: 'streak', days: 14 } },
  { id: 'streak-30', title: 'Monthly Master', description: 'Practice 30 days in a row', category: 'streak', condition: { type: 'streak', days: 30 } },

  // Skill counts
  { id: 'skills-10', title: 'First Steps', description: 'Progress or master 10 skills', category: 'skills', condition: { type: 'skills_count', status: 'progressed', count: 10 } },
  { id: 'skills-25', title: 'Quarter Century', description: 'Progress or master 25 skills', category: 'skills', condition: { type: 'skills_count', status: 'progressed', count: 25 } },
  { id: 'skills-50', title: 'Halfway There', description: 'Progress or master 50 skills', category: 'skills', condition: { type: 'skills_count', status: 'progressed', count: 50 } },
  { id: 'skills-100', title: 'Centurion', description: 'Progress or master 100 skills', category: 'skills', condition: { type: 'skills_count', status: 'progressed', count: 100 } },
  { id: 'mastered-10', title: 'Jack of Trades', description: 'Master 10 skills', category: 'skills', condition: { type: 'skills_count', status: 'mastered', count: 10 } },
  { id: 'mastered-25', title: 'Virtuoso Path', description: 'Master 25 skills', category: 'skills', condition: { type: 'skills_count', status: 'mastered', count: 25 } },

  // BPM records
  { id: 'bpm-100', title: 'Triple Digits', description: 'Hit 100 BPM on any skill', category: 'speed', condition: { type: 'bpm_record', bpm: 100 } },
  { id: 'bpm-120', title: 'Picking Up Speed', description: 'Hit 120 BPM on any skill', category: 'speed', condition: { type: 'bpm_record', bpm: 120 } },
  { id: 'bpm-150', title: 'Blazing Fingers', description: 'Hit 150 BPM on any skill', category: 'speed', condition: { type: 'bpm_record', bpm: 150 } },
  { id: 'bpm-180', title: 'Lightning Roll', description: 'Hit 180 BPM on any skill', category: 'speed', condition: { type: 'bpm_record', bpm: 180 } },

  // Total practice time
  { id: 'time-60', title: 'First Hour', description: 'Practice for 60 total minutes', category: 'time', condition: { type: 'total_minutes', minutes: 60 } },
  { id: 'time-300', title: '5 Hours In', description: 'Practice for 5 total hours', category: 'time', condition: { type: 'total_minutes', minutes: 300 } },
  { id: 'time-600', title: '10 Hour Club', description: 'Practice for 10 total hours', category: 'time', condition: { type: 'total_minutes', minutes: 600 } },
  { id: 'time-1500', title: 'Dedicated Picker', description: 'Practice for 25 total hours', category: 'time', condition: { type: 'total_minutes', minutes: 1500 } },

  // Sessions
  { id: 'sessions-10', title: 'Regular Practice', description: 'Complete 10 practice sessions', category: 'special', condition: { type: 'total_sessions', count: 10 } },
  { id: 'sessions-50', title: 'Committed', description: 'Complete 50 practice sessions', category: 'special', condition: { type: 'total_sessions', count: 50 } },
  { id: 'sessions-100', title: 'Century Sessions', description: 'Complete 100 practice sessions', category: 'special', condition: { type: 'total_sessions', count: 100 } },

  // Items
  { id: 'items-50', title: 'Busy Bee', description: 'Complete 50 practice items', category: 'special', condition: { type: 'total_items', count: 50 } },
  { id: 'items-200', title: 'Prolific Picker', description: 'Complete 200 practice items', category: 'special', condition: { type: 'total_items', count: 200 } },
  { id: 'items-500', title: 'Practice Machine', description: 'Complete 500 practice items', category: 'special', condition: { type: 'total_items', count: 500 } },
]

export const ACHIEVEMENT_MAP = new Map(ACHIEVEMENTS.map(a => [a.id, a]))
