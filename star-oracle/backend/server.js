import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { getZodiacSign } from './zodiac.js'
import { apiError, authMiddleware, requireRole } from './middleware.js'
import {
  validateEmail, validatePassword, validateBirthDate,
  requireBody, validateBodyEmail, validateBodyBirthDate,
  validateQueryBirthDate, validateParamId,
} from './validate.js'
import { startBot } from './telegram.js'
import { scheduleDailySend } from './daily-send.js'

const app = express()
app.use(cors())
app.use(express.json())

// ─── Отлов ошибок парсинга JSON ──────────────────────────
app.use((err, _req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return apiError(res, 400, 'Некорректный JSON в теле запроса')
  }
  next(err)
})

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

const supabaseAnon = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
)

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// ─── Rate limiter для /api/prediction ─────────────────────
const predictionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Слишком много запросов. Попробуйте через минуту.' },
})

// ─── Helpers ──────────────────────────────────────────────

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

const COLORS = [
  'золотой', 'серебряный', 'лавандовый', 'изумрудный',
  'рубиновый', 'сапфировый', 'янтарный', 'бирюзовый',
  'коралловый', 'аметистовый', 'жемчужный', 'бронзовый',
]

function internalError(res, logPrefix, err) {
  console.error(logPrefix, err)
  return apiError(res, 500, 'Внутренняя ошибка сервера')
}

// ═══════════════════════════════════════════════════════════
// AUTH — открытые маршруты
// ═══════════════════════════════════════════════════════════

app.post('/api/auth/register', requireBody('email', 'password'), async (req, res) => {
  try {
    const { email, password } = req.body

    const emailErr = validateEmail(email)
    if (emailErr) return apiError(res, 400, emailErr)

    const passErr = validatePassword(password)
    if (passErr) return apiError(res, 400, passErr)

    const { data, error } = await supabaseAnon.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
    })

    if (error) return apiError(res, 400, 'Не удалось создать аккаунт. Проверьте данные.')

    if (data.user) {
      await supabase.from('profiles').upsert(
        { user_id: data.user.id, role: 'user' },
        { onConflict: 'user_id' },
      )
    }

    if (data.session) {
      return res.status(201).json({
        message: 'Регистрация прошла успешно',
        user: data.user,
        session: { access_token: data.session.access_token, refresh_token: data.session.refresh_token },
      })
    }

    res.status(201).json({
      message: 'Аккаунт создан. Подтвердите email по ссылке из письма, затем войдите.',
      user: data.user,
    })
  } catch (err) {
    internalError(res, 'POST /api/auth/register', err)
  }
})

app.post('/api/auth/login', requireBody('email', 'password'), async (req, res) => {
  try {
    const { email, password } = req.body

    const { data, error } = await supabaseAnon.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })

    if (error) return apiError(res, 401, 'Неверный email или пароль')

    res.json({
      message: 'Вход выполнен',
      user: data.user,
      session: { access_token: data.session.access_token, refresh_token: data.session.refresh_token },
    })
  } catch (err) {
    internalError(res, 'POST /api/auth/login', err)
  }
})

app.post('/api/auth/logout', authMiddleware, async (_req, res) => {
  try {
    res.json({ message: 'Вы вышли из аккаунта' })
  } catch (err) {
    internalError(res, 'POST /api/auth/logout', err)
  }
})

// ═══════════════════════════════════════════════════════════
// SUBSCRIBERS — требуют авторизации
// ═══════════════════════════════════════════════════════════

// ─── POST /api/subscribers (auth, email из токена) ────────

app.post(
  '/api/subscribers',
  authMiddleware,
  validateBodyBirthDate('birthDate'),
  async (req, res) => {
    try {
      const { birthDate } = req.body
      const email = req.user.email

      const { data: existing } = await supabase
        .from('subscribers')
        .select('*')
        .eq('email', email)
        .maybeSingle()

      if (existing) {
        return res.status(201).json({ subscriber: existing, isNew: false })
      }

      const sign = getZodiacSign(birthDate)

      const { data, error } = await supabase
        .from('subscribers')
        .insert({
          user_id: req.user.id,
          email,
          birth_date: birthDate,
          zodiac_sign: sign?.name ?? null,
        })
        .select()
        .single()

      if (error) throw error
      res.status(201).json({ subscriber: data, isNew: true })
    } catch (err) {
      internalError(res, 'POST /api/subscribers', err)
    }
  },
)

// ─── GET /api/subscribers (admin only) ────────────────────

app.get('/api/subscribers', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    let query = supabase
      .from('subscribers')
      .select('*')
      .order('created_at', { ascending: false })

    const { active } = req.query
    if (active === 'true') query = query.eq('active', true)
    else if (active === 'false') query = query.eq('active', false)

    const { data, error } = await query
    if (error) throw error
    res.json({ subscribers: data })
  } catch (err) {
    internalError(res, 'GET /api/subscribers', err)
  }
})

// ─── PATCH /api/subscribers/:id (auth, самоотписка) ───────

