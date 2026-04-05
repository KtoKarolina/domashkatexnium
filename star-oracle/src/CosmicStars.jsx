/** Декоративный слой «звёздного неба» (SVG-точки + символы ★) */
export function CosmicStars({ className = '' }) {
  const dots = [
    { x: 10, y: 20, r: 1.1, d: '0s' },
    { x: 22, y: 8, r: 0.7, d: '0.4s' },
    { x: 78, y: 12, r: 1, d: '0.8s' },
    { x: 92, y: 35, r: 0.8, d: '1.2s' },
    { x: 5, y: 48, r: 0.9, d: '0.2s' },
    { x: 55, y: 28, r: 0.6, d: '1s' },
    { x: 38, y: 62, r: 1.2, d: '0.6s' },
    { x: 85, y: 72, r: 0.7, d: '1.4s' },
    { x: 15, y: 88, r: 0.8, d: '0.3s' },
    { x: 65, y: 90, r: 0.5, d: '1.1s' },
  ]
  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden opacity-[0.55] ${className}`}
      aria-hidden
    >
      <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {dots.map((s, i) => (
          <circle
            key={i}
            cx={s.x}
            cy={s.y}
            r={s.r}
            fill="#f5e6b8"
            className="animate-pulse"
            style={{ animationDelay: s.d, animationDuration: '2.8s' }}
          />
        ))}
        <text x="48" y="18" fill="#e8d5a3" fontSize="6" opacity="0.85">
          ★
        </text>
        <text x="82" y="55" fill="#c9a0dc" fontSize="5" opacity="0.75">
          ✦
        </text>
        <text x="12" y="72" fill="#e8d5a3" fontSize="4" opacity="0.7">
          ✧
        </text>
      </svg>
    </div>
  )
}
