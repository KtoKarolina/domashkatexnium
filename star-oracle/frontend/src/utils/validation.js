export function isValidEmail(s) {
  const t = s.trim()
  if (!t) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)
}

export function isValidTelegramUsername(s) {
  const u = s.replace(/^@/, '').trim()
  if (!u) return false
  return /^[a-zA-Z][a-zA-Z0-9_]{4,31}$/.test(u)
}

export function validateBirthForm(date, city) {
  const err = {}
  if (!date || !String(date).trim()) err.date = 'Укажите дату рождения'
  else {
    const d = new Date(`${date}T12:00:00`)
    if (Number.isNaN(d.getTime())) err.date = 'Некорректная дата'
    else if (d > new Date()) err.date = 'Дата не может быть в будущем'
  }
  const c = city.trim()
  if (c.length > 80) err.city = 'Не более 80 символов'
  else if (c && !/^[а-яА-ЯёЁa-zA-Z0-9\s\-.,()]+$/.test(c)) {
    err.city = 'Допустимы буквы, цифры, пробел и символы - . ( )'
  }
  return err
}

export function validateSubscribeForm(email, telegram, agree) {
  const err = {}
  if (!agree) err.agree = 'Нужно согласие на рассылку'
  const em = email.trim()
  const tg = telegram.replace(/^@/, '').trim()
  if (!em && !tg) err.contact = 'Укажите email или Telegram (хотя бы одно)'
  if (em && !isValidEmail(em)) err.email = 'Некорректный формат email'
  if (tg && !isValidTelegramUsername(telegram)) {
    err.telegram = 'Логин 5–32 символов: латиница, цифры, _ (с @ или без)'
  }
  return err
}
