import { useState } from 'react'
import { useAuth } from './AuthContext.jsx'

export function EmailLoginForm() {
  const { register, login, authActionError } = useAuth()
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [localError, setLocalError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setLocalError(null)

    if (!email.trim()) { setLocalError('Введите email'); return }
    if (!password) { setLocalError('Введите пароль'); return }
    if (mode === 'register' && password.length < 8) {
      setLocalError('Пароль должен содержать минимум 8 символов')
      return
    }

    setPending(true)
    try {
      if (mode === 'register') {
        await register(email.trim(), password)
      } else {
        await login(email.trim(), password)
      }
    } finally {
      setPending(false)
    }
  }

  const displayError = localError || authActionError

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center bg-cosmic-950 px-4 py-10">
      <h1 className="font-display text-center text-2xl text-star-gold">Звёздный оракул</h1>
      <p className="mt-2 text-center text-sm text-purple-200">
        {mode === 'login' ? 'Войдите в свой аккаунт' : 'Создайте новый аккаунт'}
      </p>

      <div className="mt-6 flex rounded-lg border border-violet-500/30 overflow-hidden">
        <button
          type="button"
          onClick={() => { setMode('login'); setLocalError(null) }}
          className={`flex-1 py-2 text-sm font-medium transition ${
            mode === 'login' ? 'bg-violet-600 text-white' : 'bg-violet-950/40 text-purple-300 hover:text-white'
          }`}
        >
          Вход
        </button>
        <button
          type="button"
          onClick={() => { setMode('register'); setLocalError(null) }}
          className={`flex-1 py-2 text-sm font-medium transition ${
            mode === 'register' ? 'bg-violet-600 text-white' : 'bg-violet-950/40 text-purple-300 hover:text-white'
          }`}
        >
          Регистрация
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-4 space-y-4 rounded-2xl border border-violet-500/30 bg-violet-950/40 p-6"
      >
        <div>
          <label className="block text-sm text-purple-200">Email</label>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/15 bg-cosmic-900 px-3 py-2 text-white"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label className="block text-sm text-purple-200">Пароль</label>
          <input
            type="password"
            required
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/15 bg-cosmic-900 px-3 py-2 text-white"
            placeholder="минимум 8 символов"
          />
        </div>
        {displayError && <p className="text-sm text-rose-400">{displayError}</p>}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-violet-600 py-3 font-medium text-white hover:bg-violet-500 disabled:opacity-50"
        >
          {pending ? 'Загрузка…' : mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
        </button>
      </form>
    </div>
  )
}
