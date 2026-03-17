import { useState, useCallback } from 'react'

type CelebrationType = 'confetti' | 'personal-best' | 'milestone' | null

interface CelebrationState {
  type: CelebrationType
  message: string
  title?: string
  description?: string
}

export function useCelebration() {
  const [celebration, setCelebration] = useState<CelebrationState | null>(null)

  const triggerConfetti = useCallback(() => {
    setCelebration({ type: 'confetti', message: '' })
    setTimeout(() => setCelebration(null), 3500)
  }, [])

  const triggerPersonalBest = useCallback((message: string) => {
    setCelebration({ type: 'personal-best', message })
    setTimeout(() => setCelebration(null), 4000)
  }, [])

  const triggerMilestone = useCallback((title: string, description: string) => {
    setCelebration({ type: 'milestone', message: '', title, description })
  }, [])

  const dismiss = useCallback(() => {
    setCelebration(null)
  }, [])

  const checkAndCelebrate = useCallback((params: {
    isNewBestBpm?: boolean
    skillName?: string
    newBpm?: number
    isMastery?: boolean
    streakDays?: number
  }) => {
    if (params.isMastery && params.skillName) {
      triggerMilestone('Skill Mastered!', `You've mastered ${params.skillName}!`)
    } else if (params.isNewBestBpm && params.skillName && params.newBpm) {
      triggerPersonalBest(`New personal best: ${params.newBpm} BPM on ${params.skillName}!`)
    } else if (params.streakDays && [3, 7, 14, 30].includes(params.streakDays)) {
      triggerMilestone(`${params.streakDays}-Day Streak!`, `You've practiced ${params.streakDays} days in a row!`)
    }
  }, [triggerMilestone, triggerPersonalBest])

  return {
    celebration,
    triggerConfetti,
    triggerPersonalBest,
    triggerMilestone,
    dismiss,
    checkAndCelebrate,
  }
}
