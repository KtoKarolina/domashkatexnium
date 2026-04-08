import { Card } from '../components/Card.jsx'
import { PageHeading } from '../components/PageHeading.jsx'

const BOT_URL = 'https://t.me/zvezdnyiorakul_bot'

export function SubscribePage() {
  return (
    <div>
      <PageHeading
        title="📬 Подписка на прогнозы"
        subtitle="Получайте персональный гороскоп каждое утро в Telegram."
      />
      <Card className="max-w-lg text-center">
        <div className="py-6">
          <div className="mb-6 text-6xl">🔮</div>

          <h3 className="mb-3 font-display text-xl text-star-gold">
            Звёздный Оракул в Telegram
          </h3>

          <p className="mb-6 text-purple-200 leading-relaxed">
            Подпишитесь на нашего бота — и каждое утро в 8:00
            вам придёт персональный гороскоп на день.
            Просто укажите дату рождения, и звёзды сделают всё за вас.
          </p>

          <a
            href={BOT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 rounded-xl bg-violet-600 px-8 py-4 text-lg font-medium text-white shadow-lg shadow-violet-900/40 transition hover:bg-violet-500 hover:shadow-violet-800/50"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
            </svg>
            Открыть бота
          </a>

          <div className="mt-8 rounded-lg border border-violet-400/15 p-4 text-left text-sm text-purple-300">
            <p className="mb-2 font-medium text-purple-100">Как это работает:</p>
            <ol className="list-inside list-decimal space-y-1">
              <li>Нажмите «Открыть бота» — откроется Telegram</li>
              <li>Отправьте <code className="rounded bg-violet-900/50 px-1 text-purple-200">/prognoz 21.10.1999</code> (вашу дату рождения)</li>
              <li>Бот определит знак зодиака и пришлёт прогноз</li>
              <li>Каждое утро в 8:00 — новый персональный гороскоп</li>
            </ol>
          </div>
        </div>
      </Card>
    </div>
  )
}
