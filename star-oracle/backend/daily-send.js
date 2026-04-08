import cron from 'node-cron'
import { createClient } from '@supabase/supabase-js'
import { getZodiacSign } from './zodiac.js'
import { getBot, generatePrediction, formatPrediction } from './telegram.js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

const SEND_DELAY_MS = 35

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function sendDailyHoroscopes() {
  const bot = getBot()
  if (!bot) {
    console.warn('daily-send: бот не инициализирован, пропускаем рассылку')
    return
  }

  console.log('daily-send: начинаем утреннюю рассылку…')

  const { data: subscribers, error } = await supabase
    .from('subscribers')
    .select('id, telegram_chat_id, zodiac_sign, birth_date')
    .eq('active', true)
    .not('telegram_chat_id', 'is', null)

  if (error) {
    console.error('daily-send: ошибка выборки подписчиков:', error)
    return
  }

  if (!subscribers?.length) {
    console.log('daily-send: нет активных Telegram-подписчиков')
    return
  }

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

      prediction = await generatePrediction(sign, today)
    } catch (err) {
      console.error(`daily-send: ошибка генерации для ${signName}:`, err.message)
      failed += subs.length
      continue
    }

    const text = formatPrediction(signName, prediction.prediction, prediction.lucky_number, prediction.color)

    for (const sub of subs) {
      try {
        await bot.api.sendMessage(sub.telegram_chat_id, text, { parse_mode: 'Markdown' })
        sent++
      } catch (err) {
        if (err?.error_code === 403) {
          console.log(`daily-send: бот заблокирован пользователем ${sub.telegram_chat_id}, деактивируем`)
          await supabase
            .from('subscribers')
            .update({ active: false })
            .eq('id', sub.id)
        } else {
          console.error(`daily-send: ошибка отправки ${sub.telegram_chat_id}:`, err.message)
        }
        failed++
      }

      await sleep(SEND_DELAY_MS)
    }
  }

  console.log(`daily-send: рассылка завершена — отправлено: ${sent}, ошибок: ${failed}`)
}

export function scheduleDailySend() {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) {
    console.warn('TELEGRAM_BOT_TOKEN не задан — cron рассылки не запущен')
    return
  }

  // 08:00 МСК = 05:00 UTC
  cron.schedule('0 5 * * *', () => {
    sendDailyHoroscopes().catch((err) => {
      console.error('daily-send: необработанная ошибка:', err)
    })
  }, { timezone: 'Europe/Moscow' })

  console.log('Cron: ежедневная рассылка запланирована на 08:00 МСК')
}

export { sendDailyHoroscopes }
