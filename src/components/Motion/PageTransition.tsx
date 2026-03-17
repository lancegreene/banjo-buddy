import { AnimatePresence, motion } from 'framer-motion'
import type { ReactNode } from 'react'

interface Props {
  pageKey: string
  children: ReactNode
}

export function PageTransition({ pageKey, children }: Props) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pageKey}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
