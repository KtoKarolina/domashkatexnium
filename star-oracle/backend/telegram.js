import { Bot, GrammyError, HttpError } from 'grammy'
import { createClient } from '@supabase/supabase-js'
import { getZodiacSign } from './zodiac.js'
import { validateBirthDate } from './validate.js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

let bot = null

export function getBot() {
  return bot
}

export function startBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) {
    console.warn('TELEGRAM_BOT_TOKEN не задан — бот не запущен')
    return null
  }

  bot = new Bot(token)

  // ─── /start ──────────────────────────────────────────────
  bot.command('start', async (ctx) => {
    await ctx.reply(
      '✨ Привет! Я *Звёздный Оракул*.\n\n' +
      'Подпишись на ежедневный гороскоп:\n' +
      '`/subscribe 1990-05-15`\n\n' +
      'Доступные команды:\n' +
      '/subscribe YYYY-MM-DD — подписаться\n' +
      '/horoscope — получить гороскоп сейчас\n' +
      '/unsubscribe — отписаться\n' +
      '/status — проверить подписку',
      { parse_mode: 'Markdown' },
    )
  })

  // ─── /subscribe YYYY-MM-DD ───────────────────────────────
  bot.command('subscribe', async (ctx) => {
    const birthDate = ctx.match?.trim()
    if (!birthDate) {
      return ctx.reply('Укажите дату рождения: `/subscribe 1990-05-15`', { parse_mode: 'Markdown' })
    }

    const dateErr = validateBirthDate(birthDate)
    if (dateErr) {
      return ctx.reply(`❌ ${dateErr}`)
    }

    const sign = getZodiacSign(birthDate)
    if (!sign) {
      return ctx.reply('❌ Не удалось определить знак зодиака')
    }

    const chatId = ctx.chat.id

    const { data: existing } = await supabase
      .from('subscribers')
      .select('*')
      .eq('telegram_chat_id', chatId)
      .maybeSingle()

    if (existing) {
      if (!existing.active) {
        await supabase
          .from('subscribers')
          .update({ active: true, birth_date: birthDate, zodiac_sign: sign.name })
          .eq('id', existing.id)
      } else if (existing.telegram_chat_id !== chatId) {
        await supabase
          .from('subscribers')
          .update({ telegram_chat_id: chatId })
          .eq('id', existing.id)
      }

      return ctx.reply(
        `Вы уже подписаны (*${existing.zodiac_sign || sign.name}*) 🌟\n` +
        'Каждое утро в 8:00 я пришлю персональный прогноз.',
        { parse_mode: 'Markdown' },
      )
    }

    const { error } = await supabase
      .from('subscribers')
      .insert({
        email: `tg_${chatId}@telegram.local`,
        birth_date: birthDate,
        zodiac_sign: sign.name,
        telegram_chat_id: chatId,
        active: true,
      })

    if (error) {
      console.error('telegram /subscribe insert error:', error)
      return ctx.reply('❌ Не удалось оформить подписку. Попробуйте позже.')
    }

    await ctx.reply(
      `*${sign.name}*, добро пожаловать! 🌟\n` +
      'Каждое утро в 8:00 я пришлю тебе персональный прогноз.',
      { parse_mode: 'Markdown' },
    )
  })

  // ─── /horoscope ──────────────────────────────────────────
  bot.command('horoscope', async (ctx) => {
    const chatId = ctx.chat.id

    const { data: sub } = await supabase
      .from('subscribers')
      .select('*')
      .eq('telegram_chat_id', chatId)
      .maybeSingle()

    if (!sub) {
      return ctx.reply('Вы не подписаны. Используйте `/subscribe YYYY-MM-DD`', { parse_mode: 'Markdown' })
    }

    const sign = getZodiacSign(sub.birth_date)
    if (!sign) {
      return ctx.reply('❌ Не удалось определить знак зодиака')
    }

    const today = new Date().toISOString().slice(0, 10)

    const { data: cached } = await supabase
      .from('predictions')
      .select('*')
      .eq('sign', sign.name)
      .eq('date', today)
      .maybeSingle()

    if (cached) {
      return ctx.reply(formatPrediction(sign.name, cached.prediction, cached.lucky_number, cached.color), {
        parse_mode: 'Markdown',
      })
    }

    await ctx.reply('🔮 Генерирую прогноз…')

    try {
      const prediction = await generatePrediction(sign, today)
      await ctx.reply(formatPrediction(sign.name, prediction.prediction, prediction.lucky_number, prediction.color), {
        parse_mode: 'Markdown',
      })
    } catch (err) {
      console.error('telegram /horoscope generation error:', err)
      await ctx.reply('❌ Не удалось сгенерировать прогноз. Попробуйте позже.')
    }
  })

  // ─── /unsubscribe ────────────────────────────────────────
  bot.command('unsubscribe', async (ctx) => {
    const chatId = ctx.chat.id

    const { data: sub } = await supabase
      .from('subscribers')
      .select('id, active')
      .eq('telegram_chat_id', chatId)
      .maybeSingle()

    if (!sub) {
      return ctx.reply('Вы не подписаны. Используйте `/subscribe YYYY-MM-DD`', { parse_mode: 'Markdown' })
    }

    if (!sub.active) {
      return ctx.reply('Подписка уже отключена.')
    }

    await supabase
      .from('subscribers')
      .update({ active: false })
      .eq('id', sub.id)

    await ctx.reply('Подписка отключена. Чтобы вернуться: `/subscribe YYYY-MM-DD`', { parse_mode: 'Markdown' })
  })

  // ─── /status ─────────────────────────────────────────────
  bot.command('status', async (ctx) => {
    const chatId = ctx.chat.id

    const { data: sub } = await supabase
      .from('subscribers')
      .select('zodiac_sign, active, birth_date')
      .eq('telegram_chat_id', chatId)
      .maybeSingle()

    if (!sub) {
      return ctx.reply('Вы не подписаны. Используйте `/subscribe YYYY-MM-DD`', { parse_mode: 'Markdown' })
    }

    const status = sub.active ? '✅ Активна' : '❌ Отключена'
    await ctx.reply(
      `Знак: *${sub.zodiac_sign}*\n` +
      `Дата рождения: ${sub.birth_date}\n` +
      `Подписка: ${status}`,
      { parse_mode: 'Markdown' },
    )
  })

  // ─── Error handler ───────────────────────────────────────
  bot.catch((err) => {
    const e = err.error
    if (e instanceof GrammyError) {
      console.error('Grammy error:', e.description)
    } else if (e instanceof HttpError) {
      console.error('HTTP error:', e)
    } else {
      console.error('Bot error:', e)
    }
  })

  bot.start()
  console.log('Telegram bot started (long-polling)')

  return bot
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
    `*${signName}* — ${todayFormatted}\n\n` +
    `${prediction}\n\n` +
    `Число дня: *${luckyNumber}*\n` +
    `Цвет дня: *${color}*`
  )
}

export async function generatePrediction(sign, today) {
  const { data: cached } = await supabase
    .from('predictions')
    .select('*')
    .eq('sign', sign.name)
    .eq('date', today)
    .maybeSingle()

  if (cached) {
    return cached
  }

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

  await supabase.from('predictions').upsert(
    { sign: sign.name, prediction, lucky_number: luckyNumber, color, date: today },
    { onConflict: 'sign,date' },
  )

  return { sign: sign.name, prediction, lucky_number: luckyNumber, color, date: today }
}
