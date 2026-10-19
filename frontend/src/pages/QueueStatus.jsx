import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import Header from '../components/Header'
import Alert from '../components/Alert'
import StatusBadge from '../components/StatusBadge'
import { getTokenStatus, getErrorMessage } from '../services/api'
import { getMyToken } from '../services/patientStorage'
import { isValidToken, normalizeToken } from '../services/validation'

const REFRESH_MS = 8000
const FINAL_STATUSES = ['COMPLETED', 'SKIPPED']

const STATUS_MESSAGES = {
  WAITING: 'Please wait. We will call your token soon.',
  CALLED: "It's your turn! Please proceed to the consultation room.",
  COMPLETED: 'Your consultation is complete. Thank you for visiting.',
  SKIPPED: 'Your token was skipped. Please contact the reception desk.',
}

function formatWait(minutes) {
  return minutes === 1 ? '1 minute' : `${minutes} minutes`
}

function QueueStatus() {
  const { token: tokenParam } = useParams()
  const location = useLocation()
  const token = tokenParam ? normalizeToken(tokenParam) : null

  // /status with a token saved today goes straight to it, unless the patient asked to look up another.
  if (!token && !location.state?.lookup) {
    const saved = getMyToken()
    if (saved) return <Navigate to={`/status/${saved}`} replace />
  }

  return (
    <>
      <Header />
      <main className="container page-narrow">
        {/* key resets all state when the token in the URL changes */}
        {token ? <TokenStatus key={token} token={token} /> : <TokenLookup />}
      </main>
    </>
  )
}

// Lets a patient type their token number.
function TokenLookup() {
  const navigate = useNavigate()
  const [value, setValue] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    const token = normalizeToken(value)
    if (!isValidToken(token)) {
      setError('Enter a valid token, for example A-07')
      return
    }
    navigate(`/status/${token}`)
  }

  return (
    <section className="card">
      <h1>Check Queue Status</h1>
      <form onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="token">Your Token Number</label>
          <input
            id="token"
            type="text"
            placeholder="e.g. A-07"
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              setError('')
            }}
            aria-invalid={Boolean(error)}
            aria-describedby="token-error"
            maxLength={8}
          />
          <p id="token-error" className="field-error">{error}</p>
        </div>
        <button type="submit" className="btn btn-primary btn-lg btn-block">
          View Status
        </button>
      </form>
      <p className="muted text-center">
        No token yet? <Link to="/token">Get a token</Link>
      </p>
    </section>
  )
}

function StatusProgress({ status }) {
  if (status === 'SKIPPED') return null
  const steps = ['WAITING', 'CALLED', 'COMPLETED']
  const currentIndex = steps.indexOf(status)
  return (
    <ol className="progress" aria-label="Queue progress">
      {steps.map((step, index) => (
        <li
          key={step}
          className={index < currentIndex ? 'done' : index === currentIndex ? 'active' : ''}
          aria-current={index === currentIndex ? 'step' : undefined}
        >
          {step}
        </li>
      ))}
    </ol>
  )
}

function Stat({ label, value, note }) {
  return (
    <div className="stat">
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
      {note && <p className="stat-note">{note}</p>}
    </div>
  )
}

function TokenStatus({ token }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)

  const loadStatus = useCallback(async () => {
    try {
      const result = await getTokenStatus(token)
      setData(result)
      setError('')
      setNotFound(false)
      setLastUpdated(new Date())
    } catch (err) {
      const status = err.response?.status
      if (status === 404 || status === 400) setNotFound(true)
      setError(getErrorMessage(err, 'Unable to load queue status. Please try again.'))
    } finally {
      setLoading(false)
    }
  }, [token])

  const isFinal = data && FINAL_STATUSES.includes(data.status)

  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  // Poll for updates until the visit is finished.
  useEffect(() => {
    if (isFinal || notFound) return
    const timer = setInterval(loadStatus, REFRESH_MS)
    return () => clearInterval(timer)
  }, [isFinal, notFound, loadStatus])

  if (loading && !data) {
    return <p className="loading" role="status">Loading queue status…</p>
  }

  if (!data) {
    return (
      <section className="card text-center">
        <Alert type="error">{error}</Alert>
        {notFound ? (
          <>
            <p className="muted">Tokens are valid for today only.</p>
            <div className="stack">
              <Link to="/status" state={{ lookup: true }} className="btn btn-outline">
                Try another token
              </Link>
              <Link to="/token" className="btn btn-primary">
                Get a new token
              </Link>
            </div>
          </>
        ) : (
          <button type="button" className="btn btn-primary" onClick={loadStatus}>
            Try again
          </button>
        )}
      </section>
    )
  }

  return (
    <section className={`card status-card status-${data.status.toLowerCase()}`}>
      <div className="status-head">
        <div>
          <p className="label">Your Token</p>
          <p className="token-display">{data.tokenNumber}</p>
        </div>
        <StatusBadge status={data.status} />
      </div>

      <p className="status-message">{STATUS_MESSAGES[data.status]}</p>

      <StatusProgress status={data.status} />

      <div className="stats">
        <Stat
          label="Currently Serving"
          value={data.currentToken || '—'}
          note={data.currentToken ? null : 'No patient is currently being served'}
        />
        {data.status === 'WAITING' && (
          <>
            <Stat
              label="Patients Ahead"
              value={data.patientsAhead}
              note={data.patientsAhead === 0 ? 'You are next' : null}
            />
            <Stat
              label="Estimated Waiting Time"
              value={formatWait(data.estimatedWait)}
              note="Estimate (about 5 minutes per patient)"
            />
          </>
        )}
      </div>

      {error && <Alert type="error">{error} Showing the last known status.</Alert>}

      <div className="status-footer">
        <span className="muted small">
          {isFinal
            ? 'Final status'
            : `Updates automatically${lastUpdated ? ` · last updated ${lastUpdated.toLocaleTimeString()}` : ''}`}
        </span>
        <button type="button" className="btn btn-outline btn-sm" onClick={loadStatus}>
          Refresh
        </button>
      </div>
    </section>
  )
}

export default QueueStatus
