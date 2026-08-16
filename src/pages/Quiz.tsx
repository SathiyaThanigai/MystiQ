import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { participantApi } from '../lib/api'
import { useSessionStore } from '../lib/store'
import { playSound } from '../lib/sounds'
import PageTransition from '../components/ui/PageTransition'
import GlassPanel from '../components/ui/GlassPanel'
import ProgressIndicator from '../components/ui/ProgressIndicator'

interface QuestionData {
  id: number
  text: string
  options: string[]
}

type FeedbackState = 'idle' | 'analyzing' | 'correct' | 'incorrect'

export default function Quiz() {
  const navigate = useNavigate()
  const { setSession, correctCount, quizCompleted } = useSessionStore()
  const [question, setQuestion] = useState<QuestionData | null>(null)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<FeedbackState>('idle')
  const [loading, setLoading] = useState(true)
  const [localCorrect, setLocalCorrect] = useState(correctCount)

  const fetchQuestion = useCallback(async () => {
    try {
      setLoading(true)
      const res = await participantApi.getCurrentQuestion()
      if (res.data) {
        setQuestion(res.data)
      } else {
        // Quiz complete
        navigate('/case-unlock')
      }
    } catch (err: any) {
      if (err?.response?.status === 404) {
        navigate('/')
      }
    } finally {
      setLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    const init = async () => {
      try {
        // Sync session
        const sessionRes = await participantApi.getSession()
        setSession(sessionRes.data)

        if (sessionRes.data.quiz_completed) {
          navigate('/case-unlock')
          return
        }

        // Check game started
        const statusRes = await participantApi.getGameStatus()
        if (!statusRes.data.game_started) {
          navigate('/lobby')
          return
        }

        setLocalCorrect(sessionRes.data.correct_count)

        // Start quiz if needed
        await participantApi.startQuiz()
        await fetchQuestion()
      } catch {
        navigate('/')
      }
    }
    init()
  }, [])

  const handleAnswer = async (optionIndex: number) => {
    if (feedback !== 'idle' || !question) return

    setSelectedAnswer(optionIndex)
    setFeedback('analyzing')
    playSound('click')

    // Brief analyzing delay for cinematic effect
    await new Promise((r) => setTimeout(r, 400))

    try {
      const res = await participantApi.submitAnswer(question.id, optionIndex)
      const { correct, correct_count, quiz_completed } = res.data

      if (correct) {
        setFeedback('correct')
        setLocalCorrect(correct_count)
        playSound('correct')
      } else {
        setFeedback('incorrect')
        playSound('incorrect')
      }

      // Wait for feedback display
      await new Promise((r) => setTimeout(r, 800))

      if (quiz_completed) {
        // Sync session and navigate
        const sessionRes = await participantApi.getSession()
        setSession(sessionRes.data)
        navigate('/case-unlock')
        return
      }

      // Load next question
      setFeedback('idle')
      setSelectedAnswer(null)
      await fetchQuestion()
    } catch (err) {
      setFeedback('idle')
      setSelectedAnswer(null)
    }
  }

  return (
    <PageTransition>
      <div className="min-h-screen flex flex-col px-4 py-8 md:py-12 max-w-lg mx-auto relative">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="font-display text-lg tracking-[0.2em] text-mystiq-crimson font-bold">
            MYSTIQ
          </h1>
          <p className="font-display text-[10px] tracking-[0.3em] text-mystiq-text-muted mt-1 uppercase">
            Qualification Round
          </p>
          <p className="font-display text-[9px] tracking-[0.2em] text-mystiq-text-muted mt-1 opacity-60 uppercase">
            Case Access Protocol
          </p>
        </motion.div>

        {/* Progress */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <ProgressIndicator current={localCorrect} total={5} label="Evidence Confirmed" />
        </motion.div>

        {/* Question Area */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex items-center justify-center"
            >
              <div className="flex flex-col items-center gap-3">
                <motion.div
                  className="w-8 h-8 border-2 border-mystiq-crimson/30 border-t-mystiq-crimson rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
                <p className="font-display text-[10px] tracking-widest text-mystiq-text-muted">
                  LOADING EVIDENCE...
                </p>
              </div>
            </motion.div>
          ) : question ? (
            <motion.div
              key={question.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4 }}
              className="flex-1 flex flex-col"
            >
              {/* Question Panel */}
              <GlassPanel crimson className="p-6 mb-6 relative overflow-hidden">
                {/* Scan line effect */}
                <motion.div
                  className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-mystiq-crimson/40 to-transparent"
                  animate={{ top: ['0%', '100%'] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                />

                <p className="font-display text-[9px] tracking-[0.3em] text-mystiq-crimson/70 uppercase mb-4">
                  Evidence Query {String(localCorrect + 1).padStart(2, '0')}
                </p>
                <p className="text-mystiq-text text-base md:text-lg leading-relaxed font-body">
                  "{question.text}"
                </p>
              </GlassPanel>

              {/* Options */}
              <div className="space-y-3 mb-6">
                {question.options.map((option, index) => (
                  <motion.button
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index + 0.3 }}
                    whileHover={feedback === 'idle' ? { scale: 1.01, x: 4 } : {}}
                    whileTap={feedback === 'idle' ? { scale: 0.98 } : {}}
                    onClick={() => handleAnswer(index)}
                    disabled={feedback !== 'idle'}
                    className={`w-full text-left p-4 rounded-lg border transition-all duration-300 relative overflow-hidden group ${
                      selectedAnswer === index
                        ? feedback === 'correct'
                          ? 'border-green-500/50 bg-green-500/10'
                          : feedback === 'incorrect'
                          ? 'border-red-500/50 bg-red-500/10'
                          : 'border-mystiq-crimson/50 bg-mystiq-crimson/10'
                        : 'border-mystiq-border/50 bg-mystiq-surface/50 hover:border-mystiq-crimson/30 hover:bg-mystiq-panel/80'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex-shrink-0 w-7 h-7 rounded border border-mystiq-border/60 flex items-center justify-center font-mono text-xs text-mystiq-text-muted group-hover:border-mystiq-crimson/40 group-hover:text-mystiq-crimson transition-colors">
                        {String.fromCharCode(65 + index)}
                      </span>
                      <span className="text-sm text-mystiq-text font-body">{option}</span>
                    </div>

                    {/* Hover glow */}
                    {feedback === 'idle' && (
                      <div className="absolute inset-0 bg-gradient-to-r from-mystiq-crimson/0 via-mystiq-crimson/5 to-mystiq-crimson/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    )}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Feedback Overlay */}
        <AnimatePresence>
          {feedback === 'analyzing' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-mystiq-bg/60 backdrop-blur-sm"
            >
              <motion.div className="flex flex-col items-center gap-4">
                <motion.div
                  className="w-16 h-16 border-2 border-mystiq-crimson/40 rounded-full relative"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                >
                  <div className="absolute top-0 left-1/2 -ml-1 w-2 h-2 bg-mystiq-crimson rounded-full" />
                </motion.div>
                <p className="font-display text-[10px] tracking-[0.3em] text-mystiq-crimson">
                  ANALYZING EVIDENCE...
                </p>
              </motion.div>
            </motion.div>
          )}

          {feedback === 'correct' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-mystiq-bg/60 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="flex flex-col items-center gap-4"
              >
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', damping: 15 }}
                  className="w-16 h-16 rounded-full border-2 border-green-500/50 flex items-center justify-center"
                >
                  <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </motion.div>
                <p className="font-display text-xs tracking-[0.3em] text-green-400 uppercase">
                  Evidence Confirmed
                </p>
              </motion.div>
            </motion.div>
          )}

          {feedback === 'incorrect' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-mystiq-bg/60 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="flex flex-col items-center gap-4"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1, x: [0, -5, 5, -5, 5, 0] }}
                  transition={{ duration: 0.5 }}
                  className="w-16 h-16 rounded-full border-2 border-red-500/50 flex items-center justify-center"
                >
                  <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </motion.div>
                <p className="font-display text-xs tracking-[0.3em] text-red-400 uppercase">
                  Evidence Inconsistent
                </p>
                <p className="text-mystiq-text-muted text-xs">Continue the investigation.</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  )
}
