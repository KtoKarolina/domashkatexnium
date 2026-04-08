import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'

function validateLoginForm(email, password) {
  const errors = {}
  if (!email || !email.trim()) errors.email = 'Введите email'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = 'Некорректный формат email'
  if (!password) errors.password = 'Введите пароль'
  return errors
}

export function LoginPage() {
  const { login, authActionError, user } = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitted, setSubmitted] = useState(false)

  if (user) {
    const from = location.state?.from?.pathname || '/'
    return <Navigate to={from} replace />
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitted(true)
    const errs = validateLoginForm(email, password)
    setFieldErrors(errs)
    if (Object.keys(errs).length > 0) return

    setPending(true)
    try {
      await login(email.trim(), password)
    } finally {
      setPending(false)
    }
  }

  const showErrors = submitted ? fieldErrors : {}

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center bg-cosmic-950 px-4 py-10">
      <h1 className="font-display text-center text-2xl text-star-gold">Звёздный оракул</h1>
      <p className="mt-2 text-center text-sm text-purple-200">Войдите в свой аккаунт</p>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="mt-6 space-y-4 rounded-2xl border border-violet-500/30 bg-violet-950/40 p-6"
      >
        <div>
          <label className="block text-sm text-purple-200">Email</label>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); if (submitted) setFieldErrors(validateLoginForm(e.target.value, password)) }}
            className={`mt-1 w-full rounded-lg border px-3 py-2 text-white bg-cosmic-900 ${showErrors.email ? 'border-rose-500' : 'border-white/15'}`}
            placeholder="you@example.com"
          />
          {showErrors.email && <p className="mt-1 text-xs text-rose-400">{showErrors.email}</p>}
        </div>

        <div>
          <label className="block text-sm text-purple-200">Пароль</label>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); if (submitted) setFieldErrors(validateLoginForm(email, e.target.value)) }}
            className={`mt-1 w-full rounded-lg border px-3 py-2 text-white bg-cosmic-900 ${showErrors.password ? 'border-rose-500' : 'border-white/15'}`}
            placeholder="Ваш пароль"
          />
          {showErrors.password && <p className="mt-1 text-xs text-rose-400">{showErrors.password}</p>}
        </div>

        {authActionError && <p className="text-sm text-rose-400">{authActionError}</p>}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-violet-600 py-3 font-medium text-white hover:bg-violet-500 disabled:opacity-50"
        >
          {pending ? 'Загрузка…' : 'Войти'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-purple-300">
        Нет аккаунта?{' '}
        <Link to="/register" className="text-violet-300 underline hover:text-white">
          Зарегистрироваться
        </Link>
      </p>
    </div>
  )
}
