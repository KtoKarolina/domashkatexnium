export function validateEmail(email) {
  if (!email || typeof email !== 'string') return 'Email обязателен'
  const trimmed = email.trim()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return 'Некорректный формат email'
  return null
}

export function validatePassword(password) {
  if (!password || typeof password !== 'string') return 'Пароль обязателен'
  if (password.length < 8) return 'Пароль должен содержать минимум 8 символов'
  return null
}

export function validateBirthDate(birthDate) {
  if (!birthDate || typeof birthDate !== 'string') return 'birthDate обязателен'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return 'birthDate должен быть в формате YYYY-MM-DD'

  const d = new Date(birthDate + 'T12:00:00')
  if (Number.isNaN(d.getTime())) return 'Некорректная дата'

  if (d > new Date()) return 'Дата рождения не может быть в будущем'

  return null
}
