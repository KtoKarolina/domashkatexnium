import { useEffect, useMemo, useState } from 'react'
import * as api from '../api/starOracleApi.js'
import { useAuth } from '../AuthContext.jsx'
import { Card } from '../components/Card.jsx'
import { FieldError } from '../components/FieldError.jsx'
import { PageHeading } from '../components/PageHeading.jsx'
import { inputClass, inputInvalid, inputNormal } from '../utils/formStyles.js'
import { validateSubscribeForm } from '../utils/validation.js'

export function SubscribePage() {
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
