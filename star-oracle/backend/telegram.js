import { Bot, GrammyError, HttpError } from 'grammy'
import { createClient } from '@supabase/supabase-js'
import { getZodiacSign } from './zodiac.js'
import { log } from './logger.js'
import { generateLocalForecast } from './local-forecast.js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

let bot = null

export function getBot() {
  return bot
}

async function reply(ctx, text, opts) {
  const chatId = ctx.chat?.id ?? '?'
  const preview = text.slice(0, 80).replace(/\n/g, ' ')
  log.bot('out', chatId, 'reply', preview)
  return ctx.reply(text, opts)
}

/**
 * Парсит дату в формате ДД.ММ.ГГГГ → YYYY-MM-DD (для БД).
 * Возвращает { iso, error }.
 */
function parseBirthInput(raw) {
  if (!raw || typeof raw !== 'string') {
    return { iso: null, error: 'Укажите дату рождения в формате ДД.ММ.ГГГГ, например: /prognoz 21.10.1999' }
  }

  const m = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (!m) {
    return { iso: null, error: 'Неверный формат даты. Используйте ДД.ММ.ГГГГ, например: /prognoz 21.10.1999' }
  }

  const day = parseInt(m[1], 10)
  const month = parseInt(m[2], 10)
  const year = parseInt(m[3], 10)

  if (month < 1 || month > 12) return { iso: null, error: 'Месяц должен быть от 01 до 12' }
  if (day < 1 || day > 31) return { iso: null, error: 'День должен быть от 01 до 31' }
  if (year < 1900) return { iso: null, error: 'Год не может быть раньше 1900' }

  const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  const d = new Date(iso + 'T12:00:00')
  if (Number.isNaN(d.getTime())) {
    return { iso: null, error: 'Неверная дата. Проверьте день и месяц.' }
  }
  if (d > new Date()) {
    return { iso: null, error: 'Дата рождения не может быть в будущем' }
  }

  return { iso, error: null }
}

