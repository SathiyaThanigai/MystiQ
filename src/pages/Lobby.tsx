import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useSessionStore } from '../lib/store'
import { participantApi } from '../lib/api'
import { playSound } from '../lib/sounds'
import Particles from '../components/effects/Particles'
import PageTransition from '../components/ui/PageTransition'

export default function Lobby() {
  const navigate = useNavigate()
  const { sessionToken, teamName } = useSessionStore()
  const [waitingCount, setWaitingCount] = useState(0)
  const [gameStarted, setGameStarted] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!sessionToken) {
      navigate('/')
      return
    }

    // Poll game status every 2 seconds
    const checkStatus = async () => {
      try {
        const res = await participantApi.getGameStatus()
        setWaitingCount(res.data.participants_waiting)

        if (res.data.game_started) {
          setGameStarted(true)
          playSound('unlock')

          // Wait a moment for the animation, then navigate
          setTimeout(() => {
            navigate('/quiz')
          }, 2000)

          // Stop polling
          if (pollRef.current) clearInterval(pollRef.current)
        }
      } catch {
        // Silent fail — will retry on next poll
      }
    }

    checkStatus()
    pollRef.current = setInterval(checkStatus, 3000)

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [sessionToken])

  return (
    <PageTransition>
      <Particles count={20} color="#dc2626" />
      <div className="min-h-screen flex flex-col items-center justify-center px-6 relative">
        {/* Team name display */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <p className="font-display text-lg tracking-[0.2em] text-mystiq-crimson font-bold">
            MYSTIQ
          </p>
          <div className="w-24 h-[1px] mx-auto mt-2 bg-gradient-to-r from-transparent via-mystiq-crimson/40 to-transparent" />
        </motion.div>

        {/* Waiting panel */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="glass-panel-crimson p-8 max-w-sm w-full text-center"
        >
          {!gameStarted ? (
            <>
              {/* Waiting animation */}
              <motion.div
                className="w-20 h-20 mx-auto mb-6 rounded-full border-2 border-mystiq-crimson/30 flex items-center justify-center relative"
              >
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-transparent border-t-mystiq-crimson"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                />
                <motion.div
                  className="w-3 h-3 rounded-full bg-mystiq-crimson"
                  animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </motion.div>

              <p className="font-display text-[10px] tracking-[0.3em] text-mystiq-text-muted uppercase mb-2">
                Welcome, Investigator
              </p>
              <p className="font-display text-sm tracking-wider text-mystiq-text font-bold uppercase mb-6">
                {teamName || 'Team'}
              </p>

              <div className="h-[1px] w-full bg-mystiq-border/20 mb-6" />

              <motion.p
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="font-display text-[10px] tracking-[0.2em] text-yellow-500/80 uppercase mb-4"
              >
                Awaiting Investigation Start...
              </motion.p>

              <p className="text-mystiq-text-muted text-xs">
                The lead investigator will begin the operation shortly.
              </p>

              {/* Participant count */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="mt-6 pt-4 border-t border-mystiq-border/20"
              >
                <p className="text-mystiq-text-muted text-[10px] font-display tracking-wider">
                  <span className="text-mystiq-crimson font-bold">{waitingCount}</span>{' '}
                  investigator{waitingCount !== 1 ? 's' : ''} in briefing room
                </p>
              </motion.div>
            </>
          ) : (
            <>
              {/* Game starting animation */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 10 }}
                className="w-20 h-20 mx-auto mb-6 rounded-full border-2 border-green-500/50 flex items-center justify-center"
              >
                <motion.svg
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  className="w-10 h-10 text-green-400"
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
                    transition={{ duration: 0.6 }}
                  />
                </motion.svg>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="font-display text-sm tracking-[0.3em] text-green-400 uppercase font-bold"
              >
                Investigation Begins
              </motion.p>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.7 }}
                transition={{ delay: 0.6 }}
                className="text-mystiq-text-dim text-xs mt-2"
              >
                Entering qualification round...
              </motion.p>
            </>
          )}
        </motion.div>

        {/* Bottom status */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8"
        >
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse-slow" />
            <span className="font-display text-[8px] tracking-[0.2em] text-mystiq-text-muted uppercase">
              Standby Mode
            </span>
          </div>
        </motion.div>
      </div>
    </PageTransition>
  )
}
