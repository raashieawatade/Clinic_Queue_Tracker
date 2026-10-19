import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import PatientToken from './pages/PatientToken'
import QueueStatus from './pages/QueueStatus'
import ReceptionistLogin from './pages/ReceptionistLogin'
import ReceptionistDashboard from './pages/ReceptionistDashboard'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/token" element={<PatientToken />} />
        <Route path="/status" element={<QueueStatus />} />
        <Route path="/status/:token" element={<QueueStatus />} />
        <Route path="/receptionist/login" element={<ReceptionistLogin />} />
        <Route
          path="/receptionist"
          element={
            <ProtectedRoute>
              <ReceptionistDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
