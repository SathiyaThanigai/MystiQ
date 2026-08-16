import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // 15s timeout — prevents hanging on slow responses
})

// Retry logic for transient failures (network blips with 50 users)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config
    // Only retry GET requests (never retry POSTs to prevent double-submission)
    if (
      !config._retry &&
      config.method === 'get' &&
      (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK' ||
       (error.response && error.response.status >= 500))
    ) {
      config._retry = true
      await new Promise((r) => setTimeout(r, 500))
      return api(config)
    }
    return Promise.reject(error)
  }
)

// Add session token to participant requests
api.interceptors.request.use((config) => {
  // Level 2 uses its own session token
  if (config.url?.startsWith('/level2') && !config.url?.includes('/admin')) {
    const l2Token = localStorage.getItem('mystiq_l2_session')
    if (l2Token) config.headers['x-session-token'] = l2Token
  } else if (!config.url?.includes('/admin')) {
    const sessionToken = localStorage.getItem('mystiq_session')
    if (sessionToken) config.headers['x-session-token'] = sessionToken
  }

  const adminToken = localStorage.getItem('mystiq_admin_token')
  if (adminToken && config.url?.includes('/admin')) {
    config.headers['Authorization'] = `Bearer ${adminToken}`
  }

  return config
})

// Participant API
export const participantApi = {
  joinGame: (gameCode: string, teamName: string) =>
    api.post('/participant/join', { game_code: gameCode, team_name: teamName }),
  getGameStatus: () => api.get('/participant/game-status'),
  getSession: () => api.post('/participant/session'),
  startQuiz: () => api.post('/participant/start-quiz'),
  getCurrentQuestion: () => api.get('/participant/current-question'),
  submitAnswer: (questionId: number, selectedAnswer: number) =>
    api.post('/participant/answer', { question_id: questionId, selected_answer: selectedAnswer }),
  getCases: () => api.get('/participant/cases'),
  selectCase: (caseId: number) => api.post('/participant/select-case', { case_id: caseId }),
  getClue: () => api.get('/participant/clue'),
  verifyCode: (caseId: number, code: string) =>
    api.post('/participant/verify-code', { case_id: caseId, code }),
}

// Admin API
export const adminApi = {
  login: (username: string, password: string) =>
    api.post('/admin/login', { username, password }),
  getDashboard: () => api.get('/admin/dashboard'),
  getParticipants: () => api.get('/admin/participants'),
  getGameSettings: () => api.get('/admin/game-settings'),
  updateGameSettings: (data: any) => api.post('/admin/game-settings', data),
  startGame: () => api.post('/admin/start-game'),
  stopGame: () => api.post('/admin/stop-game'),
  openLobby: () => api.post('/admin/open-lobby'),
  closeLobby: () => api.post('/admin/close-lobby'),
  newBatch: () => api.post('/admin/new-batch'),
  getBatchHistory: () => api.get('/admin/batch-history'),
  deleteBatch: (batchNumber: number) => api.delete(`/admin/batch-history/${batchNumber}`),
  getQuestions: () => api.get('/admin/questions'),
  createQuestion: (data: any) => api.post('/admin/questions', data),
  bulkImportQuestions: (questions: any[]) => api.post('/admin/questions/bulk', { questions }),
  updateQuestion: (id: number, data: any) => api.put(`/admin/questions/${id}`, data),
  deleteQuestion: (id: number) => api.delete(`/admin/questions/${id}`),
  getCases: () => api.get('/admin/cases'),
  createCase: (data: any) => api.post('/admin/cases', data),
  updateCase: (id: number, data: any) => api.put(`/admin/cases/${id}`, data),
  deleteCase: (id: number) => api.delete(`/admin/cases/${id}`),
  resetParticipant: (id: number) => api.post(`/admin/reset/participant/${id}`),
  resetAllQuizzes: () => api.post('/admin/reset/all-quizzes'),
  resetAllCodes: () => api.post('/admin/reset/all-codes'),
  resetEvent: () => api.post('/admin/reset/event'),
}

export default api

// Level 2 API
export const level2Api = {
  // Admin
  getSettings: () => api.get('/level2/admin/settings'),
  openLobby: () => api.post('/level2/admin/open-lobby'),
  closeLobby: () => api.post('/level2/admin/close-lobby'),
  startGame: () => api.post('/level2/admin/start-game'),
  stopGame: () => api.post('/level2/admin/stop-game'),
  revealAnswer: () => api.post('/level2/admin/reveal-answer'),
  giveFinalAttempt: () => api.post('/level2/admin/give-final-attempt'),
  setAnswerText: (text: string) => api.post('/level2/admin/set-answer-text', { text }),
  reset: () => api.post('/level2/admin/reset'),
  getCaseFiles: () => api.get('/level2/admin/case-files'),
  createCaseFile: (data: any) => api.post('/level2/admin/case-files', data),
  updateCaseFile: (id: number, data: any) => api.put(`/level2/admin/case-files/${id}`, data),
  deleteCaseFile: (id: number) => api.delete(`/level2/admin/case-files/${id}`),
  getSuspects: () => api.get('/level2/admin/suspects'),
  getSuspectsByCase: (caseFileId: number) => api.get(`/level2/admin/suspects/by-case/${caseFileId}`),
  createSuspect: (data: any) => api.post('/level2/admin/suspects', data),
  updateSuspect: (id: number, data: any) => api.put(`/level2/admin/suspects/${id}`, data),
  deleteSuspect: (id: number) => api.delete(`/level2/admin/suspects/${id}`),
  getParticipants: () => api.get('/level2/admin/participants'),

  // Participant
  join: (gameCode: string, teamName: string) => api.post('/level2/join', { game_code: gameCode, team_name: teamName }),
  getStatus: () => api.get('/level2/status'),
  getSession: () => api.post('/level2/session'),
  getPublicCaseFiles: () => api.get('/level2/case-files'),
  selectCaseFile: (caseFileId: number) => api.post('/level2/select-case-file', { case_file_id: caseFileId }),
  getPublicSuspects: () => api.get('/level2/suspects'),
  submitAnswer: (suspectId: number) => api.post('/level2/submit-answer', { suspect_id: suspectId }),
  getAnswer: () => api.get('/level2/answer'),
  getRankings: () => api.get('/level2/rankings'),
}
