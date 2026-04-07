import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { CosmicStars } from '../CosmicStars.jsx'

export function Layout() {
  const location = useLocation()
  const linkClass = ({ isActive }) =>
    `rounded-lg px-3 py-2 text-sm transition-colors ${
      isActive
        ? 'bg-violet-600/40 text-violet-100 ring-1 ring-violet-400/50'
        : 'text-purple-200 hover:bg-violet-800/30 hover:text-white'
    }`

  return (
    <div className="relative flex min-h-screen flex-col">
      <div className="pointer-events-none fixed inset-0 -z-10 opacity-50">
        <CosmicStars />
      </div>
      <header className="relative border-b border-violet-400/15 bg-cosmic-950/85 backdrop-blur-md">
        <CosmicStars className="opacity-25" />
        <div className="relative z-[1] mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between md:py-4">
          <NavLink to="/" className="font-display text-lg text-star-gold md:text-xl">
            ✨ Звёздный оракул
          </NavLink>
          <nav className="flex flex-wrap gap-1 text-xs md:text-sm">
            <NavLink to="/" end className={linkClass}>
              🏠 Главная
            </NavLink>
            <NavLink to="/onboarding" className={linkClass}>
              🎂 Дата
            </NavLink>
            <NavLink to="/forecast" className={linkClass}>
              🌙 Прогноз
            </NavLink>
            <NavLink to="/subscribe" className={linkClass}>
              📬 Подписка
            </NavLink>
            <NavLink to="/profile" className={linkClass}>
              ⚙️ Профиль
            </NavLink>
            <NavLink to="/legal" className={linkClass}>
              📋 Юр.
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-5xl flex-1 px-4 py-6 md:py-10">
        <div
          key={location.pathname}
          className="page-violet-surface min-h-[min(70vh,720px)] rounded-3xl border border-violet-500/40 bg-gradient-to-b from-violet-950/55 via-purple-950/45 to-violet-950/55 p-5 shadow-[0_0_48px_rgba(109,40,217,0.2)] md:p-8"
        >
          <Outlet />
        </div>
      </main>

      <footer className="border-t border-violet-400/15 py-4 text-center text-xs text-purple-300">
        ⭐ Звёздный оракул · kto.karolina · V2
      </footer>
    </div>
  )
}
