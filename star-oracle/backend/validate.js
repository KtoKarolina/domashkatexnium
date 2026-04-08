export function validateEmail(email) {
  if (!email || typeof email !== 'string' || !email.trim()) return 'Некорректный email'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Некорректный email'
  return null
}

export function validatePassword(password) {
  if (!password || typeof password !== 'string') return 'Пароль обязателен'
  if (password.length < 8) return 'Пароль должен содержать минимум 8 символов'
  return null
}

export function validateBirthDate(birthDate) {
  if (!birthDate || typeof birthDate !== 'string' || !birthDate.trim()) {
    return 'Дата рождения обязательна'
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
    return 'Неверный формат даты. Используйте YYYY-MM-DD'
  }

  const d = new Date(birthDate + 'T12:00:00')
  if (Number.isNaN(d.getTime())) {
    return 'Неверный формат даты. Используйте YYYY-MM-DD'
  }

  const year = d.getFullYear()
  if (year < 1900) return 'Дата рождения не может быть раньше 1900 года'
  if (d > new Date()) return 'Дата рождения не может быть в будущем'

  return null
}
