import { motion, useReducedMotion } from 'framer-motion'

export default function ScanLine() {
  const prefersReducedMotion = useReducedMotion()

  if (prefersReducedMotion) return null

  return (
    <motion.div
      className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-mystiq-crimson/60 to-transparent pointer-events-none z-20"
      animate={{
        top: ['0%', '100%', '0%'],
      }}
      transition={{
        duration: 4,
        repeat: Infinity,
        ease: 'linear',
      }}
      aria-hidden="true"
    />
  )
}
