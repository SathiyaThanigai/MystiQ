import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAdminStore } from '../../lib/store'
import { adminApi } from '../../lib/api'
import PageTransition from '../../components/ui/PageTransition'
import GlassPanel from '../../components/ui/GlassPanel'
import ConfirmModal from '../../components/ui/ConfirmModal'
import { getCaseColor } from '../../lib/caseData'

type Tab = 'live' | 'questions' | 'cases' | 'history'

interface Participant {
  id: number
  session_token: string
  team_name: string
  assigned_case_id: number | null
  case_theme: string | null
  correct_count: number
  wrong_count: number
  quiz_completed: boolean
  case_selected: boolean
  clue_revealed: boolean
  code_verified: boolean
  code_attempts: number
  stage: string
  verification_time: string | null
  created_at: string | null
}

interface Question {
  id: number
  text: string
  options: string[]
  correct_answer: number
  difficulty: string
  category: string | null
  is_active: boolean
  order_index: number
}

interface CaseData {
  id: number
  case_number: number
  theme: string
  color_name: string
  color_hex: string
  icon: string
  first_clue: string | null
  final_code: string | null
  is_active: boolean
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { isAuthenticated, logout } = useAdminStore()
  const [activeTab, setActiveTab] = useState<Tab>('live')
  const [participants, setParticipants] = useState<Participant[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [cases, setCases] = useState<CaseData[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  // Game control
  const [gameStarted, setGameStarted] = useState(false)
  const [lobbyOpen, setLobbyOpen] = useState(false)
  const [gameCode, setGameCode] = useState('')
  const [batchNumber, setBatchNumber] = useState(1)
  const [batchName, setBatchName] = useState('Batch 1')
  const [editBatchName, setEditBatchName] = useState('Batch 1')

  // Modal
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean; title: string; message: string; action: () => void; destructive?: boolean
  }>({ open: false, title: '', message: '', action: () => {} })

  // Question form
  const [showQuestionForm, setShowQuestionForm] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  const [questionForm, setQuestionForm] = useState({
    text: '', options: ['', '', '', ''], correct_answer: 0, difficulty: 'medium', category: ''
  })

  // Case form
  const [editingCase, setEditingCase] = useState<CaseData | null>(null)
  const [caseForm, setCaseForm] = useState({ theme: '', color_name: '', color_hex: '#dc2626', icon: 'blood-drop', first_clue: '', final_code: '' })
  const [showNewCaseForm, setShowNewCaseForm] = useState(false)
  const [newCaseForm, setNewCaseForm] = useState({ case_number: 11, theme: '', color_name: '', color_hex: '#dc2626', icon: 'blood-drop', first_clue: '', final_code: '' })

  useEffect(() => {
    if (!isAuthenticated) { navigate('/admin'); return }
    loadData()
  }, [isAuthenticated, refreshKey])

  // Auto-refresh every 5s for live status
  useEffect(() => {
    const interval = setInterval(() => {
      if (activeTab === 'live') loadData()
    }, 5000)
    return () => clearInterval(interval)
  }, [activeTab])

  const loadData = async () => {
    try {
      const [participantsRes, questionsRes, casesRes, gameRes] = await Promise.all([
        adminApi.getParticipants(),
        adminApi.getQuestions(),
        adminApi.getCases(),
        adminApi.getGameSettings(),
      ])
      setParticipants(participantsRes.data)
      setQuestions(questionsRes.data)
      setCases(casesRes.data)
      setGameStarted(gameRes.data.game_started)
      setGameCode(gameRes.data.game_code)
      setLobbyOpen(gameRes.data.lobby_open)
      setBatchNumber(gameRes.data.batch_number)
      setBatchName(gameRes.data.batch_name)
      setEditBatchName(gameRes.data.batch_name)
    } catch (err: any) {
      if (err?.response?.status === 401) { logout(); navigate('/admin') }
    } finally {
      setLoading(false)
    }
  }

  const refresh = () => setRefreshKey((k) => k + 1)

  const handleStartGame = async () => {
    await adminApi.startGame()
    setGameStarted(true)
    setLobbyOpen(false)
  }

  const handleEndSession = async () => {
    await adminApi.stopGame()
    setGameStarted(false)
    setLobbyOpen(false)
  }

  const handleOpenLobby = async () => {
    const res = await adminApi.openLobby()
    setLobbyOpen(true)
    setGameStarted(false)
    setGameCode(res.data.game_code)
  }

  const handleCloseLobby = async () => {
    await adminApi.closeLobby()
    setLobbyOpen(false)
  }

  const handleNewBatch = () => {
    setConfirmModal({
      open: true, title: 'New Batch',
      message: 'This will clear all current participants and prepare for the next batch. Questions and cases are kept.',
      destructive: true,
      action: async () => {
        await adminApi.newBatch()
        setGameStarted(false)
        setLobbyOpen(false)
        setBatchNumber(b => b + 1)
        setConfirmModal({ ...confirmModal, open: false })
        refresh()
      }
    })
  }

  const handleRegenerateCode = async () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
    await adminApi.updateGameSettings({ game_code: code })
    setGameCode(code)
  }

