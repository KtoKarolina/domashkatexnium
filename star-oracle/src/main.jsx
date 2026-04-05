import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider, useAuth } from './AuthContext.jsx'
import { EmailLoginForm } from './EmailLoginForm.jsx'
import './index.css'

class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { err: null }
  }

  static getDerivedStateFromError(err) {
    return { err }
  }

  render() {
    if (this.state.err) {
      return (
        <div className="min-h-screen bg-cosmic-950 px-4 py-8 text-rose-400">
          <p className="font-medium">Ошибка интерфейса</p>
          <pre className="mt-2 whitespace-pre-wrap text-sm text-slate-400">{String(this.state.err)}</pre>
        </div>
      )
    }
    return this.props.children
  }
}

function AppGate() {
  const { loading, error, needsEmailLogin, user } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cosmic-950 px-4 text-center text-lg text-star-gold">
        Загрузка…
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cosmic-950 px-4 text-center text-rose-400">
        <p>
          Ошибка: {error}
          <br />
          <span className="mt-2 block text-sm text-slate-400">Проверьте .env и ключи в Supabase.</span>
        </p>
      </div>
    )
  }

  if (needsEmailLogin && !user) {
    return <EmailLoginForm />
  }

  return <App />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <AppGate />
        </AuthProvider>
      </BrowserRouter>
    </RootErrorBoundary>
  </React.StrictMode>,
)
