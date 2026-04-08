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
const MAX_RETRIES = 2

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function generateWithRetry(sign, today, attempt = 1) {
  try {
    return await generatePrediction(sign, today)
  } catch (err) {
    if (attempt >= MAX_RETRIES) throw err
    log.warn('CRON', `Ошибка генерации для ${sign.name} (попытка ${attempt}/${MAX_RETRIES}), повтор через 5 мин`, err.message)
    await sleep(RETRY_DELAY_MS)
    return generateWithRetry(sign, today, attempt + 1)
  }
}

async function sendDailyHoroscopes() {
  const bot = getBot()
  if (!bot) {
    log.warn('CRON', 'Бот не инициализирован, пропускаем рассылку')
    return
  }

  log.info('CRON', 'Начинаем утреннюю рассылку…')

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

  log.info('CRON', `Найдено ${subscribers.length} активных подписчиков`)

  const bySign = {}
  for (const sub of subscribers) {
    const signName = sub.zodiac_sign || getZodiacSign(sub.birth_date)?.name
    if (!signName) continue
    if (!bySign[signName]) bySign[signName] = []
    bySign[signName].push(sub)
  }

  const today = new Date().toISOString().slice(0, 10)
  let sent = 0
  let failed = 0

  for (const [signName, subs] of Object.entries(bySign)) {
    let prediction
    try {
      const sign = { name: signName, nameEn: '' }
      const signData = getZodiacSign(subs[0].birth_date)
      if (signData) sign.nameEn = signData.nameEn

      prediction = await generateWithRetry(sign, today)
      log.info('CRON', `Прогноз для ${signName} готов → ${subs.length} получателей`)
    } catch (err) {
      log.error('CRON', `Не удалось сгенерировать прогноз для ${signName} после ${MAX_RETRIES} попыток`, err.message)
      failed += subs.length
      continue
    }

    const text = formatPrediction(signName, prediction.prediction, prediction.lucky_number, prediction.color)

    for (const sub of subs) {
      try {
        await bot.api.sendMessage(sub.telegram_chat_id, text)
        sent++
        log.bot('out', sub.telegram_chat_id, 'daily', signName)
      } catch (err) {
        const code = err?.error_code || err?.on?.payload?.error_code
        if (code === 403) {
          log.warn('CRON', `Бот заблокирован пользователем ${sub.telegram_chat_id}, деактивируем`)
          await supabase
            .from('subscribers')
            .update({ active: false })
            .eq('id', sub.id)
        } else {
          log.error('CRON', `Ошибка отправки ${sub.telegram_chat_id}`, err.message)
        }
        failed++
      }

      await sleep(SEND_DELAY_MS)
    }
  }

  log.info('CRON', `Рассылка завершена — отправлено: ${sent}, ошибок: ${failed}`)
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
