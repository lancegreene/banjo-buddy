import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  className?: string
  delay?: number
}

export function AnimatedCard({ children, className = '', delay = 0 }: Props) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}
