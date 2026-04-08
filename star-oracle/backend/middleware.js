import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

export function apiError(res, status, message) {
  return res.status(status).json({ message })
}

export async function authMiddleware(req, res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return apiError(res, 401, 'Требуется авторизация')
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

export function requireRole(...roles) {
  return async (req, res, next) => {
    if (!req.user) return apiError(res, 401, 'Требуется авторизация')

    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', req.user.id)
      .maybeSingle()

    if (error) {
      console.error('requireRole', error)
      return apiError(res, 500, 'Внутренняя ошибка сервера')
    }

    const userRole = data?.role || 'user'
    if (!roles.includes(userRole)) {
      return apiError(res, 403, 'Доступ запрещён')
    }

    req.role = userRole
    next()
  }
}
