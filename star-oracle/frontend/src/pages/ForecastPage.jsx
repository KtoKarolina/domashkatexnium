import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import * as api from '../api/starOracleApi.js'
import { useAuth } from '../AuthContext.jsx'
import { Card } from '../components/Card.jsx'
import { DataState } from '../components/DataState.jsx'
import { PageHeading } from '../components/PageHeading.jsx'
import { readProfilePrefs } from '../utils/profilePrefs.js'

export function ForecastPage() {
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