export function startBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) {
    log.warn('BOT', 'TELEGRAM_BOT_TOKEN не задан — бот не запущен')
    return null
  }

  bot = new Bot(token)

  // ─── /start ──────────────────────────────────────────────
  bot.command('start', async (ctx) => {
    log.bot('in', ctx.chat.id, 'start')
    try {
      await reply(ctx,
        '✨ Привет! Я Звёздный Оракул.\n\n' +
        'Получи свой персональный гороскоп:\n' +
        '/prognoz 21.10.1999\n\n' +
        'Доступные команды:\n' +
        '/prognoz ДД.ММ.ГГГГ — подписаться и получить прогноз\n' +
        '/horoscope — получить гороскоп сейчас\n' +
        '/unsubscribe — отписаться\n' +
        '/status — проверить подписку',
      )
    } catch (err) {
      log.error('BOT', '/start error', err.message)
    }
  })

  // ─── /prognoz ДД.ММ.ГГГГ ────────────────────────────────
  bot.command('prognoz', async (ctx) => {
    const chatId = ctx.chat.id
    const rawDate = ctx.match?.trim()
    log.bot('in', chatId, 'prognoz', rawDate || '(пусто)')

    try {
      if (!rawDate) {
        return reply(ctx, 'Укажите дату рождения: /prognoz 21.10.1999')
      }

      const { iso: birthDate, error: dateErr } = parseBirthInput(rawDate)
      if (dateErr) {
        return reply(ctx, `❌ ${dateErr}`)
      }

      const sign = getZodiacSign(birthDate)
      if (!sign) {
        return reply(ctx, '❌ Не удалось определить знак зодиака')
      }

      const { data: existing, error: selErr } = await supabase
        .from('subscribers')
        .select('*')
        .eq('telegram_chat_id', chatId)
        .maybeSingle()

      if (selErr) {
        log.error('BOT', '/prognoz select error', selErr.message)
        return reply(ctx, '❌ Ошибка базы данных. Попробуйте позже.')
      }

      if (existing) {
        if (!existing.active) {
          const { error: upErr } = await supabase
            .from('subscribers')
            .update({ active: true, birth_date: birthDate, zodiac_sign: sign.name })
            .eq('id', existing.id)
          if (upErr) log.error('BOT', '/prognoz reactivate error', upErr.message)
          log.info('BOT', `Подписчик ${chatId} реактивирован (${sign.name})`)
        } else {
          log.info('BOT', `Подписчик ${chatId} уже подписан (${existing.zodiac_sign})`)
        }
      } else {
        const { error: insErr } = await supabase
          .from('subscribers')
          .insert({
            email: `tg_${chatId}@telegram.local`,
            birth_date: birthDate,
            zodiac_sign: sign.name,
            telegram_chat_id: chatId,
            active: true,
          })

        if (insErr) {
          log.error('BOT', '/prognoz insert error', insErr.message)
          return reply(ctx, '❌ Не удалось оформить подписку. Попробуйте позже.')
        }

        log.info('BOT', `Новый подписчик ${chatId} → ${sign.name}`)
      }

      await reply(ctx,
        `${sign.name}, добро пожаловать! 🌟\n` +
        'Каждое утро в 8:00 я пришлю персональный прогноз.\n\n' +
        '🔮 Генерирую гороскоп…',
      )

      await sendPredictionSafe(ctx, sign, birthDate)
    } catch (err) {
      log.error('BOT', '/prognoz unhandled error', err.message)
      await ctx.reply('❌ Произошла ошибка. Попробуйте позже.').catch(() => {})
    }
  })

  // ─── /horoscope ──────────────────────────────────────────
  bot.command('horoscope', async (ctx) => {
    const chatId = ctx.chat.id
    log.bot('in', chatId, 'horoscope')

    try {
      const { data: sub, error: selErr } = await supabase
        .from('subscribers')
        .select('*')
        .eq('telegram_chat_id', chatId)
        .maybeSingle()

      if (selErr) {
        log.error('BOT', '/horoscope select error', selErr.message)
        return reply(ctx, '❌ Ошибка базы данных. Попробуйте позже.')
      }

      if (!sub) {
        return reply(ctx, 'Вы не подписаны. Используйте /prognoz ДД.ММ.ГГГГ')
      }

      const sign = getZodiacSign(sub.birth_date)
      if (!sign) {
        return reply(ctx, '❌ Не удалось определить знак зодиака')
      }

      await reply(ctx, '🔮 Генерирую прогноз…')
      await sendPredictionSafe(ctx, sign, sub.birth_date)
    } catch (err) {
      log.error('BOT', '/horoscope unhandled error', err.message)
      await ctx.reply('❌ Не удалось сгенерировать прогноз. Попробуйте позже.').catch(() => {})
    }
  })

  // ─── /unsubscribe ────────────────────────────────────────
  bot.command('unsubscribe', async (ctx) => {
    const chatId = ctx.chat.id
    log.bot('in', chatId, 'unsubscribe')

    try {
      const { data: sub, error: selErr } = await supabase
        .from('subscribers')
        .select('id, active')
        .eq('telegram_chat_id', chatId)
        .maybeSingle()

      if (selErr) {
        log.error('BOT', '/unsubscribe select error', selErr.message)
        return reply(ctx, '❌ Ошибка базы данных. Попробуйте позже.')
      }

      if (!sub) {
        return reply(ctx, 'Вы не подписаны. Используйте /prognoz ДД.ММ.ГГГГ')
      }

      if (!sub.active) {
        return reply(ctx, 'Подписка уже отключена.')
      }

      const { error: upErr } = await supabase
        .from('subscribers')
        .update({ active: false })
        .eq('id', sub.id)

      if (upErr) {
        log.error('BOT', '/unsubscribe update error', upErr.message)
        return reply(ctx, '❌ Не удалось отписаться. Попробуйте позже.')
      }

      log.info('BOT', `Подписчик ${chatId} отписался`)
      await reply(ctx, 'Подписка отключена. Чтобы вернуться: /prognoz ДД.ММ.ГГГГ')
    } catch (err) {
      log.error('BOT', '/unsubscribe unhandled error', err.message)
      await ctx.reply('❌ Произошла ошибка. Попробуйте позже.').catch(() => {})
    }
  })

  // ─── /status ─────────────────────────────────────────────
  bot.command('status', async (ctx) => {
    const chatId = ctx.chat.id
    log.bot('in', chatId, 'status')

    try {
      const { data: sub, error: selErr } = await supabase
        .from('subscribers')
        .select('zodiac_sign, active, birth_date')
        .eq('telegram_chat_id', chatId)
        .maybeSingle()

      if (selErr) {
        log.error('BOT', '/status select error', selErr.message)
        return reply(ctx, '❌ Ошибка базы данных. Попробуйте позже.')
      }

      if (!sub) {
        return reply(ctx, 'Вы не подписаны. Используйте /prognoz ДД.ММ.ГГГГ')
      }

      const status = sub.active ? '✅ Активна' : '❌ Отключена'
      await reply(ctx,
        `Знак: ${sub.zodiac_sign}\n` +
        `Дата рождения: ${sub.birth_date}\n` +
        `Подписка: ${status}`,
      )
    } catch (err) {
      log.error('BOT', '/status unhandled error', err.message)
      await ctx.reply('❌ Произошла ошибка. Попробуйте позже.').catch(() => {})
    }
  })

  // ─── Обработка текстовых сообщений (не команд) ──────────
  bot.on('message:text', async (ctx) => {
    const chatId = ctx.chat.id
    const text = ctx.message.text.trim()
    log.bot('in', chatId, 'text', text.slice(0, 60))

    try {
      if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(text)) {
        return reply(ctx, `Похоже, вы отправили дату. Используйте команду:\n/prognoz ${text}`)
      }
      if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        const parts = text.split('-')
        const dotDate = `${parts[2]}.${parts[1]}.${parts[0]}`
        return reply(ctx, `Используйте формат ДД.ММ.ГГГГ:\n/prognoz ${dotDate}`)
      }
      await reply(ctx,
        'Я понимаю только команды:\n' +
        '/prognoz ДД.ММ.ГГГГ — подписаться и получить прогноз\n' +
        '/horoscope — получить гороскоп\n' +
        '/unsubscribe — отписаться\n' +
        '/status — проверить подписку',
      )
    } catch (err) {
      log.error('BOT', 'text handler error', err.message)
    }
  })

  // ─── Error handler ───────────────────────────────────────
  bot.catch((err) => {
    const e = err.error
    if (e instanceof GrammyError) {
      log.error('BOT', 'Grammy error', e.description)
    } else if (e instanceof HttpError) {
      log.error('BOT', 'HTTP error', e.message)
    } else {
      log.error('BOT', 'Unhandled bot error', e?.message || String(e))
    }
  })

  bot.start()
  log.info('BOT', 'Telegram bot started (long-polling)')

  return bot
}

