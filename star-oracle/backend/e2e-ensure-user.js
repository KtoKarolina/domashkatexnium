import { log } from './logger.js'

/**
 * Секрет заголовка x-e2e-secret. Только из E2E_SETUP_SECRET (без значения в коде).
 * При пустом значении или DISABLE_E2E_DEV_ENDPOINT=1 эндпоинт выключен (null).
 */
export function getE2EEndpointSecret() {
  if (process.env.DISABLE_E2E_DEV_ENDPOINT === '1') return null
  const fromEnv = process.env.E2E_SETUP_SECRET?.trim()
  return fromEnv || null
}

/**
 * Создаёт или обновляет пользователя для Playwright e2e (подтверждённый email).
 * Вызывается только с POST /api/dev/e2e-ensure-user при валидном секрете.
 */
export async function ensureE2eTestUser(supabaseAdmin, email, password) {
  const normalized = email.trim().toLowerCase()

  const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email: normalized,
    password,
    email_confirm: true,
  })

  if (!createErr && created?.user) {
    log.info('E2E', `Создан пользователь ${normalized}`)
    return { created: true }
  }

  const msg = String(createErr?.message || '')
  if (createErr && !/already been registered|already exists|duplicate/i.test(msg)) {
    throw createErr
  }

  let page = 1
  const perPage = 200
  for (;;) {
    const { data: batch, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ page, perPage })
    if (listErr) throw listErr
    const found = batch.users.find((u) => u.email?.toLowerCase() === normalized)
    if (found) {
      const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(found.id, {
        password,
        email_confirm: true,
      })
      if (updErr) throw updErr
      log.info('E2E', `Обновлены пароль и email_confirm для ${normalized}`)
      return { created: false }
    }
    if (batch.users.length < perPage) break
    page += 1
  }

  throw new Error(`Пользователь ${normalized} не найден после ошибки регистрации`)
}
