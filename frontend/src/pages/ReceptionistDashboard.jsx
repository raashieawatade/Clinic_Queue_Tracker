import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import Alert from '../components/Alert'
import StatusBadge from '../components/StatusBadge'
import {
  callNextPatient,
  clearAuthToken,
  completePatient,
  getErrorMessage,
  getQueue,
  skipPatient,
} from '../services/api'

const REFRESH_MS = 10000

function ReceptionistDashboard() {
  const navigate = useNavigate()
  const [queue, setQueue] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')
  const [success, setSuccess] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  const logout = useCallback(() => {
    clearAuthToken()
    navigate('/receptionist/login', { replace: true })
  }, [navigate])

  const loadQueue = useCallback(async () => {
    try {
      setQueue(await getQueue())
      setLoadError('')
    } catch (err) {
      if (err.response?.status === 401) return logout() // session expired
      setLoadError(getErrorMessage(err, 'Unable to load the queue. Please try again.'))
    }
  }, [logout])

  // Initial load, then refresh periodically so newly joined patients appear.
  useEffect(() => {
    loadQueue()
    const timer = setInterval(loadQueue, REFRESH_MS)
    return () => clearInterval(timer)
  }, [loadQueue])

  // Hide the success message after a few seconds.
  useEffect(() => {
    if (!success) return
    const timer = setTimeout(() => setSuccess(''), 4000)
    return () => clearTimeout(timer)
  }, [success])

  async function runAction(action) {
    setBusy(true)
    setActionError('')
    setSuccess('')
    setInfo('')
    try {
      const result = await action()
      setSuccess(result.message)
    } catch (err) {
      const status = err.response?.status
      if (status === 401) return logout()
      if (status === 404 && action === callNextPatient) {
        setInfo('No waiting patients.') // an empty queue is not an error
      } else {
        setActionError(getErrorMessage(err, 'Action failed. Please try again.'))
      }
    } finally {
      await loadQueue()
      setBusy(false)
    }
  }

  const patients = queue?.patients || []
  const current = patients.find((p) => p.status === 'CALLED')
  const waitingCount = patients.filter((p) => p.status === 'WAITING').length
  const doneCount = patients.filter((p) => p.status === 'COMPLETED').length

  return (
    <>
      <Header>
        <button type="button" className="btn btn-outline btn-sm" onClick={logout}>
          Logout
        </button>
      </Header>

      <main className="container">
        <h1>Clinic Queue</h1>

        {!queue && !loadError && <p className="loading" role="status">Loading queue…</p>}
        {loadError && (
          <Alert type="error">
            {loadError}{' '}
            <button type="button" className="link-button" onClick={loadQueue}>
              Retry
            </button>
          </Alert>
        )}

        {queue && (
          <>
            <section className="card current-card">
              <div>
                <p className="label">Current Patient</p>
                {current ? (
                  <p className="current-token">
                    {current.tokenNumber} <span className="current-name">{current.name}</span>
                  </p>
                ) : (
                  <p className="current-empty">No patient is currently being served</p>
                )}
              </div>
              <div className="current-actions">
                {current && (
                  <button
                    type="button"
                    className="btn btn-success"
                    disabled={busy}
                    onClick={() => runAction(() => completePatient(current._id))}
                  >
                    Complete
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-primary btn-lg"
                  disabled={busy}
                  onClick={() => runAction(callNextPatient)}
                >
                  Call Next
                </button>
              </div>
              {current && (
                <p className="muted small current-hint">
                  Calling the next patient also marks {current.tokenNumber} as completed.
                </p>
              )}
            </section>

            <div className="summary">
              <span><strong>{waitingCount}</strong> waiting</span>
              <span><strong>{doneCount}</strong> completed</span>
              <span><strong>{patients.length}</strong> tokens today</span>
            </div>

            <Alert type="success">{success}</Alert>
            <Alert type="info">{info}</Alert>
            <Alert type="error">{actionError}</Alert>

            {patients.length === 0 ? (
              <div className="card empty-state">
                <p>No patients in today's queue yet.</p>
                <p className="muted small">New tokens will appear here automatically.</p>
              </div>
            ) : (
              <div className="table-wrap card">
                <table className="queue-table">
                  <thead>
                    <tr>
                      <th scope="col">Token</th>
                      <th scope="col">Name</th>
                      <th scope="col">Status</th>
                      <th scope="col">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patients.map((patient) => (
                      <tr key={patient._id} className={`row-${patient.status.toLowerCase()}`}>
                        <td className="cell-token">{patient.tokenNumber}</td>
                        <td>{patient.name}</td>
                        <td>
                          <StatusBadge status={patient.status} />
                        </td>
                        <td>
                          {patient.status === 'WAITING' && (
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              disabled={busy}
                              onClick={() => runAction(() => skipPatient(patient._id))}
                            >
                              Skip
                            </button>
                          )}
                          {patient.status === 'CALLED' && (
                            <button
                              type="button"
                              className="btn btn-success btn-sm"
                              disabled={busy}
                              onClick={() => runAction(() => completePatient(patient._id))}
                            >
                              Complete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>
    </>
  )
}

export default ReceptionistDashboard
