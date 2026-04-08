import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'

function validateRegisterForm(email, password, passwordConfirm) {
  const errors = {}
  if (!email || !email.trim()) errors.email = 'Введите email'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = 'Некорректный формат email'
  if (!password) errors.password = 'Введите пароль'
  else if (password.length < 8) errors.password = 'Пароль должен содержать минимум 8 символов'
  if (password && passwordConfirm !== password) errors.passwordConfirm = 'Пароли не совпадают'
  return errors
}

export function RegisterPage() {
  const { register, authActionError, user } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [pending, setPending] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitted, setSubmitted] = useState(false)

  if (user) {
    return <Navigate to="/" replace />
  }

  function revalidate(e, p, pc) {
    if (submitted) setFieldErrors(validateRegisterForm(e, p, pc))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitted(true)
    const errs = validateRegisterForm(email, password, passwordConfirm)
    setFieldErrors(errs)
    if (Object.keys(errs).length > 0) return

    setPending(true)
    try {
      await register(email.trim(), password)
    } finally {
      setPending(false)
    }
  }

  const showErrors = submitted ? fieldErrors : {}

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center bg-cosmic-950 px-4 py-10">
      <h1 className="font-display text-center text-2xl text-star-gold">Звёздный оракул</h1>
      <p className="mt-2 text-center text-sm text-purple-200">Создайте новый аккаунт</p>

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
            onChange={(e) => { setEmail(e.target.value); revalidate(e.target.value, password, passwordConfirm) }}
            className={`mt-1 w-full rounded-lg border px-3 py-2 text-white bg-cosmic-900 ${showErrors.email ? 'border-rose-500' : 'border-white/15'}`}
            placeholder="you@example.com"
          />
          {showErrors.email && <p className="mt-1 text-xs text-rose-400">{showErrors.email}</p>}
        </div>

        <div>
          <label className="block text-sm text-purple-200">Пароль</label>
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); revalidate(email, e.target.value, passwordConfirm) }}
            className={`mt-1 w-full rounded-lg border px-3 py-2 text-white bg-cosmic-900 ${showErrors.password ? 'border-rose-500' : 'border-white/15'}`}
            placeholder="Минимум 8 символов"
          />
          {showErrors.password && <p className="mt-1 text-xs text-rose-400">{showErrors.password}</p>}
        </div>

        <div>
          <label className="block text-sm text-purple-200">Повторите пароль</label>
          <input
            type="password"
            autoComplete="new-password"
            value={passwordConfirm}
            onChange={(e) => { setPasswordConfirm(e.target.value); revalidate(email, password, e.target.value) }}
            className={`mt-1 w-full rounded-lg border px-3 py-2 text-white bg-cosmic-900 ${showErrors.passwordConfirm ? 'border-rose-500' : 'border-white/15'}`}
            placeholder="Повторите пароль"
          />
          {showErrors.passwordConfirm && <p className="mt-1 text-xs text-rose-400">{showErrors.passwordConfirm}</p>}
        </div>

        {authActionError && <p className="text-sm text-rose-400">{authActionError}</p>}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-violet-600 py-3 font-medium text-white hover:bg-violet-500 disabled:opacity-50"
        >
          {pending ? 'Загрузка…' : 'Зарегистрироваться'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-purple-300">
        Уже есть аккаунт?{' '}
        <Link to="/login" className="text-violet-300 underline hover:text-white">
          Войти
        </Link>
      </p>
    </div>
  )
}
