import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface GlassPanelProps {
  children: ReactNode
  className?: string
  crimson?: boolean
  animate?: boolean
  delay?: number
}

export default function GlassPanel({
  children,
  className = '',
  crimson = false,
  animate = true,
  delay = 0,
}: GlassPanelProps) {
  const baseClass = crimson ? 'glass-panel-crimson' : 'glass-panel'

  if (!animate) {
    return (
      <div className={`${baseClass} ${className}`}>
        {children}
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.5,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className={`${baseClass} ${className}`}
    >
      {children}
    </motion.div>
  )
}
