import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import Alert from '../components/Alert'
import { getAuthToken, getErrorMessage, loginReceptionist } from '../services/api'

function ReceptionistLogin() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (getAuthToken()) return <Navigate to="/receptionist" replace />

  function handleChange(event) {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setFieldErrors((prev) => ({ ...prev, [name]: '' }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    const errors = {
      username: form.username.trim() ? '' : 'Please enter the username',
      password: form.password ? '' : 'Please enter the password',
    }
    setFieldErrors(errors)
    if (errors.username || errors.password) return

    setLoading(true)
    try {
      await loginReceptionist(form.username.trim(), form.password)
      navigate('/receptionist', { replace: true })
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to log in. Please try again.'))
      setLoading(false)
    }
  }

  return (
    <>
      <Header />
      <main className="container page-narrow">
        <section className="card">
          <h1>Receptionist Login</h1>
          <p className="muted">Staff access to manage today's queue.</p>

          <Alert type="error">{error}</Alert>

          <form onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                value={form.username}
                onChange={handleChange}
                aria-invalid={Boolean(fieldErrors.username)}
                aria-describedby="username-error"
              />
              <p id="username-error" className="field-error">{fieldErrors.username}</p>
            </div>

            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={form.password}
                onChange={handleChange}
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby="password-error"
              />
              <p id="password-error" className="field-error">{fieldErrors.password}</p>
            </div>

            <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={loading}>
              {loading ? 'Logging in…' : 'Login'}
            </button>
          </form>
        </section>
      </main>
    </>
  )
}

export default ReceptionistLogin
