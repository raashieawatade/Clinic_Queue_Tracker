import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 10000,
})

// ---- Receptionist session (kept for the browser tab only) ----
const AUTH_KEY = 'cqt_receptionist_token'

export function getAuthToken() {
  return sessionStorage.getItem(AUTH_KEY)
}

export function setAuthToken(token) {
  sessionStorage.setItem(AUTH_KEY, token)
}

export function clearAuthToken() {
  sessionStorage.removeItem(AUTH_KEY)
}

api.interceptors.request.use((config) => {
  const token = getAuthToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Turns any axios error into a message that is safe to show to users.
export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (!error.response) {
    return 'Unable to reach the server. Please check your connection and try again.'
  }
  const { status, data } = error.response
  if (status < 500 && data?.message) return data.message
  return fallback
}

// ---- Patient ----
export async function requestToken(name, phone) {
  const { data } = await api.post('/queue/token', { name, phone })
  return data
}

export async function getTokenStatus(tokenNumber) {
  const { data } = await api.get(`/queue/${encodeURIComponent(tokenNumber)}`)
  return data
}

// ---- Receptionist ----
export async function loginReceptionist(username, password) {
  const { data } = await api.post('/auth/login', { username, password })
  setAuthToken(data.token)
}

export async function getQueue() {
  const { data } = await api.get('/queue')
  return data
}

export async function callNextPatient() {
  const { data } = await api.put('/queue/next')
  return data
}

export async function completePatient(id) {
  const { data } = await api.put(`/queue/${id}/complete`)
  return data
}

export async function skipPatient(id) {
  const { data } = await api.put(`/queue/${id}/skip`)
  return data
}
