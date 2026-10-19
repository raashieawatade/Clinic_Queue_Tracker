// Remembers only the patient's token number (no name, phone or medical data),
// so they can reopen their status page. Tokens are valid for one day.
const KEY = 'cqt_patient_token'

function today() {
  return new Date().toDateString()
}

export function saveMyToken(tokenNumber) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ tokenNumber, date: today() }))
  } catch {
    // Storage may be unavailable (private mode); the token is still shown on screen.
  }
}

export function getMyToken() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY))
    return saved && saved.date === today() ? saved.tokenNumber : null
  } catch {
    return null
  }
}
