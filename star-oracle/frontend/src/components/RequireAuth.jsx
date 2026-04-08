import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'

export function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cosmic-950 text-lg text-star-gold">
        Загрузка…
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}
