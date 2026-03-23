// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Auth Screen
// Email/password login, signup, and forgot password flows.
// Falls back to local-only mode if Supabase is not configured.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { supabase } from '../../db/supabase'

type AuthMode = 'login' | 'signup' | 'forgot'

interface AuthScreenProps {
  onAuth: (userId: string, email: string) => void
  onSkip: () => void
}

export function AuthScreen({ onAuth, onSkip }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setLoading(false)
    if (authError) {
      setError(authError.message)
      return
    }
    if (data.user) {
      onAuth(data.user.id, data.user.email ?? email)
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    })

    setLoading(false)
    if (authError) {
      setError(authError.message)
      return
    }

    if (data.user?.identities?.length === 0) {
      setError('An account with this email already exists')
      return
    }

    if (data.session) {
      // Email confirmation disabled — logged in immediately
      onAuth(data.user!.id, data.user!.email ?? email)
    } else {
      // Email confirmation required
      setSuccess('Check your email for a confirmation link!')
      setMode('login')
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })

    setLoading(false)
    if (resetError) {
      setError(resetError.message)
      return
    }
    setSuccess('Password reset email sent! Check your inbox.')
    setMode('login')
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-logo">🪕 Banjo Buddy</h1>
          <p className="auth-tagline">
            {mode === 'login' ? 'Welcome back!' :
             mode === 'signup' ? 'Create your account' :
             'Reset your password'}
          </p>
        </div>

        {error && <div className="auth-error">{error}</div>}
        {success && <div className="auth-success">{success}</div>}

        {mode === 'login' && (
          <form onSubmit={handleLogin} className="auth-form">
            <label className="auth-label">
              Email
              <input
                type="email"
                className="auth-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
              />
            </label>
            <label className="auth-label">
              Password
              <input
                type="password"
                className="auth-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </label>
            <button type="submit" className="auth-btn auth-btn-primary" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
            <div className="auth-links">
              <button type="button" className="auth-link" onClick={() => { setMode('signup'); setError(null); setSuccess(null) }}>
                Create an account
              </button>
              <button type="button" className="auth-link" onClick={() => { setMode('forgot'); setError(null); setSuccess(null) }}>
                Forgot password?
              </button>
            </div>
          </form>
        )}

        {mode === 'signup' && (
          <form onSubmit={handleSignup} className="auth-form">
            <label className="auth-label">
              Name
              <input
                type="text"
                className="auth-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
                placeholder="Your name"
              />
            </label>
            <label className="auth-label">
              Email
              <input
                type="email"
                className="auth-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </label>
            <label className="auth-label">
              Password
              <input
                type="password"
                className="auth-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                minLength={6}
                placeholder="At least 6 characters"
              />
            </label>
            <button type="submit" className="auth-btn auth-btn-primary" disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
            <div className="auth-links">
              <button type="button" className="auth-link" onClick={() => { setMode('login'); setError(null); setSuccess(null) }}>
                Already have an account? Sign in
              </button>
            </div>
          </form>
        )}

        {mode === 'forgot' && (
          <form onSubmit={handleForgotPassword} className="auth-form">
            <label className="auth-label">
              Email
              <input
                type="email"
                className="auth-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
              />
            </label>
            <button type="submit" className="auth-btn auth-btn-primary" disabled={loading}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
            <div className="auth-links">
              <button type="button" className="auth-link" onClick={() => { setMode('login'); setError(null); setSuccess(null) }}>
                Back to sign in
              </button>
            </div>
          </form>
        )}

        <div className="auth-divider">
          <span>or</span>
        </div>

        <button className="auth-btn auth-btn-secondary" onClick={onSkip}>
          Continue without an account
        </button>
        <p className="auth-skip-note">
          Your progress will be saved locally on this device only.
        </p>
      </div>
    </div>
  )
}
