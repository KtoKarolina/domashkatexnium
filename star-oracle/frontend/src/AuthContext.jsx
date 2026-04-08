import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { isSupabaseConfigured, supabase } from './supabaseClient.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [authActionError, setAuthActionError] = useState(null)

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setError('Не заданы SUPABASE_URL и SUPABASE_ANON_KEY. Создайте файл .env (см. .env.example).')
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
    })

    return () => subscription.unsubscribe()
  }, [])

  const register = useCallback(async (email, password) => {
    if (!supabase) return
    setAuthActionError(null)

    if (!email || !password) {
      setAuthActionError('Введите email и пароль.')
      return
    }
    if (password.length < 8) {
      setAuthActionError('Пароль должен содержать минимум 8 символов.')
      return
    }

    const { data, error: err } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
    })

    if (err) {
      setAuthActionError(err.message)
      return
    }

    if (data.session) {
      setSession(data.session)
      return
    }

    if (data.user && !data.session) {
      setAuthActionError('Аккаунт создан. Подтвердите email по ссылке из письма, затем войдите.')
    }
  }, [])

  const login = useCallback(async (email, password) => {
    if (!supabase) return
    setAuthActionError(null)

    if (!email || !password) {
      setAuthActionError('Введите email и пароль.')
      return
    }

    const { data, error: err } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })

    if (err) {
      setAuthActionError(err.message)
      return
    }

    if (data.session) {
      setSession(data.session)
    }
  }, [])

  const logout = useCallback(async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    setSession(null)
  }, [])

  const value = {
    session,
    user: session?.user ?? null,
    accessToken: session?.access_token ?? null,
    loading,
    error,
    authActionError,
    register,
    login,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth должен использоваться внутри AuthProvider')
  return ctx
}
