import { test } from '@playwright/test'

const SKIP =
  'Недоступно в браузерном e2e: сценарий выполняется в клиенте Telegram. Проверка вручную или интеграционными тестами API/бота.'

test('пользователь вводит команду /prognoz и дату, подписывается на ежедневные прогнозы', async () => {
  test.skip(true, SKIP)
})

test('пользователь не может оформить вторую подписку с тем же Telegram (тот же chat)', async () => {
  test.skip(true, `${SKIP} Ожидание: повтор /prognoz из того же чата обновляет запись, вторая строка не создаётся.`)
})

test('каждое утро пользователь получает гороскоп в Telegram без своих действий', async () => {
  test.skip(true, `${SKIP} Рассылка по cron на бэкенде в 08:00 МСК.`)
})

test('после команды /stop рассылка в Telegram прекращается', async () => {
  test.skip(true, `${SKIP} Проверка: active=false в subscribers после /stop.`)
})
