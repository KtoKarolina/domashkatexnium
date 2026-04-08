import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

export function apiError(res, status, message) {
  return res.status(status).json({ error: message })
}

/**
 * Проверяет JWT из заголовка Authorization: Bearer <token>.
 * При успехе добавляет req.user (из Supabase Auth) и req.token.
 */
export async function authMiddleware(req, res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return apiError(res, 401, 'Требуется авторизация. Передайте заголовок Authorization: Bearer <token>')
  }

  const token = header.slice(7)

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) {
    return apiError(res, 401, 'Невалидный или просроченный токен')
  }

  req.user = user
  req.token = token
  next()
}

/**
 * Проверяет роль пользователя из таблицы profiles.
 * Использовать после authMiddleware.
 */
export function requireRole(...roles) {
  return async (req, res, next) => {
    if (!req.user) return apiError(res, 401, 'Не авторизован')

    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', req.user.id)
      .maybeSingle()

    if (error) {
      console.error('requireRole', error)
      return apiError(res, 500, 'Ошибка проверки роли')
    }

    const userRole = data?.role || 'user'
    if (!roles.includes(userRole)) {
      return apiError(res, 403, `Доступ запрещён. Требуется роль: ${roles.join(' или ')}`)
    }

    req.role = userRole
    next()
  }
}