// ─── Неблокирующая отправка прогноза ─────────────────────────

async function sendPredictionSafe(ctx, sign, birthDate) {
  try {
    const today = new Date().toISOString().slice(0, 10)
    const prediction = await generatePrediction(sign, today, birthDate)
    await reply(ctx,
      formatPrediction(sign.name, prediction.prediction, prediction.lucky_number, prediction.color),
    )
  } catch (err) {
    log.error('BOT', `Не удалось сгенерировать прогноз для ${sign.name}`, err.message)
    await ctx.reply('⚠️ Не удалось сгенерировать прогноз. Попробуйте /horoscope позже.').catch(() => {})
  }
}

// ─── Shared helpers ──────────────────────────────────────────

const COLORS = [
  'золотой', 'серебряный', 'лавандовый', 'изумрудный',
  'рубиновый', 'сапфировый', 'янтарный', 'бирюзовый',
  'коралловый', 'аметистовый', 'жемчужный', 'бронзовый',
]

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function formatPrediction(signName, prediction, luckyNumber, color) {
  const todayFormatted = new Date().toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    `${signName} — ${todayFormatted}\n\n` +
    `${prediction}\n\n` +
    `Число дня: ${luckyNumber}\n` +
    `Цвет дня: ${color}`
  )
}

export async function generatePrediction(sign, today, birthDate) {
  // 1. Проверяем кэш
  const { data: cached } = await supabase
    .from('predictions')
    .select('*')
    .eq('sign', sign.name)
    .eq('date', today)
    .maybeSingle()

  if (cached) {
    log.info('BOT', `Прогноз для ${sign.name} — из кэша`)
    return cached
  }

  // 2. Пытаемся OpenAI (если ключ задан)
  if (process.env.OPENAI_API_KEY) {
    try {
      log.info('BOT', `Генерация прогноза для ${sign.name} через OpenAI…`)

      const OpenAI = (await import('openai')).default
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

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

      log.info('BOT', `Прогноз для ${sign.name} сгенерирован через OpenAI`)

      await supabase.from('predictions').upsert(
        { sign: sign.name, prediction, lucky_number: luckyNumber, color, date: today },
        { onConflict: 'sign,date' },
      )

      return { sign: sign.name, prediction, lucky_number: luckyNumber, color, date: today }
    } catch (err) {
      log.warn('BOT', `OpenAI недоступен для ${sign.name}, используем локальный генератор`, err.message)
    }
  }

  // 3. Fallback — локальный генератор
  log.info('BOT', `Генерация прогноза для ${sign.name} локально`)
  const bd = birthDate || today
  const local = generateLocalForecast(bd, today)
  const color = COLORS[randomInt(0, COLORS.length - 1)]

  const result = {
    sign: sign.name,
    prediction: local.mainText,
    lucky_number: local.luckyNumber,
    color,
    date: today,
  }

  try {
    await supabase.from('predictions').upsert(
      { sign: result.sign, prediction: result.prediction, lucky_number: result.lucky_number, color: result.color, date: today },
      { onConflict: 'sign,date' },
    )
  } catch (e) {
    log.warn('BOT', 'Не удалось сохранить прогноз в кэш', e.message)
  }

  return result
}
