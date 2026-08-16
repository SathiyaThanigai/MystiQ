import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAdminStore } from '../../lib/store'
import { level2Api } from '../../lib/api'
import PageTransition from '../../components/ui/PageTransition'
import GlassPanel from '../../components/ui/GlassPanel'
import ConfirmModal from '../../components/ui/ConfirmModal'

type Tab = 'control' | 'cases'

interface CaseFile { id: number; name: string; description: string; color_hex: string; answer_text: string; is_active: boolean }
interface Suspect { id: number; case_file_id: number; name: string; description: string; motive: string; image_url: string; is_correct: boolean; order_index: number }
interface Participant { id: number; team_name: string; case_file: string | null; stage: string; attempt1_correct: boolean | null; attempt2_correct: boolean | null; solved_time: string | null; rank: number | null }

export default function AdminLevel2() {
  const navigate = useNavigate()
  const { isAuthenticated, logout } = useAdminStore()
  const [activeTab, setActiveTab] = useState<Tab>('control')
  const [settings, setSettings] = useState({ lobby_open: false, game_started: false, game_code: '', answer_revealed: false, case_answer_text: '' })
  const [participants, setParticipants] = useState<Participant[]>([])
  const [caseFiles, setCaseFiles] = useState<CaseFile[]>([])
  const [suspects, setSuspects] = useState<Suspect[]>([])
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; title: string; message: string; action: () => void; destructive?: boolean }>({ open: false, title: '', message: '', action: () => {} })

  // Case file form
  const [showCfForm, setShowCfForm] = useState(false)
  const [editingCf, setEditingCf] = useState<CaseFile | null>(null)
  const [cfForm, setCfForm] = useState({ name: '', description: '', color_hex: '#dc2626', answer_text: '' })

  // Expanded case (to show/add suspects)
  const [expandedCaseId, setExpandedCaseId] = useState<number | null>(null)

  // Suspect form
  const [showSuspectForm, setShowSuspectForm] = useState(false)
  const [editingSuspect, setEditingSuspect] = useState<Suspect | null>(null)
  const [suspectForm, setSuspectForm] = useState({ name: '', description: '', motive: '', is_correct: false })

  useEffect(() => {
    if (!isAuthenticated) { navigate('/admin'); return }
    loadData()
  }, [isAuthenticated])

  useEffect(() => {
    const interval = setInterval(() => { if (activeTab === 'control') loadData() }, 5000)
    return () => clearInterval(interval)
  }, [activeTab])

  const loadData = async () => {
    try {
      const [settingsRes, participantsRes, cfRes, suspectRes] = await Promise.all([
        level2Api.getSettings(), level2Api.getParticipants(), level2Api.getCaseFiles(), level2Api.getSuspects()
      ])
      setSettings(settingsRes.data)
      setParticipants(participantsRes.data)
      setCaseFiles(cfRes.data)
      setSuspects(suspectRes.data)
    } catch (err: any) {
      if (err?.response?.status === 401) { logout(); navigate('/admin') }
    }
  }

  const handleSaveCf = async () => {
    if (editingCf) await level2Api.updateCaseFile(editingCf.id, cfForm)
    else await level2Api.createCaseFile(cfForm)
    setShowCfForm(false); setEditingCf(null); setCfForm({ name: '', description: '', color_hex: '#dc2626', answer_text: '' }); loadData()
  }

  const handleSaveSuspect = async () => {
    if (!expandedCaseId) return
    if (editingSuspect) await level2Api.updateSuspect(editingSuspect.id, { ...suspectForm, case_file_id: expandedCaseId })
    else await level2Api.createSuspect({ ...suspectForm, case_file_id: expandedCaseId, order_index: suspects.filter(s => s.case_file_id === expandedCaseId).length })
    setShowSuspectForm(false); setEditingSuspect(null); setSuspectForm({ name: '', description: '', motive: '', is_correct: false }); loadData()
  }

  const getSuspectsForCase = (cfId: number) => suspects.filter(s => s.case_file_id === cfId)

  const tabs: { key: Tab; label: string }[] = [
    { key: 'control', label: 'Control & Rankings' },
    { key: 'cases', label: 'Cases & Suspects' },
  ]

  return (
    <PageTransition>
      <div className="min-h-screen pb-20">
        <div className="sticky top-0 z-40 bg-mystiq-bg/90 backdrop-blur-md border-b border-mystiq-border/30">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="font-display text-sm tracking-[0.15em] text-mystiq-crimson font-bold">MYSTIQ</h1>
              <span className="font-display text-[8px] tracking-[0.2em] text-mystiq-text-muted uppercase">Level 2</span>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/admin/dashboard')} className="font-display text-[9px] tracking-widest text-mystiq-text-muted hover:text-mystiq-crimson transition-colors uppercase">← Level 1</button>
              <button onClick={() => { logout(); navigate('/admin') }} className="font-display text-[9px] tracking-widest text-mystiq-text-muted hover:text-mystiq-crimson transition-colors uppercase">Logout</button>
            </div>
          </div>
          <div className="max-w-6xl mx-auto px-4 flex gap-1 overflow-x-auto pb-2">
            {tabs.map((tab) => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex-shrink-0 px-4 py-2 rounded font-display text-[9px] tracking-widest uppercase transition-all ${activeTab === tab.key ? 'bg-mystiq-crimson/10 text-mystiq-crimson border border-mystiq-crimson/30' : 'text-mystiq-text-muted hover:text-mystiq-text border border-transparent'}`}>{tab.label}</button>
            ))}
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-6">
          <AnimatePresence mode="wait">
            {/* CONTROL TAB */}
            {activeTab === 'control' && (
              <motion.div key="control" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                <GlassPanel crimson className="p-4">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full ${settings.game_started ? 'bg-green-400 animate-pulse' : settings.lobby_open ? 'bg-yellow-400 animate-pulse' : 'bg-mystiq-text-muted'}`} />
                        <span className={`font-display text-[10px] tracking-wider uppercase font-bold ${settings.game_started ? 'text-green-400' : settings.lobby_open ? 'text-yellow-400' : 'text-mystiq-text-muted'}`}>
                          {settings.game_started ? 'GAME LIVE — TIMER RUNNING' : settings.lobby_open ? 'LOBBY OPEN' : 'IDLE'}
                        </span>
                      </div>
                      <span className="font-display text-[9px] text-mystiq-text-muted">{participants.length} teams</span>
                    </div>

                    {settings.lobby_open && !settings.game_started && (
                      <div className="flex items-center justify-center gap-3 py-3 rounded-lg bg-mystiq-bg/40 border border-mystiq-border/20">
                        <span className="font-display text-[9px] tracking-widest text-mystiq-text-muted uppercase">Code:</span>
                        <span className="font-mono text-lg tracking-[0.4em] text-mystiq-crimson font-bold">{settings.game_code}</span>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 justify-center">
                      {!settings.lobby_open && !settings.game_started && (
                        <button onClick={async () => { await level2Api.openLobby(); loadData() }} className="px-5 py-2.5 rounded bg-yellow-600 text-white font-display text-[10px] tracking-widest uppercase hover:bg-yellow-500 transition-colors">Open Lobby</button>
                      )}
                      {settings.lobby_open && !settings.game_started && (
                        <>
                          <button onClick={async () => { await level2Api.closeLobby(); loadData() }} className="px-4 py-2.5 rounded border border-yellow-500/30 text-yellow-400 font-display text-[10px] tracking-widest uppercase hover:bg-yellow-500/10 transition-colors">Close Lobby</button>
                          <button onClick={async () => { await level2Api.startGame(); loadData() }} className="px-5 py-2.5 rounded bg-green-600 text-white font-display text-[10px] tracking-widest uppercase hover:bg-green-500 transition-colors">Start Game (15min Timer)</button>
                        </>
                      )}
                      {settings.game_started && (
                        <button onClick={async () => { await level2Api.stopGame(); loadData() }} className="px-5 py-2.5 rounded bg-red-700 text-white font-display text-[10px] tracking-widest uppercase hover:bg-red-600 transition-colors">Stop Game</button>
                      )}
                      {!settings.answer_revealed && (
                        <button onClick={async () => { await level2Api.revealAnswer(); loadData() }} className="px-4 py-2.5 rounded border border-purple-500/30 text-purple-400 font-display text-[10px] tracking-widest uppercase hover:bg-purple-500/10 transition-colors">Reveal Answer</button>
                      )}
                      {settings.answer_revealed && <span className="text-[9px] text-green-400 font-display tracking-wider uppercase self-center">✓ Answer Revealed</span>}
                      <button onClick={async () => { await level2Api.giveFinalAttempt(); loadData() }} className="px-4 py-2.5 rounded border border-orange-500/30 text-orange-400 font-display text-[10px] tracking-widest uppercase hover:bg-orange-500/10 transition-colors">Final Attempt (No Timer)</button>
                      <button onClick={() => setConfirmModal({ open: true, title: 'Reset Level 2', message: 'Delete all Level 2 participants?', destructive: true, action: async () => { await level2Api.reset(); setConfirmModal({ ...confirmModal, open: false }); loadData() } })} className="px-4 py-2.5 rounded border border-red-500/20 text-red-400/70 font-display text-[10px] tracking-widest uppercase hover:text-red-400 transition-colors">Reset</button>
                    </div>
                  </div>
                </GlassPanel>

                {/* Rankings */}
                <div>
                  <h2 className="font-display text-xs tracking-[0.2em] text-mystiq-text-muted uppercase mb-3">Participants & Rankings</h2>
                  {participants.length === 0 ? (
                    <GlassPanel className="p-6 text-center"><p className="text-mystiq-text-muted text-sm">No participants yet.</p></GlassPanel>
                  ) : (
                    <div className="space-y-2">
                      {participants.map((p) => (
                        <div key={p.id} className="p-3 rounded-lg border border-mystiq-border/20 bg-mystiq-surface/30 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                          <div className="min-w-[30px]">
                            {p.rank ? <span className="font-display text-sm text-yellow-400 font-bold">#{p.rank}</span> : <span className="text-mystiq-text-muted text-[9px]">—</span>}
                          </div>
                          <div className="min-w-[120px]">
                            <p className="font-body text-[11px] text-mystiq-text font-semibold">{p.team_name}</p>
                            {p.case_file && <p className="text-[8px] text-mystiq-text-muted">{p.case_file}</p>}
                          </div>
                          <div className="flex-1">
                            <span className={`font-display text-[9px] tracking-wider uppercase ${p.stage === 'won' ? 'text-green-400' : p.stage === 'lost' ? 'text-red-400' : p.stage === 'attempt2' ? 'text-yellow-400' : 'text-mystiq-text-muted'}`}>
                              {p.stage === 'won' ? '✓ SOLVED' : p.stage === 'lost' ? '✗ FAILED' : p.stage === 'attempt2' ? 'Attempt 2' : p.stage === 'attempt1' || p.stage === 'reading' ? 'In Progress' : p.stage}
                            </span>
                          </div>
                          <div className="min-w-[80px]">
                            {p.solved_time && <span className="font-mono text-[9px] text-green-400/80">{new Date(p.solved_time).toLocaleTimeString()}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* CASES & SUSPECTS TAB */}
            {activeTab === 'cases' && (
              <motion.div key="cases" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display text-xs tracking-[0.2em] text-mystiq-text-muted uppercase">Case Files ({caseFiles.length})</h2>
                  <button onClick={() => { setShowCfForm(true); setEditingCf(null); setCfForm({ name: '', description: '', color_hex: '#dc2626', answer_text: '' }) }} className="btn-secondary text-[9px] py-1.5 px-3">+ Add Case File</button>
                </div>

                {/* New/Edit Case File Form */}
                <AnimatePresence>
                  {showCfForm && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-4">
                      <GlassPanel crimson className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-display text-[9px] tracking-widest text-mystiq-crimson uppercase">{editingCf ? 'Edit' : 'New'} Case File</span>
                          <button onClick={() => setShowCfForm(false)} className="text-mystiq-text-muted hover:text-mystiq-text text-sm">✕</button>
                        </div>
                        <input value={cfForm.name} onChange={(e) => setCfForm({ ...cfForm, name: e.target.value })} placeholder="Case file name..." className="w-full bg-mystiq-bg/60 border border-mystiq-border/30 rounded px-3 py-2 text-xs font-body text-mystiq-text placeholder:text-mystiq-text-muted/30 focus:outline-none focus:border-mystiq-crimson/40" />
                        <textarea value={cfForm.description} onChange={(e) => setCfForm({ ...cfForm, description: e.target.value })} placeholder="Brief description..." className="w-full bg-mystiq-bg/60 border border-mystiq-border/30 rounded px-3 py-2 text-xs font-body text-mystiq-text placeholder:text-mystiq-text-muted/30 focus:outline-none focus:border-mystiq-crimson/40 resize-none h-12" />
                        <div className="flex items-center gap-2">
                          <input type="color" value={cfForm.color_hex} onChange={(e) => setCfForm({ ...cfForm, color_hex: e.target.value })} className="w-8 h-8 rounded border border-mystiq-border/30 cursor-pointer" />
                          <input value={cfForm.color_hex} onChange={(e) => setCfForm({ ...cfForm, color_hex: e.target.value })} className="bg-mystiq-bg/60 border border-mystiq-border/30 rounded px-3 py-1.5 text-xs font-mono text-mystiq-text w-24 focus:outline-none" />
                        </div>
                        <textarea value={cfForm.answer_text} onChange={(e) => setCfForm({ ...cfForm, answer_text: e.target.value })} placeholder="Case answer / explanation (shown after reveal)..." className="w-full bg-mystiq-bg/60 border border-mystiq-border/30 rounded px-3 py-2 text-xs font-body text-mystiq-text placeholder:text-mystiq-text-muted/30 focus:outline-none focus:border-mystiq-crimson/40 resize-none h-16" />
                        <button onClick={handleSaveCf} disabled={!cfForm.name} className="btn-primary text-[9px] py-2 px-4">{editingCf ? 'Update' : 'Create'}</button>
                      </GlassPanel>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Case Files List */}
                <div className="space-y-3">
                  {caseFiles.map((cf) => {
                    const cfSuspects = getSuspectsForCase(cf.id)
                    const isExpanded = expandedCaseId === cf.id
                    return (
                      <div key={cf.id}>
                        <div className="p-4 rounded-lg border border-mystiq-border/20 bg-mystiq-surface/30">
                          <div className="flex items-start gap-3">
                            <div className="w-3 h-12 rounded flex-shrink-0" style={{ backgroundColor: cf.color_hex }} />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-mystiq-text font-semibold">{cf.name}</p>
                              {cf.description && <p className="text-[9px] text-mystiq-text-muted mt-0.5">{cf.description}</p>}
                              <div className="flex gap-3 mt-1.5">
                                <span className="text-[8px] text-mystiq-text-muted">{cfSuspects.length} suspects</span>
                                {cfSuspects.some(s => s.is_correct) && <span className="text-[8px] text-green-400/60">✓ Murderer set</span>}
                                {cf.answer_text && <span className="text-[8px] text-purple-400/60">✓ Answer set</span>}
                              </div>
                            </div>
                            <div className="flex gap-1.5 flex-shrink-0">
                              <button onClick={() => { setExpandedCaseId(isExpanded ? null : cf.id); setShowSuspectForm(false) }} className={`text-[8px] px-2 py-1 rounded border transition-colors ${isExpanded ? 'border-mystiq-crimson/30 text-mystiq-crimson' : 'border-mystiq-border/30 text-mystiq-text-muted hover:text-mystiq-crimson'}`}>
                                {isExpanded ? 'Close' : 'Suspects'}
                              </button>
                              <button onClick={() => { setEditingCf(cf); setCfForm({ name: cf.name, description: cf.description || '', color_hex: cf.color_hex, answer_text: cf.answer_text || '' }); setShowCfForm(true) }} className="text-[8px] px-2 py-1 rounded border border-mystiq-border/30 text-mystiq-text-muted hover:text-blue-400 transition-colors">Edit</button>
                              <button onClick={() => setConfirmModal({ open: true, title: 'Delete', message: `Delete "${cf.name}" and all its suspects?`, destructive: true, action: async () => { await level2Api.deleteCaseFile(cf.id); setConfirmModal({ ...confirmModal, open: false }); loadData() } })} className="text-[8px] px-2 py-1 rounded border border-mystiq-border/30 text-red-400/50 hover:text-red-400 transition-colors">Del</button>
                            </div>
                          </div>
                        </div>

                        {/* Expanded: Suspects for this case */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                              <div className="ml-6 mt-2 space-y-2">
                                {/* Add suspect button */}
                                <button onClick={() => { setShowSuspectForm(true); setEditingSuspect(null); setSuspectForm({ name: '', description: '', motive: '', is_correct: false }) }} className="text-[9px] px-3 py-1.5 rounded border border-dashed border-mystiq-border/30 text-mystiq-text-muted hover:text-mystiq-crimson hover:border-mystiq-crimson/30 transition-colors font-display tracking-wider uppercase w-full">
                                  + Add Suspect
                                </button>

                                {/* Suspect form */}
                                <AnimatePresence>
                                  {showSuspectForm && (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-3 rounded-lg border border-mystiq-crimson/20 bg-mystiq-panel/50 space-y-2">
                                      <input value={suspectForm.name} onChange={(e) => setSuspectForm({ ...suspectForm, name: e.target.value })} placeholder="Suspect name..." className="w-full bg-mystiq-bg/60 border border-mystiq-border/30 rounded px-3 py-1.5 text-xs font-body text-mystiq-text placeholder:text-mystiq-text-muted/30 focus:outline-none focus:border-mystiq-crimson/40" />
                                      <textarea value={suspectForm.description} onChange={(e) => setSuspectForm({ ...suspectForm, description: e.target.value })} placeholder="Profile / background..." className="w-full bg-mystiq-bg/60 border border-mystiq-border/30 rounded px-3 py-1.5 text-xs font-body text-mystiq-text placeholder:text-mystiq-text-muted/30 focus:outline-none focus:border-mystiq-crimson/40 resize-none h-12" />
                                      <input value={suspectForm.motive} onChange={(e) => setSuspectForm({ ...suspectForm, motive: e.target.value })} placeholder="Motive..." className="w-full bg-mystiq-bg/60 border border-mystiq-border/30 rounded px-3 py-1.5 text-xs font-body text-mystiq-text placeholder:text-mystiq-text-muted/30 focus:outline-none focus:border-mystiq-crimson/40" />
                                      <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={suspectForm.is_correct} onChange={(e) => setSuspectForm({ ...suspectForm, is_correct: e.target.checked })} className="accent-mystiq-crimson" />
                                        <span className="text-[9px] text-mystiq-crimson font-display tracking-wider uppercase">This is the murderer</span>
                                      </label>
                                      <div className="flex gap-2">
                                        <button onClick={handleSaveSuspect} disabled={!suspectForm.name} className="btn-primary text-[9px] py-1.5 px-3">{editingSuspect ? 'Update' : 'Add'}</button>
                                        <button onClick={() => { setShowSuspectForm(false); setEditingSuspect(null) }} className="btn-secondary text-[9px] py-1.5 px-3">Cancel</button>
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>

                                {/* Suspects list */}
                                {cfSuspects.map((s) => (
                                  <div key={s.id} className={`p-3 rounded-lg border bg-mystiq-panel/30 ${s.is_correct ? 'border-red-500/30' : 'border-mystiq-border/10'}`}>
                                    <div className="flex items-start justify-between gap-2">
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <p className="text-[10px] text-mystiq-text font-semibold">{s.name}</p>
                                          {s.is_correct && <span className="text-[7px] px-1 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 font-display uppercase">Murderer</span>}
                                        </div>
                                        {s.description && <p className="text-[9px] text-mystiq-text-muted mt-0.5">{s.description}</p>}
                                        {s.motive && <p className="text-[9px] text-mystiq-text-dim italic mt-0.5">Motive: {s.motive}</p>}
                                      </div>
                                      <div className="flex gap-1 flex-shrink-0">
                                        <button onClick={() => { setEditingSuspect(s); setSuspectForm({ name: s.name, description: s.description || '', motive: s.motive || '', is_correct: s.is_correct }); setShowSuspectForm(true) }} className="text-[8px] px-1.5 py-0.5 rounded text-mystiq-text-muted hover:text-blue-400 transition-colors">Edit</button>
                                        <button onClick={() => setConfirmModal({ open: true, title: 'Delete', message: `Delete suspect "${s.name}"?`, destructive: true, action: async () => { await level2Api.deleteSuspect(s.id); setConfirmModal({ ...confirmModal, open: false }); loadData() } })} className="text-[8px] px-1.5 py-0.5 rounded text-red-400/50 hover:text-red-400 transition-colors">Del</button>
                                      </div>
                                    </div>
                                  </div>
                                ))}

                                {cfSuspects.length === 0 && !showSuspectForm && (
                                  <p className="text-[9px] text-mystiq-text-muted text-center py-2">No suspects added yet.</p>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )
                  })}
                </div>

                {caseFiles.length === 0 && (
                  <GlassPanel className="p-6 text-center mt-4">
                    <p className="text-mystiq-text-muted text-sm">No case files yet. Add one to get started.</p>
                  </GlassPanel>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <ConfirmModal isOpen={confirmModal.open} title={confirmModal.title} message={confirmModal.message} onConfirm={confirmModal.action} onCancel={() => setConfirmModal({ ...confirmModal, open: false })} destructive={confirmModal.destructive} confirmLabel="Proceed" />
      </div>
    </PageTransition>
  )
}
