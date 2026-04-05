import { useEffect, useMemo, useState } from 'react'
import { NavLink, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { CosmicStars } from './CosmicStars.jsx'
import { MOCK_COMPATIBILITY, MOCK_DAILY_FORECAST, MOCK_LEGAL } from './mockData.js'

/** Ключи localStorage для данных профиля */
const LS_BIRTH = 'star-oracle-birth'
const LS_PARTNER = 'star-oracle-partner-birth'
const LS_PROFILE = 'star-oracle-profile-prefs'

function readProfilePrefs() {
  try {
    const raw = localStorage.getItem(LS_PROFILE)
    if (!raw) return { showLucky: true, showAvoid: true }
    return { ...JSON.parse(raw) }
  } catch {
    return { showLucky: true, showAvoid: true }
  }
}

function isValidEmail(s) {
  const t = s.trim()
  if (!t) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)
}

/** Telegram username без @, 5–32 символов, латиница и _ */
function isValidTelegramUsername(s) {
  const u = s.replace(/^@/, '').trim()
  if (!u) return false
  return /^[a-zA-Z][a-zA-Z0-9_]{4,31}$/.test(u)
}

const inputClass =
  'mt-1 w-full rounded-lg bg-cosmic-900 px-3 py-2 text-white transition-[border-color,box-shadow]'
const inputNormal = 'border border-white/15'
const inputInvalid = 'border-2 border-rose-500 ring-2 ring-rose-500/30'

function FieldError({ message }) {
  if (!message) return null
  return <p className="mt-1.5 text-sm text-rose-400">{message}</p>
}

