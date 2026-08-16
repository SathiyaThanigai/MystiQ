import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useSessionStore } from '../lib/store'
import { participantApi } from '../lib/api'
import { playSound } from '../lib/sounds'
import Particles from '../components/effects/Particles'
import PageTransition from '../components/ui/PageTransition'
import GlassPanel from '../components/ui/GlassPanel'

export default function Landing() {
  const navigate = useNavigate()
  const { sessionToken, setJoined, setSession } = useSessionStore()
  const [gameCode, setGameCode] = useState('')
  const [teamName, setTeamName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)

  // If already joined, redirect to lobby or current stage
  useEffect(() => {
    const checkExisting = async () => {
      if (sessionToken) {
        try {
          const res = await participantApi.getSession()
          setSession(res.data)

          // Check if game has started
          const statusRes = await participantApi.getGameStatus()
          const gameRunning = statusRes.data.game_started

          const stage = res.data.stage

          // If game hasn't started, always go to lobby regardless of stage
          if (!gameRunning && stage !== 'completed') {
            navigate('/lobby')
            return
          }

          if (stage === 'lobby') navigate('/lobby')
          else if (stage === 'quiz') navigate('/quiz')
          else if (stage === 'case_unlock') navigate('/case-unlock')
          else if (stage === 'clue' || stage === 'investigation') navigate('/clue')
          else if (stage === 'completed') navigate('/final')
          else navigate('/lobby')
          return
        } catch {
          // Invalid session, stay on landing
        }
      }
      setChecking(false)
    }
    checkExisting()
  }, [])

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!gameCode.trim() || !teamName.trim()) return

    setError('')
    setLoading(true)
    playSound('click')

    try {
      const res = await participantApi.joinGame(gameCode.trim(), teamName.trim())
      setJoined(res.data.session_token, res.data.team_name)
      navigate('/lobby')
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Failed to join. Try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
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
      <Particles count={30} color="#dc2626" />
      <div className="min-h-screen flex flex-col items-center justify-center px-6 relative">
        {/* Investigation board lines */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.15 }}
          transition={{ duration: 2, delay: 0.5 }}
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
        >
          <div className="absolute top-1/4 left-10 w-32 h-[1px] bg-mystiq-crimson/40" />
          <div className="absolute top-1/3 right-12 w-20 h-[1px] bg-mystiq-crimson/30" />
          <div className="absolute bottom-1/3 left-1/4 w-16 h-[1px] bg-mystiq-crimson/20" />
          <div className="absolute top-[20%] left-[15%] w-2 h-2 rounded-full bg-mystiq-crimson/30" />
          <div className="absolute top-[60%] right-[20%] w-1.5 h-1.5 rounded-full bg-mystiq-crimson/25" />
        </motion.div>

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="text-center mb-8"
        >
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            transition={{ duration: 1.5, delay: 0.3 }}
            className="text-mystiq-text-muted font-display text-[9px] tracking-[0.3em] uppercase mb-3"
          >
            Classified Investigation System
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="font-display text-5xl md:text-7xl font-black tracking-wider text-glow text-mystiq-crimson"
          >
            MYSTIQ
          </motion.h1>

          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.8, delay: 1 }}
            className="w-40 h-[1px] mx-auto mt-4 bg-gradient-to-r from-transparent via-mystiq-crimson/60 to-transparent"
          />

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1.2 }}
            className="mt-4 font-display text-[10px] tracking-[0.4em] text-mystiq-text-dim uppercase"
          >
            "Every Clue Matters."
          </motion.p>
        </motion.div>

        {/* Join Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.4 }}
          className="w-full max-w-sm"
        >
          <GlassPanel crimson className="p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-2 h-2 rounded-full bg-mystiq-crimson animate-pulse-slow" />
              <span className="font-display text-[8px] tracking-[0.3em] text-mystiq-text-muted uppercase">
                Enter Investigation Credentials
              </span>
            </div>

            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="block font-display text-[9px] tracking-widest text-mystiq-text-muted uppercase mb-2">
                  Session Code
                </label>
                <input
                  type="text"
                  value={gameCode}
                  onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                  placeholder="Enter code from organizer"
                  className="w-full bg-mystiq-bg/60 border border-mystiq-border/50 rounded px-4 py-3 text-center font-mono text-sm tracking-widest text-mystiq-text placeholder:text-mystiq-text-muted/30 focus:outline-none focus:border-mystiq-crimson/50 transition-all uppercase"
                  autoComplete="off"
                />
              </div>

              <div>
                <label className="block font-display text-[9px] tracking-widest text-mystiq-text-muted uppercase mb-2">
                  Team Name
                </label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Your team's identity"
                  className="w-full bg-mystiq-bg/60 border border-mystiq-border/50 rounded px-4 py-3 text-sm font-body text-mystiq-text placeholder:text-mystiq-text-muted/30 focus:outline-none focus:border-mystiq-crimson/50 transition-all"
                  autoComplete="off"
                />
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-400 text-xs text-center"
                >
                  {error}
                </motion.p>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                type="submit"
                disabled={loading || !gameCode.trim() || !teamName.trim()}
                className="btn-primary w-full text-xs"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <motion.div
                      className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    />
                    Joining...
                  </span>
                ) : (
                  'Enter Investigation'
                )}
              </motion.button>
            </form>
          </GlassPanel>
        </motion.div>

        {/* Bottom badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: 2, duration: 1 }}
          className="absolute bottom-8 flex flex-col items-center gap-2"
        >
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-mystiq-crimson animate-pulse-slow" />
            <span className="font-display text-[8px] tracking-[0.3em] text-mystiq-text-muted uppercase">
              System Active
            </span>
            <div className="w-1.5 h-1.5 rounded-full bg-mystiq-crimson animate-pulse-slow" />
          </div>
        </motion.div>
      </div>
    </PageTransition>
  )
}