app.patch(
  '/api/subscribers/:id',
  authMiddleware,
  validateParamId('id'),
  async (req, res) => {
    try {
      const id = req.validatedId

      const { data: existing } = await supabase
        .from('subscribers')
        .select('id, user_id')
        .eq('id', id)
        .maybeSingle()

      if (!existing) return apiError(res, 404, 'Подписчик не найден')

      if (existing.user_id !== req.user.id && req.role !== 'admin') {
        return apiError(res, 403, 'Нет прав на изменение чужой подписки')
      }

      const { data, error } = await supabase
        .from('subscribers')
        .update({ active: false })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      res.json({ message: 'Подписка деактивирована', subscriber: data })
    } catch (err) {
      internalError(res, 'PATCH /api/subscribers/:id', err)
    }
  },
)

// ─── PATCH /api/subscribers/:id/deactivate (admin only) ───

app.patch(
  '/api/subscribers/:id/deactivate',
  authMiddleware,
  requireRole('admin'),
  validateParamId('id'),
  async (req, res) => {
    try {
      const id = req.validatedId

      const { data: existing } = await supabase
        .from('subscribers')
        .select('id')
        .eq('id', id)
        .maybeSingle()

      if (!existing) return apiError(res, 404, 'Подписчик не найден')

      const { data, error } = await supabase
        .from('subscribers')
        .update({ active: false })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      res.json({ message: 'Подписчик деактивирован', subscriber: data })
    } catch (err) {
      internalError(res, 'PATCH /api/subscribers/:id/deactivate', err)
    }
  },
)

// ═══════════════════════════════════════════════════════════
// PROFILE — защищённые маршруты
// ═══════════════════════════════════════════════════════════

app.get('/api/profile', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', req.user.id)
      .maybeSingle()

    if (error) throw error
    res.json({ profile: data })
  } catch (err) {
    internalError(res, 'GET /api/profile', err)
  }
})

app.put('/api/profile', authMiddleware, async (req, res) => {
  try {
    const { telegram, email: newsletterEmail } = req.body ?? {}
    const userId = req.user.id

    const tg = typeof telegram === 'string' ? telegram.replace(/^@/, '').trim() : null
    const em = typeof newsletterEmail === 'string' ? newsletterEmail.trim() : null

    if (em) {
      const emailErr = validateEmail(em)
      if (emailErr) return apiError(res, 400, emailErr)
    }

    const payload = {
      user_id: userId,
      newsletter_email: em || null,
      telegram_username: tg || null,
      email_notifications: Boolean(em),
      telegram_notifications: Boolean(tg),
      consent_accepted_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('profiles')
      .upsert(payload, { onConflict: 'user_id' })
      .select()
      .single()

    if (error) throw error
    res.json({ profile: data })
  } catch (err) {
    internalError(res, 'PUT /api/profile', err)
  }
})

app.delete('/api/user/stored-readings', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id
    for (const table of ['daily_predictions', 'birth_profiles', 'profiles']) {
      const { error } = await supabase.from(table).delete().eq('user_id', userId)
      if (error) throw error
    }
    res.json({ message: 'Данные удалены' })
  } catch (err) {
    internalError(res, 'DELETE /api/user/stored-readings', err)
  }
})

// ═══════════════════════════════════════════════════════════
// PREDICTION — авторизация + rate limit
// ═══════════════════════════════════════════════════════════

app.get(
  '/api/prediction',
  authMiddleware,
  predictionLimiter,
  validateQueryBirthDate('birthDate'),
  async (req, res) => {
    try {
      const { birthDate } = req.query

      const sign = getZodiacSign(birthDate)
      if (!sign) return apiError(res, 400, 'Не удалось определить знак зодиака')

      const today = todayISO()

      const { data: cached } = await supabase
        .from('predictions')
        .select('*')
        .eq('sign', sign.name)
        .eq('date', today)
        .maybeSingle()

      if (cached) {
        return res.json({
          sign: cached.sign,
          prediction: cached.prediction,
          luckyNumber: cached.lucky_number,
          color: cached.color,
          cached: true,
        })
      }

      const todayFormatted = new Date().toLocaleDateString('ru-RU', {
        day: 'numeric', month: 'long', year: 'numeric',
      })

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0.9,
        max_tokens: 400,
        messages: [
          {
            role: 'system',
            content:
              'Ты — ведический астролог. Отвечай на русском. ' +
              'Дай краткий персональный гороскоп на сегодня (3–5 предложений). ' +
              'Тон: тёплый, поддерживающий, без негатива. ' +
              'Не упоминай, что ты ИИ.',
          },
          {
            role: 'user',
            content: `Знак зодиака: ${sign.name} (${sign.nameEn}). Дата: ${todayFormatted}. Дай гороскоп на сегодня.`,
          },
        ],
      })

      const prediction = completion.choices[0]?.message?.content?.trim() || ''
      const luckyNumber = randomInt(1, 99)
      const color = COLORS[randomInt(0, COLORS.length - 1)]

      await supabase.from('predictions').upsert(
        { sign: sign.name, prediction, lucky_number: luckyNumber, color, date: today },
        { onConflict: 'sign,date' },
      )

      res.json({ sign: sign.name, prediction, luckyNumber, color, cached: false })
    } catch (err) {
      internalError(res, 'GET /api/prediction', err)
    }
  },
)

// ─── Health (открытый) ────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() })
})

// ─── Глобальный обработчик ошибок ─────────────────────────

app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err)
  if (!res.headersSent) {
    apiError(res, 500, 'Внутренняя ошибка сервера')
  }
})

// ─── Start ────────────────────────────────────────────────

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Star Oracle backend → http://localhost:${PORT}`)

  startBot()
  scheduleDailySend()
})
