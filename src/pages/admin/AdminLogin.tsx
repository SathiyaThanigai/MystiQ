import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { adminApi } from '../../lib/api'
import { useAdminStore } from '../../lib/store'
import PageTransition from '../../components/ui/PageTransition'
import GlassPanel from '../../components/ui/GlassPanel'

export default function AdminLogin() {
  const navigate = useNavigate()
  const { setToken, isAuthenticated, logout } = useAdminStore()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // If already authenticated, redirect
  if (isAuthenticated) {
    // Verify the token is still valid before redirecting
    adminApi.getDashboard().then(() => {
      navigate('/admin/dashboard')
    }).catch(() => {
      // Token expired — clear and stay on login
      logout()
    })
    return null
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await adminApi.login(username, password)
      setToken(res.data.access_token)
      navigate('/admin/dashboard')
    } catch (err: any) {
      setError('Invalid credentials. Access denied.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageTransition>
      <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="font-display text-2xl tracking-[0.2em] text-mystiq-crimson font-bold">
              MYSTIQ
            </h1>
            <p className="font-display text-[9px] tracking-[0.3em] text-mystiq-text-muted mt-2 uppercase">
              Case Command Center
            </p>
            <div className="w-24 h-[1px] mx-auto mt-3 bg-gradient-to-r from-transparent via-mystiq-crimson/40 to-transparent" />
          </div>

          <GlassPanel crimson className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-2 h-2 rounded-full bg-mystiq-crimson animate-pulse-slow" />
              <span className="font-display text-[9px] tracking-[0.3em] text-mystiq-text-muted uppercase">
                Secure Access Required
              </span>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block font-display text-[9px] tracking-widest text-mystiq-text-muted uppercase mb-2">
                  Agent ID
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-mystiq-bg/60 border border-mystiq-border/50 rounded px-4 py-3 text-sm font-mono text-mystiq-text placeholder:text-mystiq-text-muted/30 focus:outline-none focus:border-mystiq-crimson/50 transition-all"
                  placeholder="Enter agent ID"
                  autoComplete="username"
                />
              </div>

              <div>
                <label className="block font-display text-[9px] tracking-widest text-mystiq-text-muted uppercase mb-2">
                  Access Code
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-mystiq-bg/60 border border-mystiq-border/50 rounded px-4 py-3 text-sm font-mono text-mystiq-text placeholder:text-mystiq-text-muted/30 focus:outline-none focus:border-mystiq-crimson/50 transition-all"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-red-400 text-xs font-body"
                >
                  {error}
                </motion.p>
              )}

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading || !username || !password}
                className="btn-primary w-full text-xs mt-2"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <motion.div
                      className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    />
                    Authenticating...
                  </span>
                ) : (
                  'Access Command Center'
                )}
              </motion.button>
            </form>
          </GlassPanel>

          <p className="text-center text-mystiq-text-muted text-[9px] mt-4 font-display tracking-wider">
            RESTRICTED ACCESS — AUTHORIZED PERSONNEL ONLY
          </p>
        </motion.div>
      </div>
    </PageTransition>
  )
}
