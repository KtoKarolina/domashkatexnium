import { apiError } from './middleware.js'

// ─── Чистые функции валидации ─────────────────────────────

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

export function validateId(raw) {
  const id = Number(raw)
  if (!Number.isFinite(id) || id < 1 || !Number.isInteger(id)) return 'Неверный идентификатор'
  return null
}

// ─── Express-middleware для валидации ──────────────────────

export function requireBody(...fields) {
  return (req, res, next) => {
    if (!req.body || typeof req.body !== 'object') {
      return apiError(res, 400, 'Тело запроса обязательно')
    }
    for (const f of fields) {
      const val = req.body[f]
      if (val === undefined || val === null || (typeof val === 'string' && !val.trim())) {
        return apiError(res, 400, `Поле «${f}» обязательно`)
      }
    }
    next()
  }
}

export function requireQuery(...fields) {
  return (req, res, next) => {
    for (const f of fields) {
      const val = req.query[f]
      if (!val || (typeof val === 'string' && !val.trim())) {
        return apiError(res, 400, `Параметр «${f}» обязателен`)
      }
    }
    next()
  }
}

export function validateBodyEmail(field = 'email') {
  return (req, res, next) => {
    const err = validateEmail(req.body?.[field])
    if (err) return apiError(res, 400, err)
    next()
  }
}

export function validateBodyBirthDate(field = 'birthDate') {
  return (req, res, next) => {
    const err = validateBirthDate(req.body?.[field])
    if (err) return apiError(res, 400, err)
    next()
  }
}

export function validateQueryBirthDate(field = 'birthDate') {
  return (req, res, next) => {
    const err = validateBirthDate(req.query?.[field])
    if (err) return apiError(res, 400, err)
    next()
  }
}

export function validateParamId(param = 'id') {
  return (req, res, next) => {
    const err = validateId(req.params[param])
    if (err) return apiError(res, 400, err)
    req.validatedId = Number(req.params[param])
    next()
  }
}
