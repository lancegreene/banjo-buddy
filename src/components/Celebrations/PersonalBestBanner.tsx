import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  show: boolean
  message: string
  onDismiss: () => void
}

export function PersonalBestBanner({ show, message, onDismiss }: Props) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="personal-best-banner"
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <span className="personal-best-text">{message}</span>
          <button className="personal-best-close" onClick={onDismiss}>x</button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
