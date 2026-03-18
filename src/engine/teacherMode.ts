// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Teacher Mode Engine (pure functions)
//
// Filters skills based on teacher configuration. No React, no side effects.
// ─────────────────────────────────────────────────────────────────────────────

import type { Skill } from '../data/curriculum'
import type { UserRole } from '../db/db'

/** For students: filters out disabled skills. For teacher/solo: returns all. */
export function getVisibleSkills(
  allSkills: Skill[],
  role: UserRole,
  disabledSkillIds: Set<string>
): Skill[] {
  if (role === 'student') {
    return allSkills.filter((s) => !disabledSkillIds.has(s.id))
  }
  return allSkills
}

/** Check if a skill is disabled (for teacher UI greying). */
export function isSkillDisabled(skillId: string, disabledSkillIds: Set<string>): boolean {
  return disabledSkillIds.has(skillId)
}

/** Get skill IDs that depend on the given skill (direct dependents). */
export function getAffectedDependents(skillId: string, allSkills: Skill[]): Skill[] {
  return allSkills.filter((s) => s.prerequisites.includes(skillId))
}
