# Удалённый бэкенд и Telegram-бот (без включенного ПК)

Бот использует **long polling**: процесс Node.js должен работать **круглосуточно**. Подойдёт любой хостинг с постоянным контейнером/процессом (не serverless вроде Vercel только для API).

## Railway (рекомендуется)

1. Зайдите на [railway.app](https://railway.app), войдите через GitHub.
2. **New Project** → **Deploy from GitHub repo** → выберите `domashkatexnium`.
3. После импорта откройте сервис → **Settings**:
   - **Root Directory**: `star-oracle/backend`
   - **Watch Paths** (если есть): можно оставить по умолчанию или указать `star-oracle/backend/**`
4. **Variables** — добавьте те же переменные, что в локальном `backend/.env` (скопируйте значения вручную, файл в Git не попадает):
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `TELEGRAM_BOT_TOKEN`
   - `OPENAI_API_KEY` (по желанию; без ключа сработает локальный генератор)
5. **Settings → Deploy** — при необходимости включите пересборку. Railway подхватит `Dockerfile`.
6. После деплоя в **Settings → Networking** нажмите **Generate Domain** — получите URL вида `https://xxx.up.railway.app`.
7. В логах деплоя должно быть: `Long-polling активен: @zvezdnyiorakul_bot`.

**Важно:** с одним токеном бота должен работать **только один** запущенный бэкенд. Остановите локальный `npm run dev`, иначе будет конфликт 409 в Telegram.

## Сайт (фронтенд)

Чтобы формы на сайте ходили в облачный API, при сборке фронта задайте:

```env
VITE_API_BASE=https://ВАШ-URL-ИЗ-RAILWAY.up.railway.app
```

Пересоберите и задеплойте фронт (Netlify, Vercel, Cloudflare Pages и т.д.).

## Проверка

Откройте в браузере: `https://ВАШ-URL/api/health` — ответ `{"status":"ok",...}`.

## Бесплатный Render

На бесплатном плане Render сервис **засыпает** при простое — бот перестанет отвечать. Для бота нужен платный инстанс или другой хостинг без сна.
