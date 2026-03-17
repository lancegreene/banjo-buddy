import { useState, useEffect } from 'react'
import { getCurrentChallenge, checkChallengeCompletion, type Challenge } from '../../engine/challengeEngine'
import { SKILL_MAP } from '../../data/curriculum'
import { useStore } from '../../store/useStore'

export function ChallengeCard() {
  const user = useStore(s => s.user)
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [completed, setCompleted] = useState(false)

  useEffect(() => {
    const c = getCurrentChallenge()
    setChallenge(c)
    if (user) {
      checkChallengeCompletion(c, user.id).then(setCompleted)
    }
  }, [user])

  if (!challenge) return null

  const skill = SKILL_MAP.get(challenge.skillId)

  return (
    <div className={`challenge-card ${completed ? 'challenge-card-completed' : ''}`}>
      <div className="challenge-card-header">
        <span className="challenge-card-label">Weekly Challenge</span>
        {completed && <span className="challenge-card-check">&#10003;</span>}
      </div>
      <h3 className="challenge-card-title">{challenge.title}</h3>
      <p className="challenge-card-desc">{challenge.description}</p>
      {skill && !completed && (
        <span className="challenge-card-skill">{skill.name}</span>
      )}
    </div>
  )
}
