import { CosmicStars } from '../CosmicStars.jsx'

export function Card({ children, className = '' }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-violet-400/15 bg-violet-900/25 p-5 shadow-xl backdrop-blur-sm md:p-6 ${className}`}
    >
      <CosmicStars className="opacity-30" />
      <div className="relative z-[1]">{children}</div>
    </div>
  )
}
