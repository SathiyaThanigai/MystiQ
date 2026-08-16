import { Routes, Route } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { useLocation } from 'react-router-dom'
import Landing from './pages/Landing'
import Lobby from './pages/Lobby'
import Quiz from './pages/Quiz'
import CaseUnlock from './pages/CaseUnlock'
import ClueReveal from './pages/ClueReveal'
import FinalCode from './pages/FinalCode'
import Level2 from './pages/Level2'
import AdminLogin from './pages/admin/AdminLogin'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminLevel2 from './pages/admin/AdminLevel2'
import FilmGrain from './components/effects/FilmGrain'
import GridBackground from './components/effects/GridBackground'

export default function App() {
  const location = useLocation()

  return (
    <div className="relative min-h-screen">
      <GridBackground />
      <FilmGrain />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Landing />} />
          <Route path="/lobby" element={<Lobby />} />
          <Route path="/quiz" element={<Quiz />} />
          <Route path="/case-unlock" element={<CaseUnlock />} />
          <Route path="/clue" element={<ClueReveal />} />
          <Route path="/final" element={<FinalCode />} />
          <Route path="/level2" element={<Level2 />} />
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/level2" element={<AdminLevel2 />} />
        </Routes>
      </AnimatePresence>
    </div>
  )
}
