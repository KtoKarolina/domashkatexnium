import { useEffect, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import * as api from '../api/starOracleApi.js'
import { useAuth } from '../AuthContext.jsx'
import { Card } from '../components/Card.jsx'
import { FieldError } from '../components/FieldError.jsx'
import { PageHeading } from '../components/PageHeading.jsx'
import { inputClass, inputInvalid, inputNormal } from '../utils/formStyles.js'
import { validateBirthForm } from '../utils/validation.js'

export function OnboardingPage() {
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
              <label htmlFor="onboarding-birth-date" className="block text-sm text-purple-200">
                Дата *
              </label>
              <input
                id="onboarding-birth-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={`${inputClass} ${showE.date ? inputInvalid : inputNormal}`}
                aria-invalid={Boolean(showE.date)}
              />
              <FieldError message={showE.date} />
            </div>
            <div>
              <label htmlFor="onboarding-birth-time" className="block text-sm text-purple-200">
                Время
              </label>
              <input
                id="onboarding-birth-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className={`${inputClass} ${inputNormal}`}
              />
            </div>
            <div>
              <label htmlFor="onboarding-birth-city" className="block text-sm text-purple-200">
                Город
              </label>
              <input
                id="onboarding-birth-city"
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
