import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { participantApi } from '../lib/api'
import { useSessionStore } from '../lib/store'
import { playSound } from '../lib/sounds'
import { getCaseColor } from '../lib/caseData'
import PageTransition from '../components/ui/PageTransition'
import GlassPanel from '../components/ui/GlassPanel'
import VerificationAnimation from '../components/ui/VerificationAnimation'

interface AssignedCase {
  id: number
  case_number: number
  theme: string
  color_name: string
  color_hex: string
  icon: string
}

type Phase = 'loading' | 'enter-code' | 'verifying' | 'success' | 'rejected'

export default function FinalCode() {
  const navigate = useNavigate()
  const { setSession } = useSessionStore()
  const [phase, setPhase] = useState<Phase>('loading')
  const [assignedCase, setAssignedCase] = useState<AssignedCase | null>(null)
  const [code, setCode] = useState('')
  const [attempts, setAttempts] = useState(0)

  useEffect(() => {
    const init = async () => {
      try {
        const sessionRes = await participantApi.getSession()
        setSession(sessionRes.data)

        if (sessionRes.data.code_verified) {
          // Already verified — find the case and show success
          const casesRes = await participantApi.getCases()
          const theCase = casesRes.data.find((c: any) => c.id === sessionRes.data.assigned_case_id)
          if (theCase) setAssignedCase(theCase)
          setPhase('success')
          return
        }

        if (!sessionRes.data.assigned_case_id) {
          // No case assigned yet — send back to case selection
          navigate('/case-unlock')
          return
        }

        setAttempts(sessionRes.data.code_attempts)

        // Get the assigned case details
        const casesRes = await participantApi.getCases()
        const theCase = casesRes.data.find((c: any) => c.id === sessionRes.data.assigned_case_id)
        if (theCase) {
          setAssignedCase(theCase)
          setPhase('enter-code')
        } else {
          navigate('/case-unlock')
        }
      } catch {
        navigate('/')
      }
    }
    init()
  }, [])

  const handleVerify = async () => {
    if (!assignedCase || !code.trim()) return

    setPhase('verifying')
    playSound('verify')

    // Wait for animation
    await new Promise((r) => setTimeout(r, 1500))

    try {
      const res = await participantApi.verifyCode(assignedCase.id, code.trim())

      if (res.data.verified) {
        setPhase('success')
        playSound('success')
      } else {
        setPhase('rejected')
        setAttempts((a) => a + 1)
        playSound('reject')
      }
    } catch {
      setPhase('rejected')
      setAttempts((a) => a + 1)
    }
  }

  if (phase === 'loading') {
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
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 max-w-lg mx-auto relative">
        <AnimatePresence mode="wait">
          {/* Phase: Enter Code */}
          {phase === 'enter-code' && assignedCase && (
            <motion.div
              key="enter"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full flex flex-col items-center"
            >
              <div className="text-center mb-4">
                <p className="font-display text-sm tracking-[0.2em] text-mystiq-crimson uppercase">
                  Final Evidence Verification
                </p>
              </div>

              {/* Assigned case info */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${assignedCase.color_hex}20`, border: `2px solid ${assignedCase.color_hex}40` }}>
                  <span className="font-display text-xs font-bold" style={{ color: assignedCase.color_hex }}>{String(assignedCase.case_number).padStart(2, '0')}</span>
                </div>
                <div>
                  <p className="font-mono text-[10px] text-mystiq-text-muted">
                    CASE {String(assignedCase.case_number).padStart(2, '0')}
                  </p>
                  <p
                    className="font-display text-xs tracking-wider font-bold uppercase"
                    style={{ color: assignedCase.color_hex }}
                  >
                    {assignedCase.theme}
                  </p>
                </div>
              </div>

              <GlassPanel crimson className="w-full p-6">
                <p className="font-display text-[10px] tracking-[0.3em] text-mystiq-crimson/70 text-center uppercase mb-6">
                  Enter Final Code
                </p>

                {/* Code input */}
                <div className="relative mb-6">
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="K7T4M8R2"
                    maxLength={20}
                    autoComplete="off"
                    className="w-full bg-mystiq-bg/60 border border-mystiq-border/50 rounded-lg px-4 py-4 text-center font-mono text-xl tracking-[0.3em] text-mystiq-text placeholder:text-mystiq-text-muted/30 focus:outline-none focus:border-mystiq-crimson/50 focus:ring-1 focus:ring-mystiq-crimson/20 transition-all"
                  />
                </div>

                {attempts > 0 && (
                  <p className="text-center text-mystiq-text-muted text-[10px] mb-4">
                    Attempts: {attempts}
                  </p>
                )}

                {/* Verify button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleVerify}
                  disabled={!code.trim()}
                  className="btn-primary w-full text-xs"
                >
                  Verify Evidence
                </motion.button>
              </GlassPanel>
            </motion.div>
          )}

          {/* Phase: Verifying Animation */}
          {phase === 'verifying' && (
            <VerificationAnimation />
          )}

          {/* Phase: Success */}
          {phase === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-6 text-center px-4"
            >
              {/* Success checkmark */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 10, delay: 0.2 }}
                className="w-24 h-24 rounded-full border-2 border-green-500/50 flex items-center justify-center relative"
              >
                <motion.svg
                  className="w-12 h-12 text-green-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <motion.path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.8, delay: 0.5 }}
                  />
                </motion.svg>

                {/* Pulse rings */}
                <motion.div
                  initial={{ scale: 1, opacity: 0.5 }}
                  animate={{ scale: 2, opacity: 0 }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="absolute inset-0 rounded-full border border-green-500/30"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
              >
                <p className="font-display text-lg tracking-[0.2em] text-green-400 uppercase mb-2">
                  Evidence Verified
                </p>
                <div className="h-[1px] w-32 mx-auto bg-gradient-to-r from-transparent via-green-500/40 to-transparent mb-4" />
                <p className="font-display text-xs tracking-[0.2em] text-mystiq-text-muted uppercase">
                  Case Status
                </p>
                <p className="font-display text-sm tracking-[0.3em] text-green-400 uppercase mt-1 font-bold">
                  Cleared
                </p>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.7 }}
                transition={{ delay: 1.5 }}
                className="text-mystiq-text-dim text-sm"
              >
                You are qualified for the next round.
              </motion.p>

              {/* Stamp effect */}
              <motion.div
                initial={{ opacity: 0, scale: 2, rotate: -15 }}
                animate={{ opacity: 0.15, scale: 1, rotate: -5 }}
                transition={{ delay: 1.2, duration: 0.3 }}
                className="absolute top-1/4 right-8 border-4 border-green-500 rounded px-4 py-2"
              >
                <p className="font-display text-lg tracking-widest text-green-500 uppercase">
                  Cleared
                </p>
              </motion.div>

              {/* Exit button */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2.5 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  localStorage.removeItem('mystiq_session')
                  localStorage.removeItem('mystiq_team')
                  window.location.href = '/'
                }}
                className="btn-secondary text-[10px] mt-4"
              >
                Exit Investigation
              </motion.button>
            </motion.div>
          )}

          {/* Phase: Rejected */}
          {phase === 'rejected' && (
            <motion.div
              key="rejected"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-6 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1, x: [0, -8, 8, -8, 8, 0] }}
                transition={{ duration: 0.6 }}
                className="w-24 h-24 rounded-full border-2 border-red-500/50 flex items-center justify-center"
              >
                <svg className="w-12 h-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </motion.div>

              <div>
                <p className="font-display text-lg tracking-[0.2em] text-red-400 uppercase mb-2">
                  Evidence Rejected
                </p>
                <p className="text-mystiq-text-dim text-sm mt-2">
                  Evidence does not match. Re-examine the case.
                </p>
              </div>

              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => { setPhase('enter-code'); setCode(''); }}
                className="btn-primary text-xs"
              >
                Try Again
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  )
}
