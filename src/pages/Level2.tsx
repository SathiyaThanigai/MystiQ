import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { level2Api } from '../lib/api'
import { playSound } from '../lib/sounds'
import Particles from '../components/effects/Particles'
import PageTransition from '../components/ui/PageTransition'
import GlassPanel from '../components/ui/GlassPanel'

type Stage = 'join' | 'lobby' | 'select-case' | 'reading' | 'attempt1' | 'attempt2' | 'final-attempt' | 'won' | 'lost' | 'answer'

interface CaseFileOption { id: number; name: string; description: string; color_hex: string; taken: boolean }
interface SuspectOption { id: number; name: string; description: string; motive: string }

export default function Level2() {
  const [stage, setStage] = useState<Stage>('join')
  const [sessionToken, setSessionToken] = useState<string | null>(localStorage.getItem('mystiq_l2_session'))
  const [teamName, setTeamName] = useState(localStorage.getItem('mystiq_l2_team') || '')
  const [gameCode, setGameCode] = useState('')
  const [joinTeamName, setJoinTeamName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Game state
  const [caseFiles, setCaseFiles] = useState<CaseFileOption[]>([])
  const [suspects, setSuspects] = useState<SuspectOption[]>([])
  const [timeLeft, setTimeLeft] = useState(0)
  const [timerLabel, setTimerLabel] = useState('')
  const [gameStartTime, setGameStartTime] = useState<string | null>(null)
  const [selectedSuspect, setSelectedSuspect] = useState<number | null>(null)
  const [rank, setRank] = useState<number | null>(null)
  const [answerData, setAnswerData] = useState<any>(null)
  const [answerRevealed, setAnswerRevealed] = useState(false)
  const [waitingCount, setWaitingCount] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Check existing session on mount
  useEffect(() => {
    if (sessionToken) {
      checkSession()
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  const checkSession = async () => {
    try {
      const res = await level2Api.getSession()
      setTeamName(res.data.team_name)
      const s = res.data.stage

      const statusRes = await level2Api.getStatus()
      setGameStartTime(statusRes.data.game_start_time)
      setAnswerRevealed(statusRes.data.answer_revealed)

      if (s === 'select_case') {
        setStage('select-case')
      } else if (s === 'lobby') {
        // Waiting for admin to start
        setStage('lobby')
        startPolling()
      } else if (s === 'reading') {
        setStage('reading'); startReadingTimer(statusRes.data.game_start_time)
      } else if (s === 'attempt1') {
        setStage('attempt1'); startAttemptTimer(statusRes.data.game_start_time, 1)
      } else if (s === 'attempt2') {
        setStage('attempt2'); startAttemptTimer(statusRes.data.game_start_time, 2)
      } else if (s === 'won') {
        setStage('won'); setRank(res.data.rank)
      } else if (s === 'lost') {
        setStage('lost')
      } else if (s === 'final_attempt') {
        setStage('final-attempt')
        loadSuspects()
      }
    } catch {
      localStorage.removeItem('mystiq_l2_session')
      setSessionToken(null)
      setStage('join')
    }
  }

  const startPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        const res = await level2Api.getStatus()
        setWaitingCount(res.data.participants_waiting)
        if (res.data.game_started) {
          if (pollRef.current) clearInterval(pollRef.current)
          setGameStartTime(res.data.game_start_time)
          setStage('reading')
          startReadingTimer(res.data.game_start_time)
          playSound('unlock')
        }
        if (res.data.answer_revealed) setAnswerRevealed(true)
      } catch {}
    }, 3000)
  }

  const startReadingTimer = (startTime: string | null) => {
    if (!startTime) return
    const start = new Date(startTime).getTime()
    const endTime = start + 10 * 60 * 1000 // 10 minutes

    setTimerLabel('READING TIME')
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      const now = Date.now()
      const remaining = Math.max(0, endTime - now)
      setTimeLeft(remaining)
      if (remaining <= 0) {
        if (timerRef.current) clearInterval(timerRef.current)
        setStage('attempt1')
        startAttemptTimer(startTime, 1)
        playSound('unlock')
      }
    }, 100)
  }

  const startAttemptTimer = (startTime: string | null, attempt: number) => {
    if (!startTime) return
    const start = new Date(startTime).getTime()
    // Attempt 1 starts at 10min, ends at 15min. Attempt 2 starts at 15min, ends at 20min.
    const attemptStart = start + (attempt === 1 ? 10 : 15) * 60 * 1000
    const attemptEnd = start + (attempt === 1 ? 15 : 20) * 60 * 1000

    setTimerLabel(attempt === 1 ? 'ATTEMPT 1' : 'FINAL ATTEMPT')
    loadSuspects()

    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      const now = Date.now()
      const remaining = Math.max(0, attemptEnd - now)
      setTimeLeft(remaining)
      if (remaining <= 0) {
        if (timerRef.current) clearInterval(timerRef.current)
        if (attempt === 1) {
          setStage('attempt2')
          startAttemptTimer(startTime, 2)
        } else {
          setStage('lost')
        }
      }
    }, 100)
  }

  const loadSuspects = async () => {
    try {
      const res = await level2Api.getPublicSuspects()
      setSuspects(res.data)
    } catch {}
  }

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const res = await level2Api.join(gameCode.trim(), joinTeamName.trim())
      localStorage.setItem('mystiq_l2_session', res.data.session_token)
      localStorage.setItem('mystiq_l2_team', res.data.team_name)
      setSessionToken(res.data.session_token)
      setTeamName(res.data.team_name)
      setStage('select-case')
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to join.')
    } finally { setLoading(false) }
  }

  const handleSelectCase = async (cfId: number) => {
    try {
      await level2Api.selectCaseFile(cfId)
      setStage('lobby')
      startPolling()
      playSound('click')
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to select.')
    }
  }

  const handleSubmitSuspect = async () => {
    if (!selectedSuspect || loading) return
    setLoading(true)
    setError('')
    try {
      const res = await level2Api.submitAnswer(selectedSuspect)
      if (res.data.correct) {
        setStage('won')
        setRank(res.data.rank)
        playSound('success')
        if (timerRef.current) clearInterval(timerRef.current)
      } else {
        if (res.data.stage === 'attempt2') {
          setStage('attempt2')
          const statusRes = await level2Api.getStatus()
          startAttemptTimer(statusRes.data.game_start_time, 2)
          playSound('incorrect')
        } else if (res.data.stage === 'lost') {
          setStage('lost')
          playSound('reject')
          if (timerRef.current) clearInterval(timerRef.current)
        }
      }
      setSelectedSuspect(null)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Error submitting. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleViewAnswer = async () => {
    try {
      const res = await level2Api.getAnswer()
      setAnswerData(res.data)
      setStage('answer')
    } catch {}
  }

  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000)
    const min = Math.floor(totalSec / 60)
    const sec = totalSec % 60
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  // Load case files when needed
  useEffect(() => {
    if (stage === 'select-case') {
      level2Api.getPublicCaseFiles().then(r => setCaseFiles(r.data)).catch(() => {})
    }
  }, [stage])

  // Poll for answer reveal or final attempt in won/lost state
  useEffect(() => {
    if ((stage === 'won' || stage === 'lost') && !answerRevealed) {
      const interval = setInterval(async () => {
        try {
          const res = await level2Api.getStatus()
          if (res.data.answer_revealed) { setAnswerRevealed(true); clearInterval(interval) }
          if (stage === 'lost' && res.data.final_attempt_open) {
            try {
              const sessRes = await level2Api.getSession()
              if (sessRes.data.stage === 'final_attempt') {
                setStage('final-attempt')
                loadSuspects()
                clearInterval(interval)
              }
            } catch {}
          }
        } catch {
          // Silent fail — will retry on next interval
        }
      }, 4000) // Poll every 4s (not 3s) to reduce server load with 50 users
      return () => clearInterval(interval)
    }
  }, [stage, answerRevealed])

  return (
    <PageTransition>
      <Particles count={20} color="#dc2626" />
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 relative">
        <AnimatePresence mode="wait">

          {/* JOIN */}
          {stage === 'join' && (
            <motion.div key="join" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full max-w-sm">
              <div className="text-center mb-6">
                <h1 className="font-display text-4xl font-black tracking-wider text-glow text-mystiq-crimson">MYSTIQ</h1>
                <p className="font-display text-[9px] tracking-[0.3em] text-mystiq-text-muted mt-2 uppercase">Level 2 — Murder Investigation</p>
              </div>
              <GlassPanel crimson className="p-6">
                <form onSubmit={handleJoin} className="space-y-4">
                  <div>
                    <label className="block font-display text-[9px] tracking-widest text-mystiq-text-muted uppercase mb-2">Session Code</label>
                    <input type="text" value={gameCode} onChange={(e) => setGameCode(e.target.value.toUpperCase())} placeholder="Enter code" className="w-full bg-mystiq-bg/60 border border-mystiq-border/50 rounded px-4 py-3 text-center font-mono text-sm tracking-widest text-mystiq-text placeholder:text-mystiq-text-muted/30 focus:outline-none focus:border-mystiq-crimson/50 transition-all uppercase" autoComplete="off" />
                  </div>
                  <div>
                    <label className="block font-display text-[9px] tracking-widest text-mystiq-text-muted uppercase mb-2">Team Name</label>
                    <input type="text" value={joinTeamName} onChange={(e) => setJoinTeamName(e.target.value)} placeholder="Your team" className="w-full bg-mystiq-bg/60 border border-mystiq-border/50 rounded px-4 py-3 text-sm font-body text-mystiq-text placeholder:text-mystiq-text-muted/30 focus:outline-none focus:border-mystiq-crimson/50 transition-all" autoComplete="off" />
                  </div>
                  {error && <p className="text-red-400 text-xs text-center">{error}</p>}
                  <button type="submit" disabled={loading || !gameCode.trim() || !joinTeamName.trim()} className="btn-primary w-full text-xs">{loading ? 'Joining...' : 'Enter Level 2'}</button>
                </form>
              </GlassPanel>
            </motion.div>
          )}

          {/* LOBBY */}
          {stage === 'lobby' && (
            <motion.div key="lobby" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center max-w-sm w-full">
              <GlassPanel crimson className="p-8">
                <motion.div className="w-16 h-16 mx-auto mb-6 rounded-full border-2 border-mystiq-crimson/30 flex items-center justify-center relative">
                  <motion.div className="absolute inset-0 rounded-full border-2 border-transparent border-t-mystiq-crimson" animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }} />
                  <motion.div className="w-3 h-3 rounded-full bg-mystiq-crimson" animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 2, repeat: Infinity }} />
                </motion.div>
                <p className="font-display text-xs tracking-wider text-mystiq-text uppercase mb-1">Welcome, {teamName}</p>
                <motion.p animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }} className="font-display text-[10px] tracking-[0.2em] text-yellow-500/80 uppercase mt-4">Awaiting Game Start...</motion.p>
                <p className="text-mystiq-text-muted text-[10px] mt-4">{waitingCount} investigators in room</p>
              </GlassPanel>
            </motion.div>
          )}

          {/* SELECT CASE FILE */}
          {stage === 'select-case' && (
            <motion.div key="select-case" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full max-w-md">
              <div className="text-center mb-6">
                <p className="font-display text-sm tracking-[0.2em] text-mystiq-crimson uppercase">Select Your Case File</p>
                <p className="text-mystiq-text-muted text-xs mt-1">Choose the file you've been handed</p>
              </div>
              <div className="space-y-3">
                {caseFiles.map((cf) => (
                  <motion.button key={cf.id} whileHover={!cf.taken ? { scale: 1.02 } : {}} whileTap={!cf.taken ? { scale: 0.98 } : {}} onClick={() => !cf.taken && handleSelectCase(cf.id)} disabled={cf.taken}
                    className={`w-full p-4 rounded-xl border text-left transition-all ${cf.taken ? 'border-mystiq-border/10 opacity-40 cursor-not-allowed' : 'border-mystiq-border/30 bg-mystiq-surface/50 hover:bg-mystiq-panel/80'}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-10 rounded" style={{ backgroundColor: cf.color_hex }} />
                      <div>
                        <p className="font-display text-xs tracking-wider uppercase font-bold" style={{ color: cf.taken ? '#4b5563' : cf.color_hex }}>{cf.name}</p>
                        {cf.description && <p className="text-[9px] text-mystiq-text-muted mt-0.5">{cf.description}</p>}
                      </div>
                      {cf.taken && <span className="ml-auto text-[8px] text-red-400/60 font-display uppercase">Taken</span>}
                    </div>
                  </motion.button>
                ))}
              </div>
              {error && <p className="text-red-400 text-xs text-center mt-3">{error}</p>}
            </motion.div>
          )}

          {/* READING TIMER - FULL SCREEN */}
          {stage === 'reading' && (
            <motion.div key="reading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center text-center">
              <p className="font-display text-[10px] tracking-[0.3em] text-mystiq-text-muted uppercase mb-4">{timerLabel}</p>
              <motion.div className="relative w-56 h-56 flex items-center justify-center">
                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="#2a2a30" strokeWidth="2" />
                  <circle cx="50" cy="50" r="45" fill="none" stroke="#dc2626" strokeWidth="2" strokeDasharray={`${2 * Math.PI * 45}`} strokeDashoffset={`${2 * Math.PI * 45 * (1 - timeLeft / (10 * 60 * 1000))}`} strokeLinecap="round" className="transition-all duration-200" />
                </svg>
                <span className="font-mono text-4xl text-mystiq-text font-bold">{formatTime(timeLeft)}</span>
              </motion.div>
              <p className="text-mystiq-text-muted text-xs mt-6">Read your case file carefully.</p>
              <p className="text-mystiq-text-dim text-[10px] mt-1">Investigation begins when timer ends.</p>
            </motion.div>
          )}

          {/* ATTEMPT 1 & 2 */}
          {(stage === 'attempt1' || stage === 'attempt2') && (
            <motion.div key={stage} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full max-w-md">
              <div className="text-center mb-4">
                <p className="font-display text-[10px] tracking-[0.3em] text-mystiq-crimson uppercase">{timerLabel}</p>
                <p className="font-mono text-2xl text-mystiq-text font-bold mt-2">{formatTime(timeLeft)}</p>
              </div>

              <GlassPanel crimson className="p-4 mb-4">
                <p className="font-display text-[9px] tracking-widest text-mystiq-text-muted uppercase mb-3">Who is the murderer?</p>
                <div className="space-y-2">
                  {suspects.map((s) => (
                    <motion.button key={s.id} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={() => setSelectedSuspect(s.id)}
                      className={`w-full p-3 rounded-lg border text-left transition-all ${selectedSuspect === s.id ? 'border-mystiq-crimson/60 bg-mystiq-crimson/10' : 'border-mystiq-border/30 bg-mystiq-surface/40 hover:border-mystiq-crimson/30'}`}>
                      <p className="text-xs text-mystiq-text font-semibold">{s.name}</p>
                      {s.description && <p className="text-[9px] text-mystiq-text-muted mt-0.5">{s.description}</p>}
                      {s.motive && <p className="text-[9px] text-mystiq-text-dim mt-0.5 italic">{s.motive}</p>}
                    </motion.button>
                  ))}
                </div>
              </GlassPanel>

              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={handleSubmitSuspect} disabled={!selectedSuspect || loading} className="btn-primary w-full text-xs">
                {loading ? 'Verifying...' : 'Submit Answer'}
              </motion.button>
              {stage === 'attempt2' && <p className="text-yellow-400/70 text-[10px] text-center mt-2">⚠ Final attempt — choose wisely</p>}
            </motion.div>
          )}

          {/* FINAL ATTEMPT - No Timer */}
          {stage === 'final-attempt' && (
            <motion.div key="final-attempt" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full max-w-md">
              <div className="text-center mb-4">
                <p className="font-display text-[10px] tracking-[0.3em] text-orange-400 uppercase">Final Attempt</p>
                <p className="text-mystiq-text-muted text-xs mt-1">No time limit — choose carefully</p>
              </div>

              <GlassPanel crimson className="p-4 mb-4">
                <p className="font-display text-[9px] tracking-widest text-mystiq-text-muted uppercase mb-3">Who is the murderer?</p>
                <div className="space-y-2">
                  {suspects.map((s) => (
                    <motion.button key={s.id} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={() => setSelectedSuspect(s.id)}
                      className={`w-full p-3 rounded-lg border text-left transition-all ${selectedSuspect === s.id ? 'border-mystiq-crimson/60 bg-mystiq-crimson/10' : 'border-mystiq-border/30 bg-mystiq-surface/40 hover:border-mystiq-crimson/30'}`}>
                      <p className="text-xs text-mystiq-text font-semibold">{s.name}</p>
                      {s.description && <p className="text-[9px] text-mystiq-text-muted mt-0.5">{s.description}</p>}
                      {s.motive && <p className="text-[9px] text-mystiq-text-dim mt-0.5 italic">{s.motive}</p>}
                    </motion.button>
                  ))}
                </div>
              </GlassPanel>

              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={handleSubmitSuspect} disabled={!selectedSuspect || loading} className="btn-primary w-full text-xs">
                {loading ? 'Verifying...' : 'Submit Final Answer'}
              </motion.button>
            </motion.div>
          )}

          {/* WON */}
          {stage === 'won' && (
            <motion.div key="won" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-center max-w-sm">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 10 }} className="w-24 h-24 mx-auto mb-6 rounded-full border-2 border-green-500/50 flex items-center justify-center">
                <svg className="w-12 h-12 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </motion.div>
              <p className="font-display text-lg tracking-[0.2em] text-green-400 uppercase font-bold">Case Solved!</p>
              {rank && <p className="font-display text-sm text-yellow-400 mt-2">Rank #{rank}</p>}
              <p className="text-mystiq-text-dim text-xs mt-4">Congratulations, investigator.</p>
              {answerRevealed && (
                <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} onClick={handleViewAnswer} className="btn-secondary text-[10px] mt-6">View Full Case Answer</motion.button>
              )}
              <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }} onClick={() => { localStorage.removeItem('mystiq_l2_session'); localStorage.removeItem('mystiq_l2_team'); window.location.href = '/level2' }} className="block mx-auto text-mystiq-text-muted text-[10px] mt-4 hover:text-mystiq-crimson transition-colors">Exit</motion.button>
            </motion.div>
          )}

          {/* LOST */}
          {stage === 'lost' && (
            <motion.div key="lost" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-center max-w-sm">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1, x: [0, -5, 5, -5, 0] }} className="w-24 h-24 mx-auto mb-6 rounded-full border-2 border-red-500/50 flex items-center justify-center">
                <svg className="w-12 h-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </motion.div>
              <p className="font-display text-lg tracking-[0.2em] text-red-400 uppercase font-bold">Case Unsolved</p>
              <p className="text-mystiq-text-dim text-xs mt-4">The investigation ends here.</p>
              {answerRevealed && (
                <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} onClick={handleViewAnswer} className="btn-secondary text-[10px] mt-6">View Full Case Answer</motion.button>
              )}
              <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }} onClick={() => { localStorage.removeItem('mystiq_l2_session'); localStorage.removeItem('mystiq_l2_team'); window.location.href = '/level2' }} className="block mx-auto text-mystiq-text-muted text-[10px] mt-4 hover:text-mystiq-crimson transition-colors">Exit</motion.button>
            </motion.div>
          )}

          {/* ANSWER REVEAL */}
          {stage === 'answer' && answerData && (
            <motion.div key="answer" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full max-w-md">
              <GlassPanel crimson className="p-6">
                <p className="font-display text-xs tracking-[0.2em] text-mystiq-crimson uppercase text-center mb-4">Case Answer Revealed</p>
                {answerData.suspect && (
                  <div className="p-4 rounded-lg border border-red-500/20 bg-red-500/5 mb-4">
                    <p className="font-display text-[9px] tracking-widest text-red-400/70 uppercase mb-1">The Murderer</p>
                    <p className="text-mystiq-text font-semibold">{answerData.suspect.name}</p>
                    {answerData.suspect.description && <p className="text-[10px] text-mystiq-text-muted mt-1">{answerData.suspect.description}</p>}
                    {answerData.suspect.motive && <p className="text-[10px] text-mystiq-text-dim mt-1 italic">Motive: {answerData.suspect.motive}</p>}
                  </div>
                )}
                {answerData.explanation && (
                  <div>
                    <p className="font-display text-[9px] tracking-widest text-mystiq-text-muted uppercase mb-2">Full Explanation</p>
                    <p className="text-xs text-mystiq-text-dim leading-relaxed whitespace-pre-wrap">{answerData.explanation}</p>
                  </div>
                )}
              </GlassPanel>
              <button onClick={() => { localStorage.removeItem('mystiq_l2_session'); localStorage.removeItem('mystiq_l2_team'); window.location.href = '/level2' }} className="btn-secondary w-full text-[10px] mt-4">Exit Investigation</button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  )
}
