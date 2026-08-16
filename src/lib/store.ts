import { create } from 'zustand'

interface SessionState {
  sessionToken: string | null
  teamName: string | null
  stage: string
  correctCount: number
  wrongCount: number
  currentQuestionIndex: number
  quizCompleted: boolean
  caseSelected: boolean
  assignedCaseId: number | null
  clueRevealed: boolean
  codeVerified: boolean
  codeAttempts: number
  soundEnabled: boolean

  setSession: (data: any) => void
  setJoined: (token: string, teamName: string) => void
  setSoundEnabled: (enabled: boolean) => void
  reset: () => void
}

export const useSessionStore = create<SessionState>((set) => ({
  sessionToken: localStorage.getItem('mystiq_session'),
  teamName: localStorage.getItem('mystiq_team'),
  stage: 'landing',
  correctCount: 0,
  wrongCount: 0,
  currentQuestionIndex: 0,
  quizCompleted: false,
  caseSelected: false,
  assignedCaseId: null,
  clueRevealed: false,
  codeVerified: false,
  codeAttempts: 0,
  soundEnabled: localStorage.getItem('mystiq_sound') !== 'false',

  setSession: (data) => {
    if (data.session_token) {
      localStorage.setItem('mystiq_session', data.session_token)
    }
    if (data.team_name) {
      localStorage.setItem('mystiq_team', data.team_name)
    }
    set({
      sessionToken: data.session_token || localStorage.getItem('mystiq_session'),
      teamName: data.team_name || localStorage.getItem('mystiq_team'),
      stage: data.stage,
      correctCount: data.correct_count,
      wrongCount: data.wrong_count,
      currentQuestionIndex: data.current_question_index,
      quizCompleted: data.quiz_completed,
      caseSelected: data.case_selected,
      assignedCaseId: data.assigned_case_id,
      clueRevealed: data.clue_revealed,
      codeVerified: data.code_verified,
      codeAttempts: data.code_attempts,
    })
  },

  setJoined: (token, teamName) => {
    localStorage.setItem('mystiq_session', token)
    localStorage.setItem('mystiq_team', teamName)
    set({ sessionToken: token, teamName, stage: 'lobby' })
  },

  setSoundEnabled: (enabled) => {
    localStorage.setItem('mystiq_sound', String(enabled))
    set({ soundEnabled: enabled })
  },

  reset: () => {
    localStorage.removeItem('mystiq_session')
    localStorage.removeItem('mystiq_team')
    set({
      sessionToken: null,
      teamName: null,
      stage: 'landing',
      correctCount: 0,
      wrongCount: 0,
      currentQuestionIndex: 0,
      quizCompleted: false,
      caseSelected: false,
      assignedCaseId: null,
      clueRevealed: false,
      codeVerified: false,
      codeAttempts: 0,
    })
  },
}))

interface AdminState {
  token: string | null
  isAuthenticated: boolean
  setToken: (token: string) => void
  logout: () => void
}

export const useAdminStore = create<AdminState>((set) => ({
  token: localStorage.getItem('mystiq_admin_token'),
  isAuthenticated: !!localStorage.getItem('mystiq_admin_token'),

  setToken: (token) => {
    localStorage.setItem('mystiq_admin_token', token)
    set({ token, isAuthenticated: true })
  },

  logout: () => {
    localStorage.removeItem('mystiq_admin_token')
    set({ token: null, isAuthenticated: false })
  },
}))
