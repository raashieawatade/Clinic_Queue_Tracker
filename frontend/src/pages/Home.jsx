import { Link } from 'react-router-dom'
import Header from '../components/Header'
import { getMyToken } from '../services/patientStorage'

function Home() {
  const myToken = getMyToken()

  return (
    <>
      <Header />
      <main className="container page-narrow">
        <section className="hero card">
          <h1>Clinic Queue Tracker</h1>
          <p className="lead">
            Avoid unnecessary waiting.
            <br />
            Get your digital token and track your queue.
          </p>

          <div className="hero-actions">
            <Link to="/token" className="btn btn-primary btn-lg">
              Get Patient Token
            </Link>
            <Link to="/receptionist/login" className="btn btn-outline btn-lg">
              Receptionist Login
            </Link>
          </div>

          {myToken ? (
            <p className="hero-note">
              You have token <strong>{myToken}</strong> today.{' '}
              <Link to={`/status/${myToken}`}>View your queue status</Link>
            </p>
          ) : (
            <p className="hero-note">
              Already have a token? <Link to="/status">Check your queue status</Link>
            </p>
          )}
        </section>

        <ol className="steps">
          <li>
            <strong>Get a token</strong>
            <span>Enter your name and phone number.</span>
          </li>
          <li>
            <strong>Track your turn</strong>
            <span>See patients ahead and estimated wait.</span>
          </li>
          <li>
            <strong>Walk in when called</strong>
            <span>Your status changes to CALLED.</span>
          </li>
        </ol>
      </main>
    </>
  )
}

export default Home
