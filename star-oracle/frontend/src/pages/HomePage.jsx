import { NavLink } from 'react-router-dom'
import { CosmicStars } from '../CosmicStars.jsx'
import { Card } from '../components/Card.jsx'

export function HomePage() {
  return (
    <div>
      <section className="relative mb-10 overflow-hidden rounded-3xl border border-violet-400/15 bg-violet-900/20 px-4 py-10 text-center md:py-14">
        <CosmicStars className="opacity-40" />
        <div className="relative z-[1]">
          <p className="text-3xl md:text-4xl">🌟 ✨ 🌙 💫 ⭐</p>
          <p className="mt-3 text-sm text-star-rose md:text-base">
            ведический астролог <span className="font-medium text-star-gold">kto.karolina</span>
          </p>
          <h1 className="font-display mt-2 text-3xl font-semibold text-star-gold md:text-5xl">
            Звёздный оракул
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-purple-100 md:text-base">
            Дата рождения → ежедневный прогноз. Регистрация не обязательна — можно сразу на сайте.
          </p>
          <div className="mx-auto mt-8 max-w-lg">
            <NavLink
              to="/onboarding"
              className="block w-full rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-5 text-center text-base font-semibold text-white shadow-lg transition hover:opacity-90"
            >
              🎂 Указать дату и открыть прогноз
            </NavLink>
          </div>
        </div>
      </section>

      <Card className="mb-8 border-star-gold/25 bg-violet-900/15">
        <h2 className="font-display text-lg text-star-gold md:text-xl">💡 Зачем прогнозы</h2>
        <ul className="mt-3 space-y-2 text-left text-sm text-purple-100 md:text-base">
          <li>📅 Проще планировать день и не нервничать попусту.</li>
          <li>🧘 Яснее, что поддержать, а от чего отступить.</li>
          <li>💡 Ежедневные подсказки на основе вашего знака.</li>
        </ul>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {[
          { icon: '🎂', t: 'Дата', d: 'Ваш профиль' },
          { icon: '🌙', t: 'Прогноз', d: 'День · число · советы' },
        ].map((step) => (
          <Card key={step.t}>
            <p className="text-2xl">{step.icon}</p>
            <h3 className="font-display mt-1 text-lg text-star-gold">{step.t}</h3>
            <p className="mt-1 text-xs text-purple-200 md:text-sm">{step.d}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}
