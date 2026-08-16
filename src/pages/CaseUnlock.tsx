import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { participantApi } from '../lib/api'
import { useSessionStore } from '../lib/store'
import { playSound } from '../lib/sounds'
import { getCaseColor } from '../lib/caseData'

interface CaseWithStatus {
  id: number
  case_number: number
  theme: string
  color_name: string
  color_hex: string
  icon: string
  taken: boolean
}
import PageTransition from '../components/ui/PageTransition'
import GlassPanel from '../components/ui/GlassPanel'

type Phase = 'intro' | 'select' | 'confirmed'

export default function CaseUnlock() {
  const navigate = useNavigate()
  const { setSession, caseSelected } = useSessionStore()
  const [phase, setPhase] = useState<Phase>('intro')
  const [cases, setCases] = useState<CaseWithStatus[]>([])
  const [selectedCase, setSelectedCase] = useState<CaseWithStatus | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const init = async () => {
      try {
        const sessionRes = await participantApi.getSession()
        setSession(sessionRes.data)

        if (sessionRes.data.case_selected) {
          navigate('/clue')
          return
        }

        if (!sessionRes.data.quiz_completed) {
          navigate('/quiz')
          return
        }

        const casesRes = await participantApi.getCases()
        setCases(casesRes.data)

        // Show intro animation then reveal cards
        setTimeout(() => setPhase('select'), 3000)
      } catch {
        navigate('/')
      }
    }
    init()
  }, [])

  const handleSelectCase = async (caseItem: CaseWithStatus) => {
    if (confirming || caseItem.taken) return
    setSelectedCase(caseItem)
    setConfirming(true)
    setErrorMsg('')
    playSound('click')

    try {
      await participantApi.selectCase(caseItem.id)
      playSound('unlock')
      setPhase('confirmed')

      // Navigate to clue after confirmation animation
      setTimeout(() => {
        navigate('/clue')
      }, 2500)
    } catch (err: any) {
      setConfirming(false)
      setSelectedCase(null)
      if (err?.response?.status === 409) {
        setErrorMsg('This case is already taken! Choose another.')
        // Refresh cases to show updated taken status
        const casesRes = await participantApi.getCases()
        setCases(casesRes.data)
      } else {
        setErrorMsg('Something went wrong. Try again.')
      }
    }
  }

  return (
    <PageTransition>
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 relative max-w-lg mx-auto">
        <AnimatePresence mode="wait">
          {/* Phase 1: Intro Animation */}
          {phase === 'intro' && (
            <motion.div
              key="intro"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="flex flex-col items-center gap-6 text-center"
            >
              {/* Animated lock opening */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 12, delay: 0.3 }}
                className="w-24 h-24 rounded-full border-2 border-mystiq-crimson/40 flex items-center justify-center relative"
              >
                <motion.div
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 0, y: -10 }}
                  transition={{ delay: 1.5, duration: 0.5 }}
                  className="text-3xl"
                >
                  🔒
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 2, duration: 0.5 }}
                  className="absolute text-3xl"
                >
                  🔓
                </motion.div>
                <motion.div
                  initial={{ scale: 1, opacity: 0 }}
                  animate={{ scale: 2, opacity: [0, 0.3, 0] }}
                  transition={{ delay: 2, duration: 1 }}
                  className="absolute inset-0 rounded-full border border-mystiq-crimson"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <p className="font-display text-sm tracking-[0.3em] text-mystiq-crimson uppercase">
                  Case Access Granted
                </p>
                <p className="font-display text-[10px] tracking-[0.2em] text-mystiq-text-muted mt-2 uppercase">
                  Qualification Complete
                </p>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.7 }}
                transition={{ delay: 1.8 }}
                className="text-mystiq-text-dim text-xs mt-4"
              >
                Your investigation identity has been assigned.
              </motion.p>
            </motion.div>
          )}

          {/* Phase 2: Case Selection */}
          {phase === 'select' && (
            <motion.div
              key="select"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full"
            >
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-6"
              >
                <p className="font-display text-xs tracking-[0.3em] text-mystiq-crimson uppercase">
                  Select Your Case Identity
                </p>
                <p className="text-mystiq-text-muted text-xs mt-1">
                  Choose the identity assigned to your team
                </p>
                {errorMsg && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-400 text-xs mt-2"
                  >
                    {errorMsg}
                  </motion.p>
                )}
              </motion.div>

              <div className="grid grid-cols-2 gap-3">
                {cases.map((caseItem, index) => (
                  <motion.button
                    key={caseItem.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.08 }}
                    whileHover={!caseItem.taken ? { scale: 1.03, y: -2 } : {}}
                    whileTap={!caseItem.taken ? { scale: 0.97 } : {}}
                    onClick={() => handleSelectCase(caseItem)}
                    disabled={confirming || caseItem.taken}
                    className={`relative p-4 rounded-xl border transition-all duration-300 text-left ${
                      caseItem.taken
                        ? 'border-mystiq-border/10 bg-mystiq-surface/20 opacity-40 cursor-not-allowed'
                        : selectedCase?.id === caseItem.id
                        ? 'border-opacity-60 shadow-lg'
                        : 'border-mystiq-border/30 bg-mystiq-surface/50 hover:bg-mystiq-panel/80'
                    }`}
                    style={{
                      borderColor: !caseItem.taken && selectedCase?.id === caseItem.id ? caseItem.color_hex : undefined,
                      boxShadow: !caseItem.taken && selectedCase?.id === caseItem.id ? `0 0 20px ${getCaseColor(caseItem.color_hex, 0.2)}` : undefined,
                    }}
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] text-mystiq-text-muted">
                          CASE {String(caseItem.case_number).padStart(2, '0')}
                        </span>
                      </div>
                      <p
                        className="font-display text-[10px] tracking-wider font-bold uppercase"
                        style={{ color: caseItem.taken ? '#4b5563' : caseItem.color_hex }}
                      >
                        {caseItem.theme}
                      </p>
                      <p className="text-[9px] text-mystiq-text-muted uppercase">
                        {caseItem.taken ? (
                          <span className="text-red-400/70">TAKEN</span>
                        ) : (
                          caseItem.color_name
                        )}
                      </p>
                    </div>

                    {/* Taken overlay */}
                    {caseItem.taken && (
                      <div className="absolute inset-0 rounded-xl flex items-center justify-center bg-mystiq-bg/30">
                        <span className="font-display text-[9px] tracking-[0.2em] text-red-400/60 uppercase">
                          Assigned
                        </span>
                      </div>
                    )}

                    {/* Selection glow */}
                    {!caseItem.taken && selectedCase?.id === caseItem.id && (
                      <motion.div
                        layoutId="case-selection"
                        className="absolute inset-0 rounded-xl pointer-events-none"
                        style={{ boxShadow: `inset 0 0 20px ${getCaseColor(caseItem.color_hex, 0.1)}` }}
                      />
                    )}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Phase 3: Confirmed */}
          {phase === 'confirmed' && selectedCase && (
            <motion.div
              key="confirmed"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-6 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 10 }}
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ backgroundColor: getCaseColor(selectedCase.color_hex, 0.1), border: `2px solid ${getCaseColor(selectedCase.color_hex, 0.4)}` }}
              >
                <span className="font-display text-lg font-bold" style={{ color: selectedCase.color_hex }}>{String(selectedCase.case_number).padStart(2, '0')}</span>
              </motion.div>

              <div>
                <p className="font-mono text-xs text-mystiq-text-muted">
                  CASE {String(selectedCase.case_number).padStart(2, '0')}
                </p>
                <p
                  className="font-display text-lg tracking-wider font-bold mt-1 uppercase"
                  style={{ color: selectedCase.color_hex }}
                >
                  {selectedCase.theme}
                </p>
                <p className="font-display text-[10px] tracking-[0.2em] text-mystiq-text-muted mt-2 uppercase">
                  Case File Unlocked
                </p>
              </div>

              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.5 }}
                className="w-32 h-[1px]"
                style={{ background: `linear-gradient(to right, transparent, ${selectedCase.color_hex}, transparent)` }}
              />

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                transition={{ delay: 1 }}
                className="text-xs text-mystiq-text-dim"
              >
                Retrieving first evidence...
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  )
}
