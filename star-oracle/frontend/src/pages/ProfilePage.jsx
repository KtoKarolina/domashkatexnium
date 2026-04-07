import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import * as api from '../api/starOracleApi.js'
import { useAuth } from '../AuthContext.jsx'
import { Card } from '../components/Card.jsx'
import { PageHeading } from '../components/PageHeading.jsx'
import { clearProfilePrefs, persistProfilePrefs, readProfilePrefs } from '../utils/profilePrefs.js'

export function ProfilePage() {
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

  async function clearData() {
    if (!user?.id) return
    setClearState({ loading: true, error: null })
    try {
      await api.deleteUserStoredReadings(user.id)
      setBirth(null)
      setProfileRow(null)
      clearProfilePrefs()
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
              persistProfilePrefs({ showLucky: v, showAvoid })
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
              persistProfilePrefs({ showLucky, showAvoid: v })
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
