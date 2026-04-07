-- ============================================================
-- Звёздный Оракул — схема БД (PostgreSQL / Supabase)
-- ============================================================

-- Таблица подписчиков
CREATE TABLE IF NOT EXISTS subscribers (
  id          SERIAL        PRIMARY KEY,
  email       TEXT          NOT NULL UNIQUE,
  birth_date  VARCHAR(10)   NOT NULL CHECK (birth_date ~ '^\d{4}-\d{2}-\d{2}$'),
  active      BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Индекс для быстрого поиска по email
CREATE INDEX IF NOT EXISTS idx_subscribers_email ON subscribers (email);

-- RLS (Row Level Security) — если используется Supabase
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;

-- Разрешить серверу (service_role) полный доступ
CREATE POLICY "Service role full access"
  ON subscribers
  FOR ALL
  USING (TRUE)
  WITH CHECK (TRUE);

-- ============================================================
-- Примеры запросов
-- ============================================================

-- 1. Создать подписчика (INSERT ... ON CONFLICT — upsert)
--    Если email уже существует, вернуть существующую запись без ошибки
/*
INSERT INTO subscribers (email, birth_date)
VALUES ('user@example.com', '1995-03-21')
ON CONFLICT (email) DO NOTHING
RETURNING *;
*/

-- 2. Получить подписчика по email
/*
SELECT * FROM subscribers WHERE email = 'user@example.com';
*/

-- 3. Деактивировать подписчика (отписка)
/*
UPDATE subscribers SET active = FALSE WHERE email = 'user@example.com';
*/

-- 4. Все активные подписчики (для ежедневной рассылки)
/*
SELECT id, email, birth_date FROM subscribers WHERE active = TRUE;
*/
