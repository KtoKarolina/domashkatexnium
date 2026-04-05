import { useEffect, useMemo, useState } from 'react'
import { NavLink, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import * as api from './api/starOracleApi.js'
import { useAuth } from './AuthContext.jsx'
import { CosmicStars } from './CosmicStars.jsx'
import { MOCK_LEGAL } from './mockData.js'

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

function isValidTelegramUsername(s) {
  const u = s.replace(/^@/, '').trim()
  if (!u) return false
  return /^[a-zA-Z][a-zA-Z0-9_]{4,31}$/.test(u)
}

const inputClass =
  'mt-1 w-full rounded-lg bg-violet-950/60 px-3 py-2 text-white transition-[border-color,box-shadow]'
const inputNormal = 'border border-violet-400/20'
const inputInvalid = 'border-2 border-rose-500 ring-2 ring-rose-500/30'

function FieldError({ message }) {
  if (!message) return null
  return <p className="mt-1.5 text-sm text-rose-400">{message}</p>
}

function DataState({ loading, error, empty, children }) {
  if (loading) return <p className="text-purple-200">Загрузка…</p>
  if (error) return <p className="text-rose-400">Ошибка: {error}</p>
  if (empty != null) return empty
  return children
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

// --- UI ---

function Card({ children, className = '' }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-violet-400/15 bg-violet-900/25 p-5 shadow-xl backdrop-blur-sm md:p-6 ${className}`}
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
      {subtitle ? <p className="mt-1 max-w-2xl text-sm text-purple-200 md:text-base">{subtitle}</p> : null}
    </header>
  )
}

function Layout() {
  const location = useLocation()
  const linkClass = ({ isActive }) =>
    `rounded-lg px-3 py-2 text-sm transition-colors ${
      isActive
        ? 'bg-violet-600/40 text-violet-100 ring-1 ring-violet-400/50'
        : 'text-purple-200 hover:bg-violet-800/30 hover:text-white'
    }`

  return (
    <div className="relative flex min-h-screen flex-col">
      <div className="pointer-events-none fixed inset-0 -z-10 opacity-50">
        <CosmicStars />
      </div>
      <header className="relative border-b border-violet-400/15 bg-cosmic-950/85 backdrop-blur-md">
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

      <footer className="border-t border-violet-400/15 py-4 text-center text-xs text-purple-300">
        ⭐ Звёздный оракул · kto.karolina · V2
      </footer>
    </div>
  )
}

// --- Страница 1: Главная ---

function HomePage() {
  return (
    <div>
      <section className="relative mb-10 overflow-hidden rounded-3xl border border-violet-400/15 bg-violet-900/20 px-4 py-10 text-center md:py-14">
        <CosmicStars className="opacity-40" />
        <div className="relative z-[1]">
          <p className="text-3xl md:text-4xl">🌟 ✨ 🌙 💫 ⭐</p>
          <p className="mt-3 text-sm text-star-rose md:text-base">
            ведический астролог <span className="font-medium text-star-gold">kto.karolina</span>
          </p>
          <h1 className="font-display mt-2 text-3xl font-semibold text-star-gold md:text-5xl">
            Звёздный оракул
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-purple-100 md:text-base">
            Дата рождения → прогноз на день, короткие ориентиры ✨
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

      <Card className="mb-8 border-star-gold/25 bg-violet-900/15">
        <h2 className="font-display text-lg text-star-gold md:text-xl">
          💡 Зачем прогнозы
        </h2>
        <ul className="mt-3 space-y-2 text-left text-sm text-purple-100 md:text-base">
          <li>📅 Проще планировать день и не нервничать попусту.</li>
          <li>🧘 Яснее, что поддержать, а от чего отступить.</li>
          <li>💡 Ежедневные подсказки на основе вашего знака.</li>
        </ul>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {[
          { icon: '🎂', t: 'Дата', d: 'Ваш профиль' },
          { icon: '🌙', t: 'Прогноз', d: 'День · число · советы' },
        ].map((step) => (
          <Card key={step.t}>
            <p className="text-2xl">{step.icon}</p>
            <h3 className="font-display mt-1 text-lg text-star-gold">{step.t}</h3>
            <p className="mt-1 text-xs text-purple-200 md:text-sm">{step.d}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}

// --- Страница 2: Ввод даты рождения ---

function OnboardingPage() {
  const { user } = useAuth()
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [city, setCity] = useState('')
  const [saved, setSaved] = useState(false)
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [loadBirth, setLoadBirth] = useState({ loading: true, error: null })

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    ;(async () => {
      setLoadBirth({ loading: true, error: null })
      try {
        const b = await api.fetchPrimaryBirth(user.id)
        if (cancelled) return
        if (b) {
          setDate(b.date || '')
          setTime(b.time || '')
          setCity(b.city || '')
        }
      } catch (e) {
        if (!cancelled) setLoadBirth({ loading: false, error: e?.message ?? String(e) })
        return
      }
      if (!cancelled) setLoadBirth({ loading: false, error: null })
    })()
    return () => {
      cancelled = true
    }
  }, [user?.id])

  const birthErrors = useMemo(() => validateBirthForm(date, city), [date, city])
  const birthOk = Object.keys(birthErrors).length === 0
  const showE = submitAttempted ? birthErrors : {}

  const [saveState, setSaveState] = useState({ loading: false, error: null })

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitAttempted(true)
    setSaveState({ loading: false, error: null })
    if (!birthOk) return
    if (!user?.id) return
    setSaveState({ loading: true, error: null })
    try {
      await api.upsertPrimaryBirth(user.id, { date, time, city })
      setSaved(true)
      setSubmitAttempted(false)
      setSaveState({ loading: false, error: null })
    } catch (err) {
      setSaveState({ loading: false, error: err?.message ?? String(err) })
    }
  }

  return (
    <div>
      <PageHeading
        title="🎂 Дата рождения"
        subtitle="Нужна дата. Время и город — по желанию. Сохраняется в Supabase."
      />
      {loadBirth.loading ? <p className="mb-4 text-purple-200">Загрузка…</p> : null}
      {loadBirth.error ? (
        <p className="mb-4 text-rose-400">Ошибка загрузки: {loadBirth.error}</p>
      ) : null}
      {!loadBirth.loading ? (
        <Card className="max-w-lg">
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label className="block text-sm text-purple-200">Дата *</label>
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
              <label className="block text-sm text-purple-200">Время</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className={`${inputClass} ${inputNormal}`}
              />
            </div>
            <div>
              <label className="block text-sm text-purple-200">Город</label>
              <input
                type="text"
                placeholder="Например, Москва"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className={`${inputClass} ${showE.city ? inputInvalid : inputNormal} placeholder:text-purple-400/60`}
                aria-invalid={Boolean(showE.city)}
              />
              <FieldError message={showE.city} />
            </div>
            <button
              type="submit"
              disabled={saveState.loading}
              className="w-full rounded-lg bg-violet-600 py-3 font-medium text-white hover:bg-violet-500 disabled:opacity-50"
            >
              {saveState.loading ? 'Загрузка…' : '✨ Сохранить → прогноз'}
            </button>
          </form>
          {saveState.error ? <p className="mt-3 text-sm text-rose-400">{saveState.error}</p> : null}
          {saved ? (
            <p className="mt-4 text-sm text-emerald-400">
              Данные сохранены.{' '}
              <NavLink to="/forecast" className="underline">
                Открыть прогноз
              </NavLink>
            </p>
          ) : null}
        </Card>
      ) : null}
    </div>
  )
}

// --- Страница 3: Ежедневный прогноз ---

function ForecastPage() {
  const { user } = useAuth()
  const location = useLocation()
  const [prefs, setPrefs] = useState(() =>
    typeof localStorage !== 'undefined' ? readProfilePrefs() : { showLucky: true, showAvoid: true },
  )
  const [state, setState] = useState({ loading: true, error: null, forecast: null })

  useEffect(() => {
    setPrefs(readProfilePrefs())
  }, [location.pathname])

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    ;(async () => {
      setState((s) => ({ ...s, loading: true, error: null }))
      try {
        const { forecast } = await api.fetchDailyForecast(user.id)
        if (!cancelled) setState({ loading: false, error: null, forecast })
      } catch (e) {
        if (!cancelled)
          setState({ loading: false, error: e?.message ?? String(e), forecast: null })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user?.id])

  const today = new Date().toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const f = state.forecast
  const showForecastEmpty = !state.loading && !state.error && !f

  return (
    <div>
      <PageHeading title="🌙 Сегодня" subtitle={today} />
      <DataState
        loading={state.loading}
        error={state.error}
        empty={
          showForecastEmpty ? (
            <Card className="mb-5">
              <p className="text-purple-100">
                Прогноз пока недоступен. Сначала{' '}
                <NavLink to="/onboarding" className="text-star-gold underline">
                  введите дату рождения
                </NavLink>
                , и прогноз появится автоматически.
              </p>
            </Card>
          ) : undefined
        }
      >
        {f ? (
          <>
            <p className="mb-4 text-xs text-star-rose/90 md:text-sm">{f.vedicHint}</p>

            <Card className="mb-5">
              <p className="text-sm leading-relaxed text-purple-50 md:text-base">{f.mainText}</p>
            </Card>

            <div className="mb-5 flex flex-wrap items-center gap-3">
              {prefs.showLucky ? (
                <div className="rounded-2xl border border-star-gold/30 bg-star-gold/10 px-5 py-3 text-center">
                  <p className="text-xs text-purple-200">🍀 Число</p>
                  <p className="font-display text-3xl text-star-gold">{f.luckyNumber}</p>
                  <p className="mt-1 max-w-[14rem] text-xs text-purple-200">{f.luckyNumberNote}</p>
                </div>
              ) : null}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <h3 className="font-display text-base text-emerald-400/90 md:text-lg">
                  ✅ Хорошо сегодня
                </h3>
                <ul className="mt-3 list-inside list-disc space-y-2 text-purple-100">
                  {f.favorable.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </Card>
              {prefs.showAvoid ? (
                <Card>
                  <h3 className="font-display text-base text-rose-400/90 md:text-lg">⛔ Лучше не</h3>
                  <ul className="mt-3 list-inside list-disc space-y-2 text-purple-100">
                    {f.avoid.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </Card>
              ) : (
                <Card className="flex items-center text-sm text-purple-300">
                  ⛔ Скрыто →{' '}
                  <NavLink to="/profile" className="ml-1 text-violet-300 underline">
                    профиль
                  </NavLink>
                </Card>
              )}
            </div>
          </>
        ) : null}
      </DataState>
    </div>
  )
}

// --- Страница 4: Подписка на рассылку ---

function SubscribePage() {
  const { user } = useAuth()
  const [email, setEmail] = useState('')
  const [telegram, setTelegram] = useState('')
  const [agree, setAgree] = useState(false)
  const [done, setDone] = useState(false)
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [loadState, setLoadState] = useState({ loading: true, error: null })
  const [saveState, setSaveState] = useState({ loading: false, error: null })

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    ;(async () => {
      setLoadState({ loading: true, error: null })
      try {
        const row = await api.fetchProfileRow(user.id)
        if (cancelled) return
        if (row) {
          setEmail(row.newsletter_email || '')
          setTelegram(row.telegram_username ? `@${row.telegram_username}`.replace('@@', '@') : '')
        }
      } catch (e) {
        if (!cancelled) setLoadState({ loading: false, error: e?.message ?? String(e) })
        return
      }
      if (!cancelled) setLoadState({ loading: false, error: null })
    })()
    return () => {
      cancelled = true
    }
  }, [user?.id])

  const subscribeErrors = useMemo(
    () => validateSubscribeForm(email, telegram, agree),
    [email, telegram, agree],
  )
  const subscribeOk = Object.keys(subscribeErrors).length === 0
  const showE = submitAttempted ? subscribeErrors : {}

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitAttempted(true)
    setSaveState({ loading: false, error: null })
    if (!subscribeOk || !user?.id) return
    setSaveState({ loading: true, error: null })
    try {
      await api.upsertProfileContacts(user.id, { email, telegram })
      setDone(true)
      setSubmitAttempted(false)
      setSaveState({ loading: false, error: null })
    } catch (err) {
      setSaveState({ loading: false, error: err?.message ?? String(err) })
    }
  }

  return (
    <div>
      <PageHeading
        title="📬 Подписка на прогнозы"
        subtitle="Укажите почту и/или Telegram для ежедневных предсказаний."
      />
      {loadState.loading ? <p className="mb-4 text-purple-200">Загрузка…</p> : null}
      {loadState.error ? (
        <p className="mb-4 text-rose-400">Ошибка загрузки: {loadState.error}</p>
      ) : null}
      <Card className="max-w-lg">
        {done ? (
          <p className="text-emerald-400">
            🎉 Готово! Проверьте почту или Telegram — напишем, когда всё подключим.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label className="block text-sm text-purple-200">📧 Email</label>
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
              <label className="block text-sm text-purple-200">💬 Telegram username</label>
              <input
                type="text"
                value={telegram}
                onChange={(e) => setTelegram(e.target.value)}
                className={`${inputClass} ${showE.telegram || showE.contact ? inputInvalid : inputNormal} placeholder:text-purple-400/60`}
                placeholder="@username или username"
                aria-invalid={Boolean(showE.telegram || showE.contact)}
              />
              <p className="mt-1 text-xs text-purple-300">Можно с @ или без. Логин 5–32 символов.</p>
              <FieldError message={showE.telegram} />
            </div>
            <FieldError message={showE.contact} />
            <label
              className={`flex cursor-pointer items-start gap-2 rounded-lg border-2 p-3 text-sm text-purple-100 ${
                showE.agree ? 'border-rose-500 bg-rose-950/25 ring-2 ring-rose-500/30' : 'border-violet-400/15'
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
              disabled={saveState.loading}
              className="w-full rounded-lg bg-violet-600 py-3 font-medium text-white hover:bg-violet-500 disabled:opacity-50"
            >
              {saveState.loading ? 'Загрузка…' : '✨ Подписаться'}
            </button>
            {saveState.error ? (
              <p className="text-sm text-rose-400">{saveState.error}</p>
            ) : null}
          </form>
        )}
      </Card>
    </div>
  )
}

