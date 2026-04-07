import { useState } from 'react'
import { useAuth } from './AuthContext.jsx'

export function EmailLoginForm() {
  const { signInOrSignUp, authActionError } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setPending(true)
    try {
      await signInOrSignUp(email.trim(), password)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center bg-cosmic-950 px-4 py-10">
      <h1 className="font-display text-center text-2xl text-star-gold">Звёздный оракул</h1>
      <p className="mt-2 text-center text-sm text-slate-400">
        Войдите или зарегистрируйтесь (email и пароль). Анонимный вход в проекте отключён.
      </p>
      <form
        onSubmit={handleSubmit}
        className="mt-8 space-y-4 rounded-2xl border border-violet-500/30 bg-violet-950/40 p-6"
      >
        <div>
          <label className="block text-sm text-slate-400">Email</label>
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
          <label className="block text-sm text-slate-400">Пароль</label>
          <input
            type="password"
            required
            autoComplete="current-password"
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/15 bg-cosmic-900 px-3 py-2 text-white"
            placeholder="не менее 6 символов"
          />
        </div>
        {authActionError ? <p className="text-sm text-rose-400">{authActionError}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-violet-600 py-3 font-medium text-white hover:bg-violet-500 disabled:opacity-50"
        >
          {pending ? 'Загрузка…' : 'Войти или создать аккаунт'}
        </button>
      </form>
    </div>
  )
}
