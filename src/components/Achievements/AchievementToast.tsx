import { motion, AnimatePresence } from 'framer-motion'
import type { AchievementDef } from '../../data/achievements'

interface Props {
  achievement: AchievementDef | null
  onDismiss: () => void
}

export function AchievementToast({ achievement, onDismiss }: Props) {
  return (
    <AnimatePresence>
      {achievement && (
        <motion.div
          className="achievement-toast"
          initial={{ x: 300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 300, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <div className="achievement-toast-icon">★</div>
          <div className="achievement-toast-content">
            <span className="achievement-toast-label">Achievement Unlocked!</span>
            <span className="achievement-toast-title">{achievement.title}</span>
            <span className="achievement-toast-desc">{achievement.description}</span>
          </div>
          <button className="achievement-toast-close" onClick={onDismiss}>x</button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
