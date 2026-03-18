// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Skill Picker Dropdown
// Select a skill to view its BPM trend chart.
// ─────────────────────────────────────────────────────────────────────────────

import { useStore } from '../../store/useStore'
import { getAllSkills } from '../../data/curriculum'

interface SkillPickerProps {
  value: string | null
  onChange: (skillId: string) => void
}

export function SkillPicker({ value, onChange }: SkillPickerProps) {
  const skillRecords = useStore((s) => s.skillRecords)

  // Only show skills that have been practiced
  const practicedSkills = getAllSkills().filter((s) => {
    const record = skillRecords.get(s.id)
    return record && record.practiceCount > 0
  })

  if (practicedSkills.length === 0) return null

  return (
    <select
      className="skill-picker"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="" disabled>Select a skill...</option>
      {practicedSkills.map((skill) => (
        <option key={skill.id} value={skill.id}>
          {skill.name}
        </option>
      ))}
    </select>
  )
}