// --- Страница 5: Профиль ---

function ProfilePage() {
  const { user } = useAuth()
  const [birth, setBirth] = useState(null)
  const [profileRow, setProfileRow] = useState(null)
  const [showLucky, setShowLucky] = useState(true)
  const [showAvoid, setShowAvoid] = useState(true)
  const [loadState, setLoadState] = useState({ loading: true, error: null })
  const [clearState, setClearState] = useState({ loading: false, error: null })

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    ;(async () => {
      setLoadState({ loading: true, error: null })
      try {
        const [b, pr] = await Promise.all([
          api.fetchPrimaryBirth(user.id),
          api.fetchProfileRow(user.id),
        ])
        if (cancelled) return
        setBirth(b)
        setProfileRow(pr)
      } catch (e) {
        if (!cancelled) setLoadState({ loading: false, error: e?.message ?? String(e) })
        return
      }
      if (!cancelled) setLoadState({ loading: false, error: null })
    })()
    return () => {
      cancelled = true
    }
  }, [user?.id])

  useEffect(() => {
    const p = readProfilePrefs()
    setShowLucky(p.showLucky !== false)
    setShowAvoid(p.showAvoid !== false)
  }, [])

  function persistPrefs(next) {
    localStorage.setItem(LS_PROFILE, JSON.stringify(next))
  }

  async function clearData() {
    if (!user?.id) return
    setClearState({ loading: true, error: null })
    try {
      await api.deleteUserStoredReadings(user.id)
      setBirth(null)
      setProfileRow(null)
      localStorage.removeItem(LS_PROFILE)
      setShowLucky(true)
      setShowAvoid(true)
      setClearState({ loading: false, error: null })
    } catch (e) {
      setClearState({ loading: false, error: e?.message ?? String(e) })
    }
  }

  return (
    <div>
      <PageHeading
        title="⚙️ Профиль"
        subtitle="Даты и прогнозы в Supabase; переключатели ниже — только в браузере."
      />
      {loadState.loading ? <p className="mb-4 text-purple-200">Загрузка…</p> : null}
      {loadState.error ? (
        <p className="mb-4 text-rose-400">Ошибка загрузки: {loadState.error}</p>
      ) : null}
      <Card className="mb-6 max-w-lg">
        <h3 className="font-display text-lg text-star-gold">🎂 Дата рождения</h3>
        {birth?.date ? (
          <ul className="mt-3 space-y-1 text-purple-100">
            <li>Дата: {birth.date}</li>
            {birth.time ? <li>Время: {birth.time}</li> : null}
            {birth.city ? <li>Город: {birth.city}</li> : null}
          </ul>
        ) : (
          <p className="mt-3 text-purple-200">
            Ещё не указано.{' '}
            <NavLink to="/onboarding" className="text-violet-300 underline">
              Ввести дату
            </NavLink>
          </p>
        )}
      </Card>
      <Card className="mb-6 max-w-lg">
        <h3 className="font-display text-lg text-star-gold">📬 Контакты (рассылка)</h3>
        {profileRow?.newsletter_email || profileRow?.telegram_username ? (
          <ul className="mt-3 space-y-1 text-purple-100">
            {profileRow.newsletter_email ? <li>Email: {profileRow.newsletter_email}</li> : null}
            {profileRow.telegram_username ? (
              <li>TG: @{profileRow.telegram_username.replace(/^@/, '')}</li>
            ) : null}
          </ul>
        ) : (
          <p className="mt-3 text-purple-200">
            Не задано.{' '}
            <NavLink to="/subscribe" className="text-violet-300 underline">
              Подписка
            </NavLink>
          </p>
        )}
      </Card>
      <Card className="mb-6 max-w-lg">
        <h3 className="font-display text-lg text-star-gold">🌙 Прогноз</h3>
        <label className="mt-3 flex items-center gap-2 text-purple-100">
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
        <label className="mt-2 flex items-center gap-2 text-purple-100">
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
        <p className="mt-2 text-xs text-purple-300">Сохраняется локально.</p>
      </Card>
      <button
        type="button"
        disabled={clearState.loading}
        onClick={clearData}
        className="rounded-lg border border-rose-500/50 px-4 py-2 text-sm text-rose-300 hover:bg-rose-950/50 disabled:opacity-50"
      >
        {clearState.loading ? 'Загрузка…' : '🗑️ Удалить мои данные в Supabase'}
      </button>
      {clearState.error ? (
        <p className="mt-2 text-sm text-rose-400">{clearState.error}</p>
      ) : null}
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
        <p className="mt-3 text-purple-100">{MOCK_LEGAL.privacy}</p>
      </Card>
      <Card>
        <h3 className="font-display text-lg text-star-gold">📜 Условия</h3>
        <p className="mt-3 text-purple-100">{MOCK_LEGAL.terms}</p>
      </Card>
    </div>
  )
}

// --- Роуты ---

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="onboarding" element={<OnboardingPage />} />
        <Route path="forecast" element={<ForecastPage />} />
        <Route path="subscribe" element={<SubscribePage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="about" element={<Navigate to="/" replace />} />
        <Route path="compatibility" element={<Navigate to="/" replace />} />
        <Route path="legal" element={<LegalPage />} />
      </Route>
    </Routes>
  )
}