function validateBirthForm(date, city) {
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

function validatePartnerForm(partnerDate) {
  const err = {}
  if (!partnerDate || !String(partnerDate).trim()) err.partnerDate = 'Укажите дату рождения партнёра'
  else {
    const d = new Date(`${partnerDate}T12:00:00`)
    if (Number.isNaN(d.getTime())) err.partnerDate = 'Некорректная дата'
    else if (d > new Date()) err.partnerDate = 'Дата не может быть в будущем'
  }
  return err
}

function validateSubscribeForm(email, telegram, agree) {
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

// --- Общие UI-кирпичи ---

function Card({ children, className = '' }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 shadow-xl backdrop-blur-sm md:p-6 ${className}`}
    >
      <CosmicStars className="opacity-30" />
      <div className="relative z-[1]">{children}</div>
    </div>
  )
}

function PageHeading({ title, subtitle }) {
  return (
    <header className="mb-6 md:mb-8">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-star-gold md:text-3xl">
        {title}
      </h1>
      {subtitle ? <p className="mt-1 max-w-2xl text-sm text-slate-400 md:text-base">{subtitle}</p> : null}
    </header>
  )
}

/** Шапка и подвал: навигация от главной до юридического */
function Layout() {
  const location = useLocation()
  const linkClass = ({ isActive }) =>
    `rounded-lg px-3 py-2 text-sm transition-colors ${
      isActive ? 'bg-violet-600/40 text-violet-100 ring-1 ring-violet-400/50' : 'text-slate-300 hover:bg-white/10 hover:text-white'
    }`

  return (
    <div className="relative flex min-h-screen flex-col">
      <div className="pointer-events-none fixed inset-0 -z-10 opacity-50">
        <CosmicStars />
      </div>
      <header className="relative border-b border-white/10 bg-cosmic-950/85 backdrop-blur-md">
        <CosmicStars className="opacity-25" />
        <div className="relative z-[1] mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between md:py-4">
          <NavLink to="/" className="font-display text-lg text-star-gold md:text-xl">
            ✨ Звёздный оракул
          </NavLink>
          <nav className="flex flex-wrap gap-1 text-xs md:text-sm">
            <NavLink to="/" end className={linkClass}>
              🏠 Главная
            </NavLink>
            <NavLink to="/onboarding" className={linkClass}>
              🎂 Дата
            </NavLink>
            <NavLink to="/forecast" className={linkClass}>
              🌙 Прогноз
            </NavLink>
            <NavLink to="/compatibility" className={linkClass}>
              💞 Пара
            </NavLink>
            <NavLink to="/subscribe" className={linkClass}>
              📬 Подписка
            </NavLink>
            <NavLink to="/profile" className={linkClass}>
              ⚙️ Профиль
            </NavLink>
            <NavLink to="/legal" className={linkClass}>
              📋 Юр.
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-5xl flex-1 px-4 py-6 md:py-10">
        <div
          key={location.pathname}
          className="page-violet-surface min-h-[min(70vh,720px)] rounded-3xl border border-violet-500/40 bg-gradient-to-b from-violet-950/55 via-purple-950/45 to-violet-950/55 p-5 shadow-[0_0_48px_rgba(109,40,217,0.2)] md:p-8"
        >
          <Outlet />
        </div>
      </main>

      <footer className="border-t border-white/10 py-4 text-center text-xs text-slate-500">
        ⭐ Звёздный оракул · kto.karolina · V2
      </footer>
    </div>
  )
}

// --- Страница 1: Главная ---

function HomePage() {
  return (
    <div>
      <section className="relative mb-10 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] px-4 py-10 text-center md:py-14">
        <CosmicStars className="opacity-40" />
        <div className="relative z-[1]">
          <p className="text-3xl md:text-4xl">🌟 ✨ 🌙 💫 ⭐</p>
          <p className="mt-3 text-sm text-star-rose md:text-base">
            ведический астролог <span className="font-medium text-star-gold">kto.karolina</span>
          </p>
          <h1 className="font-display mt-2 text-3xl font-semibold text-star-gold md:text-5xl">
            Звёздный оракул
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-slate-300 md:text-base">
            Дата рождения → прогноз на день, совместимость, короткие ориентиры ✨
          </p>
          <div className="mx-auto mt-8 max-w-lg">
            <NavLink
              to="/onboarding"
              className="block w-full rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-5 text-center text-base font-semibold text-white shadow-lg transition hover:opacity-90"
            >
              🎂 Ввести дату для ежедневных прогнозов
            </NavLink>
          </div>
        </div>
      </section>

      <Card className="mb-8 border-star-gold/25 bg-white/[0.03]">
        <h2 className="font-display text-lg text-star-gold md:text-xl">
          💡 Зачем прогнозы
        </h2>
        <ul className="mt-3 space-y-2 text-left text-sm text-slate-300 md:text-base">
          <li>📅 Проще планировать день и не нервничать попусту.</li>
          <li>🧘 Яснее, что поддержать, а от чего отступить.</li>
          <li>💞 Мягче говорить о паре — без упрёков.</li>
        </ul>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { icon: '🎂', t: 'Дата', d: 'Ваш профиль' },
          { icon: '🌙', t: 'Прогноз', d: 'День · число · советы' },
          { icon: '💞', t: 'Пара', d: 'Совместимость' },
        ].map((step) => (
          <Card key={step.t}>
            <p className="text-2xl">{step.icon}</p>
            <h3 className="font-display mt-1 text-lg text-star-gold">{step.t}</h3>
            <p className="mt-1 text-xs text-slate-400 md:text-sm">{step.d}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}

// --- Страница 2: Ввод даты рождения ---

function OnboardingPage() {
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [city, setCity] = useState('')
  const [saved, setSaved] = useState(false)
  const [submitAttempted, setSubmitAttempted] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_BIRTH)
      if (raw) {
        const p = JSON.parse(raw)
        setDate(p.date || '')
        setTime(p.time || '')
        setCity(p.city || '')
      }
    } catch {
      /* ignore */
    }
  }, [])

  const birthErrors = useMemo(() => validateBirthForm(date, city), [date, city])
  const birthOk = Object.keys(birthErrors).length === 0
  const showE = submitAttempted ? birthErrors : {}

  function handleSubmit(e) {
    e.preventDefault()
    setSubmitAttempted(true)
    if (!birthOk) return
    localStorage.setItem(LS_BIRTH, JSON.stringify({ date, time, city }))
    setSaved(true)
    setSubmitAttempted(false)
  }

  return (
    <div>
      <PageHeading
        title="🎂 Дата рождения"
        subtitle="Нужна дата. Время и город — по желанию."
      />
      <Card className="max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label className="block text-sm text-slate-400">Дата *</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={`${inputClass} ${showE.date ? inputInvalid : inputNormal}`}
              aria-invalid={Boolean(showE.date)}
            />
            <FieldError message={showE.date} />
          </div>
          <div>
            <label className="block text-sm text-slate-400">Время</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className={`${inputClass} ${inputNormal}`}
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400">Город</label>
            <input
              type="text"
              placeholder="Например, Москва"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className={`${inputClass} ${showE.city ? inputInvalid : inputNormal} placeholder:text-slate-600`}
              aria-invalid={Boolean(showE.city)}
            />
            <FieldError message={showE.city} />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-violet-600 py-3 font-medium text-white hover:bg-violet-500"
          >
            ✨ Сохранить → прогноз
          </button>
        </form>
        {saved ? (
          <p className="mt-4 text-sm text-emerald-400">
            Данные сохранены.{' '}
            <NavLink to="/forecast" className="underline">
              Открыть прогноз
            </NavLink>
          </p>
        ) : null}
      </Card>
    </div>
  )
}

// --- Страница 3: Ежедневный прогноз ---

function ForecastPage() {
  const f = MOCK_DAILY_FORECAST
  const location = useLocation()
  const [prefs, setPrefs] = useState(() =>
    typeof localStorage !== 'undefined' ? readProfilePrefs() : { showLucky: true, showAvoid: true },
  )

  // Обновляем настройки при заходе на страницу (например, после изменения в профиле)
  useEffect(() => {
    setPrefs(readProfilePrefs())
  }, [location.pathname])

  const today = new Date().toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div>
      <PageHeading title="🌙 Сегодня" subtitle={today} />
      <p className="mb-4 text-xs text-star-rose/90 md:text-sm">{f.vedicHint}</p>

      <Card className="mb-5">
        <p className="text-sm leading-relaxed text-slate-200 md:text-base">{f.mainText}</p>
      </Card>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        {prefs.showLucky ? (
          <div className="rounded-2xl border border-star-gold/30 bg-star-gold/10 px-5 py-3 text-center">
            <p className="text-xs text-slate-400">🍀 Число</p>
            <p className="font-display text-3xl text-star-gold">{f.luckyNumber}</p>
            <p className="mt-1 max-w-[14rem] text-xs text-slate-400">{f.luckyNumberNote}</p>
          </div>
        ) : null}
        <NavLink
          to="/compatibility"
          className="text-sm text-violet-300 underline hover:text-violet-200"
        >
          💞 Совместимость →
        </NavLink>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h3 className="font-display text-base text-emerald-400/90 md:text-lg">✅ Хорошо сегодня</h3>
          <ul className="mt-3 list-inside list-disc space-y-2 text-slate-300">
            {f.favorable.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Card>
        {prefs.showAvoid ? (
          <Card>
            <h3 className="font-display text-base text-rose-400/90 md:text-lg">⛔ Лучше не</h3>
            <ul className="mt-3 list-inside list-disc space-y-2 text-slate-300">
              {f.avoid.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Card>
        ) : (
          <Card className="flex items-center text-sm text-slate-500">
            ⛔ Скрыто →{' '}
            <NavLink to="/profile" className="ml-1 text-violet-400 underline">
              профиль
            </NavLink>
          </Card>
        )}
      </div>
    </div>
  )
}

// --- Страница 4: Совместимость ---

function CompatibilityPage() {
  const [partnerDate, setPartnerDate] = useState('')
  const [showResult, setShowResult] = useState(false)
  const [submitAttempted, setSubmitAttempted] = useState(false)

  useEffect(() => {
    try {
      const p = localStorage.getItem(LS_PARTNER)
      if (p) setPartnerDate(p)
    } catch {
      /* ignore */
    }
  }, [])

  const partnerErrors = useMemo(() => validatePartnerForm(partnerDate), [partnerDate])
  const partnerOk = Object.keys(partnerErrors).length === 0
  const showE = submitAttempted ? partnerErrors : {}

  function handleSubmit(e) {
    e.preventDefault()
    setSubmitAttempted(true)
    if (!partnerOk) return
    localStorage.setItem(LS_PARTNER, partnerDate)
    setShowResult(true)
    setSubmitAttempted(false)
  }

  const c = MOCK_COMPATIBILITY

  return (
    <div>
      <PageHeading
        title="💞 Совместимость"
        subtitle="Дата партнёра → краткий разбор."
      />

      <Card className="mb-8 max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label className="block text-sm text-slate-400">Дата партнёра *</label>
            <input
              type="date"
              value={partnerDate}
              onChange={(e) => setPartnerDate(e.target.value)}
              className={`${inputClass} ${showE.partnerDate ? inputInvalid : inputNormal}`}
              aria-invalid={Boolean(showE.partnerDate)}
            />
            <FieldError message={showE.partnerDate} />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-fuchsia-700 py-3 font-medium text-white hover:bg-fuchsia-600"
          >
            ✨ Показать
          </button>
        </form>
      </Card>

      {showResult ? (
        <div className="space-y-6">
          <Card>
            <div className="flex flex-wrap items-end gap-4">
              <p className="font-display text-5xl text-star-gold">{c.scorePercent}%</p>
              <p className="text-slate-400">{c.scoreLabel}</p>
            </div>
            <p className="mt-4 text-slate-200">{c.summary}</p>
          </Card>
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <h3 className="font-display text-base text-emerald-400/90 md:text-lg">💪 Сильные стороны</h3>
              <ul className="mt-3 list-inside list-disc space-y-2 text-slate-300">
                {c.strengths.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </Card>
            <Card>
              <h3 className="font-display text-base text-amber-400/90 md:text-lg">⚡ Внимание</h3>
              <ul className="mt-3 list-inside list-disc space-y-2 text-slate-300">
                {c.tensions.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-500">👆 Отправьте форму — здесь будет результат.</p>
      )}
    </div>
  )
}

// --- Страница 5: Подписка на рассылку ---

function SubscribePage() {
  const [email, setEmail] = useState('')
  const [telegram, setTelegram] = useState('')
  const [agree, setAgree] = useState(false)
  const [done, setDone] = useState(false)
  const [submitAttempted, setSubmitAttempted] = useState(false)

  const subscribeErrors = useMemo(
    () => validateSubscribeForm(email, telegram, agree),
    [email, telegram, agree],
  )
  const subscribeOk = Object.keys(subscribeErrors).length === 0
  const showE = submitAttempted ? subscribeErrors : {}

  function handleSubmit(e) {
    e.preventDefault()
    setSubmitAttempted(true)
    if (!subscribeOk) return
    try {
      localStorage.setItem(
        'star-oracle-subscribe-v2',
        JSON.stringify({
          email: email.trim(),
          telegram: telegram.replace(/^@/, '').trim(),
          at: new Date().toISOString(),
        }),
      )
    } catch {
      /* ignore */
    }
    setDone(true)
    setSubmitAttempted(false)
  }

  return (
    <div>
      <PageHeading
        title="📬 Подписка на прогнозы"
        subtitle="Почта и/или Telegram — как удобнее ✨"
      />
      <div className="mb-4 flex flex-wrap gap-2 text-2xl">
        <span>📧</span>
        <span>✈️</span>
        <span>⭐</span>
      </div>
      <Card className="max-w-lg">
        {done ? (
          <p className="text-emerald-400">
            🎉 Готово! Проверьте почту или Telegram — напишем, когда всё подключим.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label className="block text-sm text-slate-400">📧 Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`${inputClass} ${showE.email || showE.contact ? inputInvalid : inputNormal}`}
                placeholder="you@example.com"
                aria-invalid={Boolean(showE.email || showE.contact)}
              />
              <FieldError message={showE.email} />
            </div>
            <div>
              <label className="block text-sm text-slate-400">✈️ Telegram</label>
              <input
                type="text"
                value={telegram}
                onChange={(e) => setTelegram(e.target.value)}
                className={`${inputClass} ${showE.telegram || showE.contact ? inputInvalid : inputNormal} placeholder:text-slate-600`}
                placeholder="@username или username"
                aria-invalid={Boolean(showE.telegram || showE.contact)}
              />
              <p className="mt-1 text-xs text-slate-500">Можно с @ или без. Логин 5–32 символов.</p>
              <FieldError message={showE.telegram} />
            </div>
            <FieldError message={showE.contact} />
            <label
              className={`flex cursor-pointer items-start gap-2 rounded-lg border-2 p-3 text-sm text-slate-300 ${
                showE.agree ? 'border-rose-500 bg-rose-950/25 ring-2 ring-rose-500/30' : 'border-white/10'
              }`}
            >
              <input
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                className="mt-1"
                aria-invalid={Boolean(showE.agree)}
              />
              <span>Согласна на рассылку и с политикой</span>
            </label>
            <FieldError message={showE.agree} />
            <button
              type="submit"
              className="w-full rounded-lg bg-violet-600 py-3 font-medium text-white hover:bg-violet-500"
            >
              ✨ Подписаться
            </button>
          </form>
        )}
      </Card>
    </div>
  )
}

// --- Страница 6: Профиль ---

function ProfilePage() {
  const [birth, setBirth] = useState(null)
  const [showLucky, setShowLucky] = useState(true)
  const [showAvoid, setShowAvoid] = useState(true)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_BIRTH)
      if (raw) setBirth(JSON.parse(raw))
    } catch {
      setBirth(null)
    }
    const p = readProfilePrefs()
    setShowLucky(p.showLucky !== false)
    setShowAvoid(p.showAvoid !== false)
  }, [])

  function persistPrefs(next) {
    localStorage.setItem(LS_PROFILE, JSON.stringify(next))
  }

  function clearData() {
    localStorage.removeItem(LS_BIRTH)
    localStorage.removeItem(LS_PARTNER)
    localStorage.removeItem(LS_PROFILE)
    setBirth(null)
    setShowLucky(true)
    setShowAvoid(true)
  }

  return (
    <div>
      <PageHeading
        title="⚙️ Профиль"
        subtitle="Данные только на этом устройстве."
      />
      <Card className="mb-6 max-w-lg">
        <h3 className="font-display text-lg text-star-gold">🎂 Дата</h3>
        {birth?.date ? (
          <ul className="mt-3 space-y-1 text-slate-300">
            <li>Дата: {birth.date}</li>
            {birth.time ? <li>Время: {birth.time}</li> : null}
            {birth.city ? <li>Город: {birth.city}</li> : null}
          </ul>
        ) : (
          <p className="mt-3 text-slate-400">
            Ещё не указано.{' '}
            <NavLink to="/onboarding" className="text-violet-400 underline">
              Ввести дату
            </NavLink>
          </p>
        )}
      </Card>
      <Card className="mb-6 max-w-lg">
        <h3 className="font-display text-lg text-star-gold">🌙 Прогноз</h3>
        <label className="mt-3 flex items-center gap-2 text-slate-300">
          <input
            type="checkbox"
            checked={showLucky}
            onChange={(e) => {
              const v = e.target.checked
              setShowLucky(v)
              persistPrefs({ showLucky: v, showAvoid })
            }}
          />
          🍀 Число дня
        </label>
        <label className="mt-2 flex items-center gap-2 text-slate-300">
          <input
            type="checkbox"
            checked={showAvoid}
            onChange={(e) => {
              const v = e.target.checked
              setShowAvoid(v)
              persistPrefs({ showLucky, showAvoid: v })
            }}
          />
          ⛔ Блок «избегать»
        </label>
        <p className="mt-2 text-xs text-slate-500">Сохраняется локально.</p>
      </Card>
      <button
        type="button"
        onClick={clearData}
        className="rounded-lg border border-rose-500/50 px-4 py-2 text-sm text-rose-300 hover:bg-rose-950/50"
      >
        🗑️ Сбросить даты
      </button>
    </div>
  )
}

// --- Юридическое ---

function LegalPage() {
  return (
    <div>
      <PageHeading title="📋 Юридическое" subtitle="Кратко." />
      <Card className="mb-6">
        <h3 className="font-display text-lg text-star-gold">🔒 Конфиденциальность</h3>
        <p className="mt-3 text-slate-300">{MOCK_LEGAL.privacy}</p>
      </Card>
      <Card>
        <h3 className="font-display text-lg text-star-gold">📜 Условия</h3>
        <p className="mt-3 text-slate-300">{MOCK_LEGAL.terms}</p>
      </Card>
    </div>
  )
}

// --- Роуты V2 (без «О методике»; старый /about → главная) ---

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="onboarding" element={<OnboardingPage />} />
        <Route path="forecast" element={<ForecastPage />} />
        <Route path="compatibility" element={<CompatibilityPage />} />
        <Route path="subscribe" element={<SubscribePage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="about" element={<Navigate to="/" replace />} />
        <Route path="legal" element={<LegalPage />} />
      </Route>
    </Routes>
  )
}
