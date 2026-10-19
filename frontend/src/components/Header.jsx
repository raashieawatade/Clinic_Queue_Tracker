import { Link } from 'react-router-dom'

function Header({ children }) {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link to="/" className="brand">
          <span className="brand-mark" aria-hidden="true">+</span>
          Clinic Queue Tracker
        </Link>
        {children}
      </div>
    </header>
  )
}

export default Header
