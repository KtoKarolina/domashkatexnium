# Деплой на Timeweb Cloud (бэкенд + фронт)

Краткие вводные без секретов. Реальные ключи — только в панели Timeweb / Supabase и в локальных `.env` (не в Git).

## Бэкенд (App Platform / Docker)

- **Путь до проекта:** `/star-oracle/backend`
- **Запуск:** `npm start` (или образ из `Dockerfile` в этой папке).
- **Health check:** `/api/health`
- **Переменные:** см. `star-oracle/backend/.env.example` — `SUPABASE_*`, `TELEGRAM_BOT_TOKEN`, при необходимости `OPENAI_API_KEY`, **`CORS_ORIGINS`** (URL фронта через запятую, без пробелов).
- Публичный URL вида `https://….twc1.net` — его же указываете во фронте как **`VITE_API_BASE`** (без `/` в конце).

## Фронтенд (App Platform, Vite + React)

- **Путь до проекта:** `/star-oracle/frontend`
- **Фреймворк в панели:** «Другой» или с шаблоном, но команды должны совпадать ниже.
- **Команда сборки (если нет отдельного поля под `npm install`):**  
  `npm install && npm run build`
- **Команда запуска:** `npm start` (поднимает `host-static.mjs`, отдаёт `dist/` с SPA fallback).
- **Директория сборки (артефакты Vite):** `dist` (не абсолютный `/dist` от корня сервера).
- **Системные зависимости (apt):** не указывать `npm install` — для apt только имена пакетов (например `curl`) или пусто. Иначе ошибка вида `Unable to locate package install`.

### Переменные фронта (пример имён)

- `VITE_SUPABASE_URL` — Project URL из Supabase (**Settings → API**), вид `https://<ref>.supabase.co`
- `VITE_SUPABASE_ANON_KEY` — в новой панели Supabase это **Publishable** ключ; при необходимости вкладка **Legacy anon**
- `VITE_API_BASE` — **https-URL бэкенда** на Timeweb (тот же хост, где открывается `/api/health`)

После смены переменных — пересборка / редеплой.

## Свой домен (например karolinaorakul.ru)

1. В **панели приложения фронта** привяжите домен (и при необходимости `www`).
2. В **Timeweb → Домены и SSL → DNS** для записей **A** / **CNAME** используйте **цели, которые даёт Timeweb** для этого приложения.
3. После переноса с Vercel **удалите** старые записи на Vercel:
   - **A** на IP вроде `216.198.79.1`, `76.76.21.21` (это Vercel);
   - **CNAME** `www` на `….vercel-dns-….`
4. Если в браузере видно **`DEPLOYMENT_NOT_FOUND`** и `fra1::…` — запрос всё ещё уходит на **Vercel**: исправьте DNS, подождите распространения, при необходимости `ipconfig /flushdns`.

**MX** и **SPF** для почты трогать не обязательно при смене A только для сайта — уточняйте поддержку Timeweb, если почта на этом домене.

## CORS

На бэкенде в **`CORS_ORIGINS`** перечислите все URL, с которых открывается сайт:

`https://ваш-домен.ru`, `https://www.ваш-домен.ru`, при необходимости URL вида `https://….twc1.net` до привязки домена.

## Проверки

- `https://ВАШ-БЭКЕНД/api/health` → `{"status":"ok",…}`
- Главная фронта и прямые ссылки маршрутов React (без 404 от Vercel или CDN).
