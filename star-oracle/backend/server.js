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

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

const COLORS = [
  'золотой', 'серебряный', 'лавандовый', 'изумрудный',
  'рубиновый', 'сапфировый', 'янтарный', 'бирюзовый',
  'коралловый', 'аметистовый', 'жемчужный', 'бронзовый',
]

// ─── POST /api/subscribers ────────────────────────────────
// Создать подписчика. Если email уже есть — вернуть существующую запись.

app.post('/api/subscribers', async (req, res) => {
  try {
    const { email, birthDate } = req.body

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Укажите корректный email' })
    }
    if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
      return res.status(400).json({ error: 'birthDate должен быть в формате YYYY-MM-DD' })
    }

    const existing = await supabase
      .from('subscribers')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle()

    if (existing.data) {
      return res.json({ subscriber: existing.data, isNew: false })
    }

    const { data, error } = await supabase
      .from('subscribers')
      .insert({ email: email.toLowerCase().trim(), birth_date: birthDate })
      .select()
      .single()

    if (error) throw error
    res.status(201).json({ subscriber: data, isNew: true })
  } catch (err) {
    console.error('POST /api/subscribers', err)
    res.status(500).json({ error: err.message })
  }
})

// ─── GET /api/subscribers?email=... ───────────────────────
// Получить подписчика по email

app.get('/api/subscribers', async (req, res) => {
  try {
    const email = req.query.email
    if (!email) return res.status(400).json({ error: 'Параметр email обязателен' })

    const { data, error } = await supabase
      .from('subscribers')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle()

    if (error) throw error
    if (!data) return res.status(404).json({ error: 'Подписчик не найден' })

    res.json({ subscriber: data })
  } catch (err) {
    console.error('GET /api/subscribers', err)
    res.status(500).json({ error: err.message })
  }
})

// ─── GET /api/prediction?birthDate=YYYY-MM-DD ─────────────
// Вычислить знак зодиака, запросить OpenAI, вернуть предсказание

app.get('/api/prediction', async (req, res) => {
  try {
    const { birthDate } = req.query
    if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
      return res.status(400).json({ error: 'birthDate обязателен (YYYY-MM-DD)' })
    }

    const sign = getZodiacSign(birthDate)
    if (!sign) {
      return res.status(400).json({ error: 'Не удалось определить знак зодиака' })
    }

    const today = new Date().toLocaleDateString('ru-RU', {
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
          content: `Знак зодиака: ${sign.name} (${sign.nameEn}). Дата: ${today}. Дай гороскоп на сегодня.`,
        },
      ],
    })

    const prediction = completion.choices[0]?.message?.content?.trim() || ''

    res.json({
      sign: sign.name,
      prediction,
      luckyNumber: randomInt(1, 99),
      color: COLORS[randomInt(0, COLORS.length - 1)],
    })
  } catch (err) {
    console.error('GET /api/prediction', err)
    res.status(500).json({ error: err.message })
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
