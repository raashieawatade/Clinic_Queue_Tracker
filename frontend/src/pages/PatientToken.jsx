import { useState } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/Header'
import Alert from '../components/Alert'
import { requestToken, getErrorMessage } from '../services/api'
import { saveMyToken } from '../services/patientStorage'
import { validateName, validatePhone } from '../services/validation'

function PatientToken() {
  const [form, setForm] = useState({ name: '', phone: '' })
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [tokenNumber, setTokenNumber] = useState(null)

  function handleChange(event) {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setFieldErrors((prev) => ({ ...prev, [name]: '' }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    const errors = { name: validateName(form.name), phone: validatePhone(form.phone) }
    setFieldErrors(errors)
    if (errors.name || errors.phone) return

    setLoading(true)
    try {
      const data = await requestToken(form.name.trim(), form.phone.trim())
      saveMyToken(data.tokenNumber)
      setTokenNumber(data.tokenNumber)
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to generate token. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Header />
      <main className="container page-narrow">
        {tokenNumber ? (
          <section className="card text-center">
            <p className="eyebrow success-text">Token Generated!</p>
            <p className="token-display" aria-label={`Your token number is ${tokenNumber}`}>
              {tokenNumber}
            </p>
            <p className="muted">Please keep this token number.</p>
            <Link to={`/status/${tokenNumber}`} className="btn btn-primary btn-lg btn-block">
              View Queue Status
            </Link>
          </section>
        ) : (
          <section className="card">
            <h1>Get Your Token</h1>
            <p className="muted">Enter your details to join today's queue.</p>

            <Alert type="error">{error}</Alert>

            <form onSubmit={handleSubmit} noValidate>
              <div className="field">
                <label htmlFor="name">Patient Name</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  value={form.name}
                  onChange={handleChange}
                  aria-invalid={Boolean(fieldErrors.name)}
                  aria-describedby="name-error"
                  maxLength={60}
                />
                <p id="name-error" className="field-error">{fieldErrors.name}</p>
              </div>

              <div className="field">
                <label htmlFor="phone">Phone Number</label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="e.g. 9876543210"
                  value={form.phone}
                  onChange={handleChange}
                  aria-invalid={Boolean(fieldErrors.phone)}
                  aria-describedby="phone-error"
                  maxLength={20}
                />
                <p id="phone-error" className="field-error">{fieldErrors.phone}</p>
              </div>

              <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={loading}>
                {loading ? 'Generating…' : 'Get Token'}
              </button>
            </form>
          </section>
        )}
      </main>
    </>
  )
}

export default PatientToken
