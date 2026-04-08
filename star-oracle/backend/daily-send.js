import cron from 'node-cron'
import { createClient } from '@supabase/supabase-js'
import { getZodiacSign } from './zodiac.js'
import { getBot, generatePrediction, formatPrediction } from './telegram.js'
import { log } from './logger.js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

const SEND_DELAY_MS = 35
const RETRY_DELAY_MS = 5 * 60 * 1000
const BATCH_SIZE = 25

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

// ─── Генерация: 1 прогноз на знак, retry при ошибке OpenAI ──

async function generateAllPredictions(signs, today) {
  const predictions = {}

  for (const [signName, sampleBirthDate] of Object.entries(signs)) {
    const signData = getZodiacSign(sampleBirthDate)
    const sign = signData || { name: signName, nameEn: '' }

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        predictions[signName] = await generatePrediction(sign, today, sampleBirthDate)
        log.info('CRON', `Прогноз для ${signName} готов`)
        break
      } catch (err) {
        if (attempt < 2) {
          log.warn('CRON', `Ошибка генерации ${signName} (попытка ${attempt}/2), повтор через 5 мин`, err.message)
          await sleep(RETRY_DELAY_MS)
        } else {
          log.error('CRON', `Не удалось сгенерировать прогноз для ${signName} после 2 попыток`, err.message)
        }
      }
    }
  }

  return predictions
}

// ─── Отправка одному подписчику с retry ─────────────────────

async function sendToSubscriber(botApi, sub, text) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await botApi.sendMessage(sub.telegram_chat_id, text)
      return { ok: true }
    } catch (err) {
      const code = err?.error_code || err?.on?.payload?.error_code

      if (code === 403) {
        log.warn('CRON', `Бот заблокирован: chat ${sub.telegram_chat_id} → active=false`)
        await supabase.from('subscribers').update({ active: false }).eq('id', sub.id)
        return { ok: false, reason: 'blocked' }
      }

      if (code === 429) {
        const retryAfter = err?.parameters?.retry_after || 30
        log.warn('CRON', `Rate limit chat ${sub.telegram_chat_id}, жду ${retryAfter}с`)
        await sleep(retryAfter * 1000)
        continue
      }

      if (attempt < 2) {
        log.warn('CRON', `Ошибка отправки ${sub.telegram_chat_id} (попытка ${attempt}/2), retry через 5 мин`, err.message)
        await sleep(RETRY_DELAY_MS)
      } else {
        log.error('CRON', `Не доставлено ${sub.telegram_chat_id} после 2 попыток`, err.message)
        return { ok: false, reason: 'error' }
      }
    }
  }
  return { ok: false, reason: 'error' }
}

// ─── Пакетная отправка: батчами по BATCH_SIZE параллельно ───

async function sendBatch(botApi, subscribers, text, stats) {
  const tasks = subscribers.map(async (sub) => {
    const result = await sendToSubscriber(botApi, sub, text)
    if (result.ok) {
      stats.sent++
      log.bot('out', sub.telegram_chat_id, 'daily', sub.zodiac_sign)
    } else if (result.reason === 'blocked') {
      stats.blocked++
    } else {
      stats.failed++
    }
    await sleep(SEND_DELAY_MS)
  })

  await Promise.allSettled(tasks)
}

// ─── Основная рассылка ──────────────────────────────────────

async function sendDailyHoroscopes() {
  const bot = getBot()
  if (!bot) {
    log.warn('CRON', 'Бот не инициализирован, пропускаем рассылку')
    return
  }

  const startTime = Date.now()
  log.info('CRON', '═══ Начинаем утреннюю рассылку ═══')

  const { data: subscribers, error } = await supabase
    .from('subscribers')
    .select('id, telegram_chat_id, zodiac_sign, birth_date')
    .eq('active', true)
    .not('telegram_chat_id', 'is', null)

  if (error) {
    log.error('CRON', 'Ошибка выборки подписчиков', error.message)
    return
  }

  if (!subscribers?.length) {
    log.info('CRON', 'Нет активных Telegram-подписчиков')
    return
  }

  // Группировка по знакам + сбор одной даты рождения на знак для генерации
  const bySign = {}
  const signSample = {}
  for (const sub of subscribers) {
    const signName = sub.zodiac_sign || getZodiacSign(sub.birth_date)?.name
    if (!signName) continue
    if (!bySign[signName]) bySign[signName] = []
    bySign[signName].push(sub)
    if (!signSample[signName]) signSample[signName] = sub.birth_date
  }

  const signCount = Object.keys(bySign).length
  log.info('CRON', `Подписчиков: ${subscribers.length}, знаков: ${signCount}`)

  // 1 генерация на знак (не на подписчика)
  const today = new Date().toISOString().slice(0, 10)
  const predictions = await generateAllPredictions(signSample, today)

  const stats = { sent: 0, failed: 0, blocked: 0, skipped: 0 }

  for (const [signName, subs] of Object.entries(bySign)) {
    const prediction = predictions[signName]
    if (!prediction) {
      stats.skipped += subs.length
      log.warn('CRON', `Нет прогноза для ${signName}, пропускаем ${subs.length} подписчиков`)
      continue
    }

    const text = formatPrediction(signName, prediction.prediction, prediction.lucky_number, prediction.color)

    // Отправляем батчами
    for (let i = 0; i < subs.length; i += BATCH_SIZE) {
      const batch = subs.slice(i, i + BATCH_SIZE)
      await sendBatch(bot.api, batch, text, stats)
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  log.info('CRON',
    `═══ Рассылка завершена за ${elapsed}с ═══ ` +
    `отправлено: ${stats.sent}, ошибок: ${stats.failed}, ` +
    `заблокировано: ${stats.blocked}, пропущено: ${stats.skipped}`,
  )
}

export function scheduleDailySend() {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) {
    log.warn('CRON', 'TELEGRAM_BOT_TOKEN не задан — cron рассылки не запущен')
    return
  }

  cron.schedule('0 5 * * *', () => {
    sendDailyHoroscopes().catch((err) => {
      log.error('CRON', 'Необработанная ошибка рассылки', err.message)
    })
  }, { timezone: 'Europe/Moscow' })

  log.info('CRON', 'Ежедневная рассылка запланирована на 08:00 МСК')
}

export { sendDailyHoroscopes }
