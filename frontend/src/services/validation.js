// Same rules as the backend, so users get instant feedback before submitting.

export function validateName(value) {
  const name = value.trim()
  if (!name) return 'Please enter your name'
  if (name.length < 2 || name.length > 60) return 'Name must be between 2 and 60 characters'
  if (!/^[\p{L} .'-]+$/u.test(name)) return 'Name can contain only letters, spaces, dots and hyphens'
  return ''
}

export function validatePhone(value) {
  const phone = value.trim()
  if (!phone) return 'Please enter your phone number'
  if (!/^\+?[\d\s-]+$/.test(phone)) return 'Phone number can contain only digits'
  const digits = phone.replace(/\D/g, '').length
  if (digits < 10 || digits > 15) return 'Phone number must have 10 to 15 digits'
  return ''
}

export function normalizeToken(value) {
  const token = value.trim().toUpperCase()
  if (/^\d{1,4}$/.test(token)) return `A-${token.padStart(2, '0')}` // allow typing just "27"
  return token
}

export function isValidToken(token) {
  return /^A-\d{1,4}$/.test(token)
}
