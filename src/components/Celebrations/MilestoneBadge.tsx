import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  show: boolean
  title: string
  description: string
  onDismiss: () => void
}

export function MilestoneBadge({ show, title, description, onDismiss }: Props) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="milestone-badge-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onDismiss}
        >
          <motion.div
            className="milestone-badge"
            initial={{ scale: 0, rotate: -15 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="milestone-badge-icon">★</div>
            <h3 className="milestone-badge-title">{title}</h3>
            <p className="milestone-badge-desc">{description}</p>
            <button className="btn btn-primary" onClick={onDismiss}>Awesome!</button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
