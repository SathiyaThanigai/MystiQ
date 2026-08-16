import { motion } from 'framer-motion'

interface ProgressIndicatorProps {
  current: number
  total: number
  label?: string
}

export default function ProgressIndicator({ current, total, label }: ProgressIndicatorProps) {
  const progress = (current / total) * 100

  return (
    <div className="w-full max-w-xs mx-auto">
      {label && (
        <p className="text-center text-mystiq-text-muted text-xs font-display tracking-widest mb-2 uppercase">
          {label}
        </p>
      )}
      <div className="flex items-center gap-3">
        <span className="font-mono text-mystiq-crimson text-sm font-bold">
          {String(current).padStart(2, '0')}
        </span>
        <div className="flex-1 h-[2px] bg-mystiq-border rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-mystiq-crimson-dark to-mystiq-crimson rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
        <span className="font-mono text-mystiq-text-muted text-sm">
          {String(total).padStart(2, '0')}
        </span>
      </div>
    </div>
  )
}
