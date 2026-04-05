import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { isSupabaseConfigured, supabase } from './supabaseClient.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  /** Анонимный вход выключен в Supabase — показываем форму email/пароль */
  const [needsEmailLogin, setNeedsEmailLogin] = useState(false)
  const [authActionError, setAuthActionError] = useState(null)

  const signInOrSignUp = useCallback(async (email, password) => {
    if (!supabase) return
    setAuthActionError(null)
    if (!email || !password) {
      setAuthActionError('Введите email и пароль.')
      return
    }

    const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (!signInErr && signInData?.session) {
      setSession(signInData.session)
      setNeedsEmailLogin(false)
      return
    }

    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({ email, password })
    if (!signUpErr && signUpData?.session) {
      setSession(signUpData.session)
      setNeedsEmailLogin(false)
      return
    }

    if (!signUpErr && signUpData?.user && !signUpData.session) {
      setAuthActionError(
        'Аккаунт создан. Откройте ссылку из письма Supabase, затем войдите снова с этим паролем.',
      )
      return
    }

    if (signUpErr?.message?.includes('already registered') || signUpErr?.status === 422) {
      setAuthActionError(signInErr?.message || 'Неверный email или пароль.')
      return
    }

    setAuthActionError(signUpErr?.message || signInErr?.message || 'Не удалось войти.')
  }, [])

  useEffect(() => {
    let cancelled = false

    async function ensureSession() {
      setError(null)
      setNeedsEmailLogin(false)
      if (!isSupabaseConfigured || !supabase) {
        if (!cancelled) {
          setError(
            'Не заданы SUPABASE_URL и SUPABASE_ANON_KEY. Создайте файл .env в папке star-oracle (см. .env.example).',
          )
          setLoading(false)
        }
        return
      }

      try {
        const {
          data: { session: existing },
          error: sessionErr,
        } = await supabase.auth.getSession()
        if (sessionErr) throw sessionErr

        if (existing?.user) {
          if (!cancelled) setSession(existing)
          return
        }

        const { data: anonData, error: anonErr } = await supabase.auth.signInAnonymously()
        if (!anonErr && anonData?.session) {
          if (!cancelled) setSession(anonData.session)
          return
        }

        if (!cancelled) setNeedsEmailLogin(true)
      } catch (e) {
        if (!cancelled) setError(e?.message || String(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    ensureSession()

    if (!supabase) {
      return () => {
        cancelled = true
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      if (next?.user) setNeedsEmailLogin(false)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  const value = {
    session,
    user: session?.user ?? null,
    loading,
    error,
    needsEmailLogin,
    authActionError,
    signInOrSignUp,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth должен использоваться внутри AuthProvider')
  return ctx
}