  const handleResetParticipant = (p: Participant) => {
    setConfirmModal({
      open: true, title: 'Remove Participant',
      message: `Remove "${p.team_name || p.session_token}"?`,
      destructive: true,
      action: async () => { await adminApi.resetParticipant(p.id); setConfirmModal({ ...confirmModal, open: false }); refresh() }
    })
  }

  const handleSaveQuestion = async () => {
    try {
      if (editingQuestion) {
        await adminApi.updateQuestion(editingQuestion.id, { text: questionForm.text, options: questionForm.options, correct_answer: questionForm.correct_answer, difficulty: questionForm.difficulty, category: questionForm.category || null })
      } else {
        await adminApi.createQuestion({ text: questionForm.text, options: questionForm.options, correct_answer: questionForm.correct_answer, difficulty: questionForm.difficulty, category: questionForm.category || null })
      }
      setShowQuestionForm(false); setEditingQuestion(null)
      setQuestionForm({ text: '', options: ['', '', '', ''], correct_answer: 0, difficulty: 'medium', category: '' })
      refresh()
    } catch {}
  }

  const handleSaveCase = async () => {
    if (!editingCase) return
    await adminApi.updateCase(editingCase.id, {
      theme: caseForm.theme || null,
      color_name: caseForm.color_name || null,
      color_hex: caseForm.color_hex || null,
      icon: caseForm.icon || null,
      first_clue: caseForm.first_clue || null,
      final_code: caseForm.final_code || null,
    })
    setEditingCase(null); refresh()
  }

