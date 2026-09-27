import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../api/axios'
import { useTheme } from '../context/ThemeContext'
import { getErrorMessage } from '../api/errorMessage'

function Login() {
  const { colors } = useTheme()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    background: colors.bg,
    border: `1px solid ${colors.border}`,
    borderRadius: '6px',
    color: colors.text,
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    try {
      const response = await api.post('/auth/login', { email, password })
      localStorage.setItem('token', response.data.access_token)
      navigate('/dashboard')
    } catch (err) {
      setError('Invalid email or password')
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: colors.bg,
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
        padding: '24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '380px',
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: '12px',
          padding: '32px',
        }}
      >
        <div
          style={{
            fontSize: '22px',
            fontWeight: 700,
            marginBottom: '24px',
            textAlign: 'center',
            backgroundImage: `linear-gradient(90deg, ${colors.accentPurple}, ${colors.accentBlue})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Expense Tracker
        </div>

        <h1 style={{ fontSize: '20px', fontWeight: 600, color: colors.text, marginBottom: '20px' }}>
          Log In
        </h1>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '13px', color: colors.textMuted, display: 'block', marginBottom: '6px' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ fontSize: '13px', color: colors.textMuted, display: 'block', marginBottom: '6px' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          {error && (
            <p style={{ color: colors.danger, fontSize: '13px', margin: 0 }}>{error}</p>
          )}

          <button
            type="submit"
            style={{
              padding: '10px 18px',
              background: `linear-gradient(90deg, ${colors.accentPurple}, ${colors.accentBlue})`,
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              marginTop: '4px',
            }}
          >
            Log In
          </button>
        </form>

        <p style={{ fontSize: '13px', color: colors.textMuted, textAlign: 'center', marginTop: '20px' }}>
          Don't have an account?{' '}
          <Link to="/signup" style={{ color: colors.accentBlue, textDecoration: 'none' }}>
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  )
}

export default Login