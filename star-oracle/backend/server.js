import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { getZodiacSign } from './zodiac.js'

const app = express()
app.use(cors())
app.use(express.json())

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// ─── Helpers ──────────────────────────────────────────────

function apiError(res, status, message) {
  return res.status(status).json({ error: message })
}

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

// ─── POST /api/subscribers ────────────────────────────────
// Создать подписчика. zodiac_sign вычисляется один раз.
// Если email уже есть — вернуть существующую запись.

app.post('/api/subscribers', async (req, res) => {
  try {
    const { email, birthDate } = req.body

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return apiError(res, 400, 'Укажите корректный email')
    }
    if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
      return apiError(res, 400, 'birthDate должен быть в формате YYYY-MM-DD')
    }

    const normalized = email.toLowerCase().trim()

    const { data: existing } = await supabase
      .from('subscribers')
      .select('*')
      .eq('email', normalized)
      .maybeSingle()

    if (existing) {
      return res.json({ subscriber: existing, isNew: false })
    }

    const sign = getZodiacSign(birthDate)

    const { data, error } = await supabase
      .from('subscribers')
      .insert({
        email: normalized,
        birth_date: birthDate,
        zodiac_sign: sign?.name ?? null,
      })
      .select()
      .single()

    if (error) throw error
    res.status(201).json({ subscriber: data, isNew: true })
  } catch (err) {
    console.error('POST /api/subscribers', err)
    apiError(res, 500, err.message)
  }
})

// ─── GET /api/subscribers?email=... ───────────────────────

app.get('/api/subscribers', async (req, res) => {
  try {
    const { email } = req.query
    if (!email) return apiError(res, 400, 'Параметр email обязателен')

    const { data, error } = await supabase
      .from('subscribers')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle()

    if (error) throw error
    if (!data) return apiError(res, 404, 'Подписчик не найден')

    res.json({ subscriber: data })
  } catch (err) {
    console.error('GET /api/subscribers', err)
    apiError(res, 500, err.message)
  }
})

// ─── PATCH /api/subscribers/:id ───────────────────────────
// Отписка: устанавливает active = false

app.patch('/api/subscribers/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!id || id < 1) return apiError(res, 400, 'Некорректный id')

    const { data, error } = await supabase
      .from('subscribers')
      .update({ active: false })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    if (!data) return apiError(res, 404, 'Подписчик не найден')

    res.json({ subscriber: data })
  } catch (err) {
    console.error('PATCH /api/subscribers/:id', err)
    apiError(res, 500, err.message)
  }
})

// ─── GET /api/prediction?birthDate=YYYY-MM-DD ─────────────
// 1) Вычислить знак через getZodiacSign(birthDate)
// 2) Проверить кэш в predictions (sign + today)
// 3) Если нет — запросить OpenAI, сохранить в predictions
// 4) Вернуть { sign, prediction, luckyNumber, color }

app.get('/api/prediction', async (req, res) => {
  try {
    const { birthDate } = req.query
    if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
      return apiError(res, 400, 'birthDate обязателен (YYYY-MM-DD)')
    }

    const sign = getZodiacSign(birthDate)
    if (!sign) return apiError(res, 400, 'Не удалось определить знак зодиака')

    const today = todayISO()

    // Check cache
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

    // Generate via OpenAI
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

    // Save to cache
    await supabase.from('predictions').upsert(
      {
        sign: sign.name,
        prediction,
        lucky_number: luckyNumber,
        color,
        date: today,
      },
      { onConflict: 'sign,date' },
    )

    res.json({ sign: sign.name, prediction, luckyNumber, color, cached: false })
  } catch (err) {
    console.error('GET /api/prediction', err)
    apiError(res, 500, err.message)
  }
})

// ─── Health ───────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() })
})

// ─── Start ────────────────────────────────────────────────

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Star Oracle backend → http://localhost:${PORT}`)
})
