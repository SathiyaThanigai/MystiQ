import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { participantApi } from '../lib/api'
import { useSessionStore } from '../lib/store'
import { playSound } from '../lib/sounds'
import { getCaseColor } from '../lib/caseData'
import PageTransition from '../components/ui/PageTransition'
import GlassPanel from '../components/ui/GlassPanel'
import TypewriterText from '../components/ui/TypewriterText'

interface ClueData {
  case_number: number
  theme: string
  color_name: string
  color_hex: string
  icon: string
  clue: string
}

export default function ClueReveal() {
  const navigate = useNavigate()
  const { setSession } = useSessionStore()
  const [clue, setClue] = useState<ClueData | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      try {
        const sessionRes = await participantApi.getSession()
        setSession(sessionRes.data)

        if (!sessionRes.data.case_selected) {
          navigate('/case-unlock')
          return
        }

        const clueRes = await participantApi.getClue()
        setClue(clueRes.data)
        setLoading(false)

        // Reveal animation after a brief pause
        setTimeout(() => {
          setRevealed(true)
          playSound('reveal')
        }, 1500)
      } catch {
        navigate('/')
      }
    }
    init()
  }, [])

  if (loading || !clue) {
    return (
      <PageTransition>
        <div className="min-h-screen flex items-center justify-center">
          <motion.div
            className="w-8 h-8 border-2 border-mystiq-crimson/30 border-t-mystiq-crimson rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
        </div>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 max-w-lg mx-auto">
        {/* Case Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${clue.color_hex}20`, border: `2px solid ${clue.color_hex}40` }}>
              <span className="font-display text-xs font-bold" style={{ color: clue.color_hex }}>{String(clue.case_number).padStart(2, '0')}</span>
            </div>
          </div>
          <p className="font-mono text-xs text-mystiq-text-muted">
            CASE {String(clue.case_number).padStart(2, '0')}
          </p>
          <p
            className="font-display text-sm tracking-widest font-bold mt-1 uppercase"
            style={{ color: clue.color_hex }}
          >
            {clue.theme}
          </p>
          <p className="font-display text-[9px] tracking-[0.2em] text-mystiq-text-muted mt-1 uppercase">
            Case File Unlocked
          </p>
        </motion.div>

        {/* Evidence File Card */}
        <motion.div
          initial={{ opacity: 0, rotateX: -10, y: 30 }}
          animate={{ opacity: 1, rotateX: 0, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="w-full"
        >
          <GlassPanel
            crimson
            animate={false}
            className="p-6 relative overflow-hidden"
          >
            {/* Scan line */}
            <motion.div
              initial={{ top: '0%' }}
              animate={{ top: '100%' }}
              transition={{ duration: 2, delay: 1.5, ease: 'easeInOut' }}
              className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-mystiq-crimson/60 to-transparent pointer-events-none"
              style={{ position: 'absolute' }}
            />

            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full animate-pulse-slow"
                  style={{ backgroundColor: clue.color_hex }}
                />
                <span className="font-display text-[9px] tracking-[0.2em] text-mystiq-text-muted uppercase">
                  Evidence File 001
                </span>
              </div>
              <span className="font-mono text-[9px] text-mystiq-crimson/60">CLASSIFIED</span>
            </div>

            {/* Divider */}
            <div
              className="h-[1px] mb-6 opacity-30"
              style={{ background: `linear-gradient(to right, transparent, ${clue.color_hex}, transparent)` }}
            />

            {/* Clue Content */}
            <div className="min-h-[80px] flex items-center justify-center">
              {revealed ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center"
                >
                  <TypewriterText
                    text={`"${clue.clue}"`}
                    className="text-mystiq-text text-base italic leading-relaxed font-body"
                    speed={50}
                    delay={500}
                  />
                </motion.div>
              ) : (
                <motion.div
                  animate={{ opacity: [0.3, 0.7, 0.3] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="text-center"
                >
                  <p className="font-display text-[10px] tracking-widest text-mystiq-text-muted uppercase">
                    Decrypting Evidence...
                  </p>
                </motion.div>
              )}
            </div>

            {/* Footer stamp */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
              animate={{ opacity: 0.3, scale: 1, rotate: -3 }}
              transition={{ delay: 3, duration: 0.5 }}
              className="absolute bottom-4 right-4"
            >
              <div
                className="px-3 py-1 border-2 rounded font-display text-[8px] tracking-widest uppercase"
                style={{ borderColor: clue.color_hex, color: clue.color_hex }}
              >
                ACTIVE
              </div>
            </motion.div>
          </GlassPanel>
        </motion.div>

        {/* Investigation Status */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 4 }}
          className="text-center mt-8"
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <motion.div
              className="w-2 h-2 rounded-full bg-yellow-500"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
            <p className="font-display text-[10px] tracking-[0.2em] text-yellow-500/80 uppercase">
              Investigation in Progress
            </p>
          </div>
          <p className="text-mystiq-text-muted text-xs max-w-xs mx-auto">
            Follow this clue to begin your physical investigation. Collect four alphanumeric fragments, then return here.
          </p>

          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 5 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/final')}
            className="btn-secondary mt-6 text-[10px]"
          >
            I Have My Codes →
          </motion.button>
        </motion.div>
      </div>
    </PageTransition>
  )
}
