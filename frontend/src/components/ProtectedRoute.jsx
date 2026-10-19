import { Navigate } from 'react-router-dom'
import { getAuthToken } from '../services/api'

function ProtectedRoute({ children }) {
  if (!getAuthToken()) return <Navigate to="/receptionist/login" replace />
  return children
}

export default ProtectedRoute
