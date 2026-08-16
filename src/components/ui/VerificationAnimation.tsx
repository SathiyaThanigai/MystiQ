import { motion } from 'framer-motion'

interface VerificationAnimationProps {
  onComplete?: () => void
}

export default function VerificationAnimation({ onComplete }: VerificationAnimationProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-mystiq-bg/90 backdrop-blur-sm">
      <div className="relative flex flex-col items-center">
        {/* Rotating ring */}
        <motion.div
          className="w-32 h-32 rounded-full border-2 border-mystiq-crimson/30"
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          <motion.div
            className="absolute top-0 left-1/2 w-2 h-2 -ml-1 bg-mystiq-crimson rounded-full"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        </motion.div>

        {/* Inner pulse */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-mystiq-crimson/10"
          animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.2, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />

        {/* Scan line */}
        <motion.div
          className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-mystiq-crimson to-transparent"
          animate={{ top: ['0%', '100%'] }}
          transition={{ duration: 1.5, repeat: 1, ease: 'easeInOut' }}
          onAnimationComplete={onComplete}
        />

        {/* Center dot */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-mystiq-crimson rounded-full"
          animate={{ scale: [1, 1.5, 1] }}
          transition={{ duration: 0.8, repeat: Infinity }}
        />

        {/* Text */}
        <motion.p
          className="absolute -bottom-16 font-display text-xs tracking-[0.3em] text-mystiq-crimson"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          ANALYZING EVIDENCE...
        </motion.p>
      </div>
    </div>
  )
}