  const handleAddCase = async () => {
    await adminApi.createCase(newCaseForm)
    setShowNewCaseForm(false)
    setNewCaseForm({ case_number: (cases.length > 0 ? Math.max(...cases.map(c => c.case_number)) + 1 : 1), theme: '', color_name: '', color_hex: '#dc2626', icon: 'blood-drop', first_clue: '', final_code: '' })
    refresh()
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'live', label: 'Live Status' },
    { key: 'questions', label: 'Questions' },
    { key: 'cases', label: 'Cases' },
    { key: 'history', label: 'History' },
  ]

  const getStageLabel = (stage: string) => {
    const m: Record<string, string> = { lobby: 'Waiting', quiz: 'Quiz', case_unlock: 'Selecting Case', clue: 'Got Clue', investigation: 'Investigating', completed: 'Completed' }
    return m[stage] || stage
  }
  const getStageColor = (stage: string) => {
    const m: Record<string, string> = { lobby: 'text-yellow-500', quiz: 'text-blue-400', case_unlock: 'text-purple-400', clue: 'text-orange-400', investigation: 'text-orange-400', completed: 'text-green-400' }
    return m[stage] || 'text-mystiq-text-muted'
  }

  return (
    <PageTransition>
      <div className="min-h-screen pb-20">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-mystiq-bg/90 backdrop-blur-md border-b border-mystiq-border/30">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="font-display text-sm tracking-[0.15em] text-mystiq-crimson font-bold">MYSTIQ</h1>
              <span className="font-display text-[8px] tracking-[0.2em] text-mystiq-text-muted uppercase hidden sm:inline">Command Center</span>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={refresh} className="p-2 rounded border border-mystiq-border/30 hover:border-mystiq-crimson/30 transition-colors" title="Refresh">
                <svg className="w-4 h-4 text-mystiq-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              </button>
              <button onClick={() => navigate('/admin/level2')} className="font-display text-[9px] tracking-widest text-purple-400 hover:text-purple-300 transition-colors uppercase">Level 2 →</button>
              <button onClick={() => { logout(); navigate('/admin') }} className="font-display text-[9px] tracking-widest text-mystiq-text-muted hover:text-mystiq-crimson transition-colors uppercase">Logout</button>
            </div>
          </div>
          {/* Tabs */}
          <div className="max-w-6xl mx-auto px-4 flex gap-1 overflow-x-auto pb-2">
            {tabs.map((tab) => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex-shrink-0 px-4 py-2 rounded font-display text-[9px] tracking-widest uppercase transition-all ${activeTab === tab.key ? 'bg-mystiq-crimson/10 text-mystiq-crimson border border-mystiq-crimson/30' : 'text-mystiq-text-muted hover:text-mystiq-text border border-transparent'}`}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-6">
          <AnimatePresence mode="wait">
            {/* ===== LIVE STATUS TAB ===== */}
            {activeTab === 'live' && (
              <motion.div key="live" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">

                {/* Game Control Bar */}
                <GlassPanel crimson className="p-4">
                  <div className="flex flex-col gap-4">
                    {/* Top row: Status + Batch */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full ${gameStarted ? 'bg-green-400 animate-pulse-slow' : lobbyOpen ? 'bg-yellow-400 animate-pulse-slow' : 'bg-mystiq-text-muted'}`} />
                        <span className={`font-display text-[10px] tracking-wider uppercase font-bold ${gameStarted ? 'text-green-400' : lobbyOpen ? 'text-yellow-400' : 'text-mystiq-text-muted'}`}>
                          {gameStarted ? 'GAME LIVE' : lobbyOpen ? 'LOBBY OPEN' : 'IDLE'}
                        </span>
                      </div>
                      <span className="font-display text-[9px] tracking-wider text-mystiq-text-muted uppercase">
                        Batch #{batchNumber}
                      </span>
                    </div>

                    {/* Batch Name */}
                    <div className="flex items-center gap-2">
                      <input value={editBatchName} onChange={(e) => setEditBatchName(e.target.value)} placeholder="Batch name..."
                        className="bg-mystiq-bg/60 border border-mystiq-border/30 rounded px-2 py-1 text-xs font-body text-mystiq-text w-32 focus:outline-none focus:border-mystiq-crimson/40" />
                      {editBatchName !== batchName && (
                        <button onClick={async () => { await adminApi.updateGameSettings({ batch_name: editBatchName }); setBatchName(editBatchName) }} className="text-[8px] px-2 py-1 rounded bg-mystiq-crimson/10 text-mystiq-crimson border border-mystiq-crimson/30 font-display tracking-wider uppercase">Save</button>
                      )}
                    </div>

                    {/* Session code display */}
                    {lobbyOpen && !gameStarted && (
                      <div className="flex items-center justify-center gap-3 py-3 rounded-lg bg-mystiq-bg/40 border border-mystiq-border/20">
                        <span className="font-display text-[9px] tracking-widest text-mystiq-text-muted uppercase">Session Code:</span>
                        <span className="font-mono text-lg tracking-[0.4em] text-mystiq-crimson font-bold">{gameCode}</span>
                        <button onClick={handleRegenerateCode} className="text-[8px] px-2 py-1 rounded bg-mystiq-crimson/10 text-mystiq-crimson border border-mystiq-crimson/30 font-display tracking-wider uppercase hover:bg-mystiq-crimson/20 transition-colors" title="Generate new code">
                          ↻
                        </button>
                      </div>
                    )}

                    {/* Participant count */}
                    <div className="text-center">
                      <span className="font-display text-[9px] text-mystiq-text-muted">
                        <span className="text-mystiq-crimson font-bold text-sm">{participants.length}</span> team{participants.length !== 1 ? 's' : ''} joined
                      </span>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2 justify-center">
                      {/* Step 1: Open Lobby */}
                      {!lobbyOpen && !gameStarted && (
                        <button onClick={handleOpenLobby} className="px-5 py-2.5 rounded bg-yellow-600 text-white font-display text-[10px] tracking-widest uppercase hover:bg-yellow-500 transition-colors">
                          Open Lobby
                        </button>
                      )}

                      {/* Step 2: Close Lobby (optional) */}
                      {lobbyOpen && !gameStarted && (
                        <>
                          <button onClick={handleCloseLobby} className="px-4 py-2.5 rounded border border-yellow-500/30 text-yellow-400 font-display text-[10px] tracking-widest uppercase hover:bg-yellow-500/10 transition-colors">
                            Close Lobby
                          </button>
                          <button onClick={handleStartGame} className="px-5 py-2.5 rounded bg-green-600 text-white font-display text-[10px] tracking-widest uppercase hover:bg-green-500 transition-colors">
                            Start Game
                          </button>
                        </>
                      )}

                      {/* Game running */}
                      {gameStarted && (
                        <button onClick={handleEndSession} className="px-5 py-2.5 rounded bg-red-700 text-white font-display text-[10px] tracking-widest uppercase hover:bg-red-600 transition-colors">
                          End Session
                        </button>
                      )}

                      {/* New Batch - always available */}
                      <button onClick={handleNewBatch} className="px-4 py-2.5 rounded border border-mystiq-border/30 text-mystiq-text-muted font-display text-[10px] tracking-widest uppercase hover:border-mystiq-crimson/30 hover:text-mystiq-crimson transition-colors">
                        New Batch
                      </button>
                    </div>
                  </div>
                </GlassPanel>

                {/* Participants List */}
                <div>
                  <h2 className="font-display text-xs tracking-[0.2em] text-mystiq-text-muted uppercase mb-3">
                    All Participants ({participants.length})
                  </h2>

                  {participants.length === 0 ? (
                    <GlassPanel className="p-8 text-center">
                      <p className="text-mystiq-text-muted text-sm">No teams have joined yet.</p>
                      <p className="text-mystiq-text-muted text-xs mt-1">Session code: <span className="font-mono text-mystiq-crimson">{gameCode}</span></p>
                    </GlassPanel>
                  ) : (
                    <div className="space-y-2">
                      {participants.map((p, i) => {
                        const caseData = cases.find(c => c.id === p.assigned_case_id)
                        return (
                          <motion.div key={p.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
                            className="p-3 rounded-lg border border-mystiq-border/20 bg-mystiq-surface/30 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">

                            {/* Team name + Case */}
                            <div className="flex items-center gap-2 min-w-[150px]">
                              {caseData && <div className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${caseData.color_hex}20`, border: `1px solid ${caseData.color_hex}40` }}><span className="font-mono text-[8px] font-bold" style={{ color: caseData.color_hex }}>{String(caseData.case_number).padStart(2, '0')}</span></div>}
                              <div>
                                <p className="font-body text-[11px] text-mystiq-text font-semibold">{p.team_name || '—'}</p>
                                {caseData && <p className="font-display text-[8px] tracking-wider uppercase" style={{ color: caseData.color_hex }}>{caseData.theme}</p>}
                              </div>
                            </div>

                            {/* Quiz */}
                            <div className="min-w-[70px]">
                              <span className="font-mono text-[10px] text-green-400">{p.correct_count}/5</span>
                              {p.wrong_count > 0 && <span className="font-mono text-[9px] text-red-400/60 ml-1">({p.wrong_count}✗)</span>}
                            </div>

                            {/* Stage */}
                            <div className="flex-1">
                              <span className={`font-display text-[9px] tracking-wider uppercase ${getStageColor(p.stage)}`}>
                                {getStageLabel(p.stage)}
                              </span>
                            </div>

                            {/* Code verified */}
                            <div className="min-w-[90px]">
                              {p.code_verified ? (
                                <span className="text-green-400 text-[9px] font-display tracking-wider uppercase font-bold">✓ Verified</span>
                              ) : p.code_attempts > 0 ? (
                                <span className="text-yellow-400 text-[9px] font-mono">Tries: {p.code_attempts}</span>
                              ) : p.quiz_completed ? (
                                <span className="text-mystiq-text-muted text-[9px]">Pending code</span>
                              ) : (
                                <span className="text-mystiq-text-muted text-[9px]">—</span>
                              )}
                            </div>

                            {/* Time */}
                            <div className="min-w-[70px]">
                              {p.verification_time && <span className="font-mono text-[9px] text-green-400/80">{new Date(p.verification_time).toLocaleTimeString()}</span>}
                            </div>

                            {/* Remove */}
                            <button onClick={() => handleResetParticipant(p)} className="text-[8px] font-display tracking-wider text-red-400/50 hover:text-red-400 transition-colors uppercase">✕</button>
                          </motion.div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ===== QUESTIONS TAB ===== */}
            {activeTab === 'questions' && (
              <motion.div key="questions" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                  <h2 className="font-display text-xs tracking-[0.2em] text-mystiq-text-muted uppercase">Question Bank ({questions.length})</h2>
                  <button onClick={() => { setShowQuestionForm(true); setEditingQuestion(null); setQuestionForm({ text: '', options: ['', '', '', ''], correct_answer: 0, difficulty: 'medium', category: '' }) }} className="btn-secondary text-[9px] py-1.5 px-3">+ Add Question</button>
                </div>

                <AnimatePresence>
                  {showQuestionForm && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-4">
                      <GlassPanel crimson className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-display text-[9px] tracking-widest text-mystiq-crimson uppercase">{editingQuestion ? 'Edit Question' : 'New Question'}</span>
                          <button onClick={() => { setShowQuestionForm(false); setEditingQuestion(null) }} className="text-mystiq-text-muted hover:text-mystiq-text text-sm">✕</button>
                        </div>
                        <textarea value={questionForm.text} onChange={(e) => setQuestionForm({ ...questionForm, text: e.target.value })} placeholder="Question text..." className="w-full bg-mystiq-bg/60 border border-mystiq-border/30 rounded px-3 py-2 text-sm font-body text-mystiq-text placeholder:text-mystiq-text-muted/30 focus:outline-none focus:border-mystiq-crimson/40 resize-none h-20" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {questionForm.options.map((opt, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <input type="radio" name="correct" checked={questionForm.correct_answer === i} onChange={() => setQuestionForm({ ...questionForm, correct_answer: i })} className="accent-mystiq-crimson" />
                              <input value={opt} onChange={(e) => { const opts = [...questionForm.options]; opts[i] = e.target.value; setQuestionForm({ ...questionForm, options: opts }) }} placeholder={`Option ${String.fromCharCode(65 + i)}`} className="flex-1 bg-mystiq-bg/60 border border-mystiq-border/30 rounded px-3 py-1.5 text-xs font-body text-mystiq-text placeholder:text-mystiq-text-muted/30 focus:outline-none focus:border-mystiq-crimson/40" />
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <select value={questionForm.difficulty} onChange={(e) => setQuestionForm({ ...questionForm, difficulty: e.target.value })} className="bg-mystiq-bg/60 border border-mystiq-border/30 rounded px-3 py-1.5 text-xs font-body text-mystiq-text focus:outline-none">
                            <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
                          </select>
                          <input value={questionForm.category} onChange={(e) => setQuestionForm({ ...questionForm, category: e.target.value })} placeholder="Category" className="flex-1 bg-mystiq-bg/60 border border-mystiq-border/30 rounded px-3 py-1.5 text-xs font-body text-mystiq-text placeholder:text-mystiq-text-muted/30 focus:outline-none" />
                        </div>
                        <button onClick={handleSaveQuestion} disabled={!questionForm.text || questionForm.options.some(o => !o)} className="btn-primary text-[9px] py-2 px-4">{editingQuestion ? 'Update' : 'Save'} Question</button>
                      </GlassPanel>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-2">
                  {questions.map((q, i) => (
                    <div key={q.id} className={`p-3 rounded-lg border border-mystiq-border/20 bg-mystiq-surface/30 ${!q.is_active ? 'opacity-40' : ''}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="text-xs text-mystiq-text font-body">{q.text}</p>
                          <div className="flex gap-2 mt-1.5 flex-wrap">
                            <span className={`text-[8px] px-1.5 py-0.5 rounded font-display tracking-wider uppercase ${q.difficulty === 'hard' ? 'text-red-400 bg-red-500/10' : q.difficulty === 'easy' ? 'text-green-400 bg-green-500/10' : 'text-yellow-400 bg-yellow-500/10'}`}>{q.difficulty}</span>
                            {q.category && <span className="text-[8px] px-1.5 py-0.5 rounded bg-mystiq-border/10 text-mystiq-text-muted">{q.category}</span>}
                            <span className="text-[8px] text-green-400/60 font-mono">Ans: {String.fromCharCode(65 + q.correct_answer)}</span>
                          </div>
                        </div>
                        <div className="flex gap-1.5 flex-shrink-0">
                          <button onClick={async () => { await adminApi.updateQuestion(q.id, { is_active: !q.is_active }); refresh() }} className={`text-[8px] px-2 py-1 rounded border transition-colors ${q.is_active ? 'border-green-500/30 text-green-400' : 'border-mystiq-border/30 text-mystiq-text-muted'}`}>{q.is_active ? 'ON' : 'OFF'}</button>
                          <button onClick={() => { setEditingQuestion(q); setQuestionForm({ text: q.text, options: [...q.options], correct_answer: q.correct_answer, difficulty: q.difficulty, category: q.category || '' }); setShowQuestionForm(true) }} className="text-[8px] px-2 py-1 rounded border border-mystiq-border/30 text-mystiq-text-muted hover:text-blue-400 transition-colors">Edit</button>
                          <button onClick={() => { setConfirmModal({ open: true, title: 'Delete', message: `Delete "${q.text.slice(0, 40)}..."?`, destructive: true, action: async () => { await adminApi.deleteQuestion(q.id); setConfirmModal({ ...confirmModal, open: false }); refresh() } }) }} className="text-[8px] px-2 py-1 rounded border border-mystiq-border/30 text-red-400/50 hover:text-red-400 transition-colors">Del</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ===== CASES TAB ===== */}
            {activeTab === 'cases' && (
              <motion.div key="cases" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display text-xs tracking-[0.2em] text-mystiq-text-muted uppercase">Case Management ({cases.length})</h2>
                  <button onClick={() => { setShowNewCaseForm(true); setNewCaseForm({ case_number: (cases.length > 0 ? Math.max(...cases.map(c => c.case_number)) + 1 : 1), theme: '', color_name: '', color_hex: '#dc2626', icon: 'blood-drop', first_clue: '', final_code: '' }) }} className="btn-secondary text-[9px] py-1.5 px-3">+ Add Case</button>
                </div>

                {/* New Case Form */}
                <AnimatePresence>
                  {showNewCaseForm && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-4">
                      <GlassPanel crimson className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-display text-[9px] tracking-widest text-mystiq-crimson uppercase">New Case Identity</span>
                          <button onClick={() => setShowNewCaseForm(false)} className="text-mystiq-text-muted hover:text-mystiq-text text-sm">✕</button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[8px] font-display tracking-widest text-mystiq-text-muted uppercase mb-1">Case Number</label>
                            <input type="number" value={newCaseForm.case_number} onChange={(e) => setNewCaseForm({ ...newCaseForm, case_number: parseInt(e.target.value) || 1 })} className="w-full bg-mystiq-bg/60 border border-mystiq-border/30 rounded px-3 py-1.5 text-xs font-mono text-mystiq-text focus:outline-none focus:border-mystiq-crimson/40" />
                          </div>
                          <div>
                            <label className="block text-[8px] font-display tracking-widest text-mystiq-text-muted uppercase mb-1">Theme Name</label>
                            <input value={newCaseForm.theme} onChange={(e) => setNewCaseForm({ ...newCaseForm, theme: e.target.value.toUpperCase() })} placeholder="e.g. BLOOD EVIDENCE" className="w-full bg-mystiq-bg/60 border border-mystiq-border/30 rounded px-3 py-1.5 text-xs font-body text-mystiq-text placeholder:text-mystiq-text-muted/30 focus:outline-none focus:border-mystiq-crimson/40" />
                          </div>
                          <div>
                            <label className="block text-[8px] font-display tracking-widest text-mystiq-text-muted uppercase mb-1">Color Name</label>
                            <input value={newCaseForm.color_name} onChange={(e) => setNewCaseForm({ ...newCaseForm, color_name: e.target.value })} placeholder="e.g. Crimson Red" className="w-full bg-mystiq-bg/60 border border-mystiq-border/30 rounded px-3 py-1.5 text-xs font-body text-mystiq-text placeholder:text-mystiq-text-muted/30 focus:outline-none focus:border-mystiq-crimson/40" />
                          </div>
                          <div>
                            <label className="block text-[8px] font-display tracking-widest text-mystiq-text-muted uppercase mb-1">Color Hex</label>
                            <div className="flex gap-2 items-center">
                              <input type="color" value={newCaseForm.color_hex} onChange={(e) => setNewCaseForm({ ...newCaseForm, color_hex: e.target.value })} className="w-8 h-8 rounded border border-mystiq-border/30 cursor-pointer" />
                              <input value={newCaseForm.color_hex} onChange={(e) => setNewCaseForm({ ...newCaseForm, color_hex: e.target.value })} className="flex-1 bg-mystiq-bg/60 border border-mystiq-border/30 rounded px-3 py-1.5 text-xs font-mono text-mystiq-text focus:outline-none focus:border-mystiq-crimson/40" />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[8px] font-display tracking-widest text-mystiq-text-muted uppercase mb-1">Final Code</label>
                            <input value={newCaseForm.final_code} onChange={(e) => setNewCaseForm({ ...newCaseForm, final_code: e.target.value.toUpperCase() })} placeholder="e.g. K7T4M8R2" className="w-full bg-mystiq-bg/60 border border-mystiq-border/30 rounded px-3 py-1.5 text-xs font-mono text-mystiq-text placeholder:text-mystiq-text-muted/30 focus:outline-none focus:border-mystiq-crimson/40" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[8px] font-display tracking-widest text-mystiq-text-muted uppercase mb-1">First Clue</label>
                          <textarea value={newCaseForm.first_clue} onChange={(e) => setNewCaseForm({ ...newCaseForm, first_clue: e.target.value })} placeholder="The riddle participants will see..." className="w-full bg-mystiq-bg/60 border border-mystiq-border/30 rounded px-3 py-2 text-xs font-body text-mystiq-text placeholder:text-mystiq-text-muted/30 focus:outline-none focus:border-mystiq-crimson/40 resize-none h-16" />
                        </div>
                        <button onClick={handleAddCase} disabled={!newCaseForm.theme || !newCaseForm.color_name || !newCaseForm.color_hex} className="btn-primary text-[9px] py-2 px-4">Create Case</button>
                      </GlassPanel>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-3">
                  {cases.map((c) => (
                    <div key={c.id}>
                      <GlassPanel animate={false} className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: getCaseColor(c.color_hex, 0.1), border: `1px solid ${getCaseColor(c.color_hex, 0.3)}` }}>
                            <span className="font-display text-xs font-bold" style={{ color: c.color_hex }}>{String(c.case_number).padStart(2, '0')}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] text-mystiq-text-muted">CASE {String(c.case_number).padStart(2, '0')}</span>
                              <span className="font-display text-[10px] tracking-wider font-bold uppercase" style={{ color: c.color_hex }}>{c.theme}</span>
                              <span className="text-[8px] text-mystiq-text-muted">({c.color_name})</span>
                            </div>
                            <div className="mt-2 space-y-1">
                              <p className="text-[10px] text-mystiq-text-dim"><span className="text-mystiq-text-muted">Clue:</span> {c.first_clue || '—'}</p>
                              <p className="text-[10px] text-mystiq-text-dim"><span className="text-mystiq-text-muted">Code:</span> <span className="font-mono text-mystiq-crimson">{c.final_code || '—'}</span></p>
                            </div>
                          </div>
                          <div className="flex gap-1.5 flex-shrink-0">
                            <button onClick={() => { setEditingCase(c); setCaseForm({ theme: c.theme, color_name: c.color_name, color_hex: c.color_hex, icon: c.icon, first_clue: c.first_clue || '', final_code: c.final_code || '' }) }} className="text-[9px] px-2 py-1 rounded border border-mystiq-border/30 text-mystiq-text-muted hover:text-blue-400 hover:border-blue-500/30 transition-colors font-display tracking-wider uppercase">Edit</button>
                            <button onClick={() => { setConfirmModal({ open: true, title: 'Delete Case', message: `Delete CASE ${String(c.case_number).padStart(2, '0')} — ${c.theme}?`, destructive: true, action: async () => { await adminApi.deleteCase(c.id); setConfirmModal({ ...confirmModal, open: false }); refresh() } }) }} className="text-[9px] px-2 py-1 rounded border border-mystiq-border/30 text-red-400/50 hover:text-red-400 hover:border-red-500/30 transition-colors font-display tracking-wider uppercase">Del</button>
                          </div>
                        </div>
                      </GlassPanel>
                      <AnimatePresence>
                        {editingCase?.id === c.id && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                            <div className="p-4 mt-1 rounded-lg border border-mystiq-crimson/20 bg-mystiq-panel/50 space-y-3">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[8px] font-display tracking-widest text-mystiq-text-muted uppercase mb-1">Theme Name</label>
                                  <input value={caseForm.theme} onChange={(e) => setCaseForm({ ...caseForm, theme: e.target.value.toUpperCase() })} className="w-full bg-mystiq-bg/60 border border-mystiq-border/30 rounded px-3 py-1.5 text-xs font-body text-mystiq-text focus:outline-none focus:border-mystiq-crimson/40" />
                                </div>
                                <div>
                                  <label className="block text-[8px] font-display tracking-widest text-mystiq-text-muted uppercase mb-1">Color Name</label>
                                  <input value={caseForm.color_name} onChange={(e) => setCaseForm({ ...caseForm, color_name: e.target.value })} className="w-full bg-mystiq-bg/60 border border-mystiq-border/30 rounded px-3 py-1.5 text-xs font-body text-mystiq-text focus:outline-none focus:border-mystiq-crimson/40" />
                                </div>
                                <div>
                                  <label className="block text-[8px] font-display tracking-widest text-mystiq-text-muted uppercase mb-1">Color Hex</label>
                                  <div className="flex gap-2 items-center">
                                    <input type="color" value={caseForm.color_hex} onChange={(e) => setCaseForm({ ...caseForm, color_hex: e.target.value })} className="w-8 h-8 rounded border border-mystiq-border/30 cursor-pointer" />
                                    <input value={caseForm.color_hex} onChange={(e) => setCaseForm({ ...caseForm, color_hex: e.target.value })} className="flex-1 bg-mystiq-bg/60 border border-mystiq-border/30 rounded px-3 py-1.5 text-xs font-mono text-mystiq-text focus:outline-none focus:border-mystiq-crimson/40" />
                                  </div>
                                </div>
                              </div>
                              <div>
                                <label className="block text-[8px] font-display tracking-widest text-mystiq-text-muted uppercase mb-1">First Clue</label>
                                <textarea value={caseForm.first_clue} onChange={(e) => setCaseForm({ ...caseForm, first_clue: e.target.value })} className="w-full bg-mystiq-bg/60 border border-mystiq-border/30 rounded px-3 py-2 text-xs font-body text-mystiq-text focus:outline-none focus:border-mystiq-crimson/40 resize-none h-16" />
                              </div>
                              <div>
                                <label className="block text-[8px] font-display tracking-widest text-mystiq-text-muted uppercase mb-1">Final Code</label>
                                <input value={caseForm.final_code} onChange={(e) => setCaseForm({ ...caseForm, final_code: e.target.value.toUpperCase() })} className="w-full bg-mystiq-bg/60 border border-mystiq-border/30 rounded px-3 py-1.5 text-xs font-mono text-mystiq-text focus:outline-none focus:border-mystiq-crimson/40" placeholder="e.g. K7T4M8R2" />
                              </div>
                              <div className="flex gap-2">
                                <button onClick={handleSaveCase} className="btn-primary text-[9px] py-1.5 px-4">Save Changes</button>
                                <button onClick={() => setEditingCase(null)} className="btn-secondary text-[9px] py-1.5 px-4">Cancel</button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ===== HISTORY TAB ===== */}
            {activeTab === 'history' && (
              <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <HistoryTab />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <ConfirmModal isOpen={confirmModal.open} title={confirmModal.title} message={confirmModal.message} onConfirm={confirmModal.action} onCancel={() => setConfirmModal({ ...confirmModal, open: false })} destructive={confirmModal.destructive} confirmLabel="Proceed" />
      </div>
    </PageTransition>
  )
}


function HistoryTab() {
  const [history, setHistory] = useState<Record<string, { name: string; participants: any[] }>>({})
  const [loading, setLoading] = useState(true)
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const load = async () => {
    try {
      const res = await adminApi.getBatchHistory()
      setHistory(res.data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (batchNum: string) => {
    await adminApi.deleteBatch(Number(batchNum))
    setConfirmDelete(null)
    setExpandedBatch(null)
    load()
  }

  const batches = Object.keys(history).sort((a, b) => Number(b) - Number(a))

  if (loading) {
    return <div className="text-center py-8"><p className="text-mystiq-text-muted text-sm">Loading history...</p></div>
  }

  if (batches.length === 0) {
    return (
      <div>
        <h2 className="font-display text-xs tracking-[0.2em] text-mystiq-text-muted uppercase mb-4">Batch History</h2>
        <GlassPanel className="p-8 text-center">
          <p className="text-mystiq-text-muted text-sm">No completed batches yet.</p>
          <p className="text-mystiq-text-muted text-xs mt-1">History appears here after you click "New Batch".</p>
        </GlassPanel>
      </div>
    )
  }

  return (
    <div>
      <h2 className="font-display text-xs tracking-[0.2em] text-mystiq-text-muted uppercase mb-4">Batch History</h2>
      <div className="space-y-3">
        {batches.map((batchNum) => {
          const batch = history[batchNum]
          const isExpanded = expandedBatch === batchNum
          const verifiedCount = batch.participants.filter((p: any) => p.code_verified).length

          return (
            <div key={batchNum}>
              {/* Batch card - click to expand */}
              <div
                onClick={() => setExpandedBatch(isExpanded ? null : batchNum)}
                className="p-4 rounded-lg border border-mystiq-border/20 bg-mystiq-surface/30 cursor-pointer hover:border-mystiq-crimson/20 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-display text-[10px] tracking-wider text-mystiq-crimson uppercase font-bold">
                      {batch.name}
                    </span>
                    <span className="text-[9px] text-mystiq-text-muted">
                      {batch.participants.length} teams • {verifiedCount} verified
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmDelete(batchNum) }}
                      className="text-[8px] px-2 py-1 rounded border border-red-500/20 text-red-400/50 hover:text-red-400 hover:border-red-500/40 transition-colors font-display tracking-wider uppercase"
                    >
                      Delete
                    </button>
                    <span className="text-mystiq-text-muted text-sm">{isExpanded ? '▾' : '▸'}</span>
                  </div>
                </div>
              </div>

              {/* Expanded participants */}
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="overflow-hidden mt-1 ml-4 space-y-1.5"
                >
                  {batch.participants.map((p: any, i: number) => (
                    <div key={i} className="p-3 rounded-lg border border-mystiq-border/10 bg-mystiq-panel/30 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                      <div className="min-w-[120px]">
                        <p className="font-body text-[11px] text-mystiq-text font-semibold">{p.team_name || '—'}</p>
                        {p.case_theme && <p className="text-[8px] text-mystiq-text-muted">{p.case_theme}</p>}
                      </div>
                      <div className="min-w-[60px]">
                        <span className="font-mono text-[10px] text-green-400">{p.correct_count}/5</span>
                      </div>
                      <div className="flex-1">
                        <span className={`font-display text-[9px] tracking-wider uppercase ${p.code_verified ? 'text-green-400' : p.quiz_completed ? 'text-yellow-400' : 'text-mystiq-text-muted'}`}>
                          {p.code_verified ? '✓ Verified' : p.quiz_completed ? 'Qualified' : p.stage}
                        </span>
                      </div>
                      <div className="min-w-[80px]">
                        {p.verification_time && (
                          <span className="font-mono text-[9px] text-green-400/80">
                            {new Date(p.verification_time).toLocaleTimeString()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}

              {/* Delete confirmation */}
              {confirmDelete === batchNum && (
                <div className="mt-2 p-3 rounded-lg border border-red-500/20 bg-red-500/5 flex items-center justify-between">
                  <p className="text-red-400 text-[10px]">Delete "{batch.name}" permanently?</p>
                  <div className="flex gap-2">
                    <button onClick={() => setConfirmDelete(null)} className="text-[8px] px-2 py-1 rounded border border-mystiq-border/30 text-mystiq-text-muted font-display tracking-wider uppercase">Cancel</button>
                    <button onClick={() => handleDelete(batchNum)} className="text-[8px] px-2 py-1 rounded bg-red-700 text-white font-display tracking-wider uppercase">Delete</button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
