-- ============================================================
-- Звёздный Оракул — полная схема БД (PostgreSQL / Supabase)
-- ============================================================

-- 1. subscribers — подписчики
CREATE TABLE IF NOT EXISTS subscribers (
  id            SERIAL        PRIMARY KEY,
  user_id       UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
  email         TEXT          NOT NULL UNIQUE,
  birth_date    VARCHAR(10)   NOT NULL CHECK (birth_date ~ '^\d{4}-\d{2}-\d{2}$'),
  zodiac_sign   TEXT,
  active        BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscribers_email ON subscribers (email);

ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on subscribers"
  ON subscribers FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- 2. predictions — кэш AI-прогнозов (один запрос OpenAI на знак в день)
CREATE TABLE IF NOT EXISTS predictions (
  id              SERIAL        PRIMARY KEY,
  subscriber_id   INTEGER       REFERENCES subscribers(id) ON DELETE SET NULL,
  sign            TEXT          NOT NULL,
  prediction      TEXT          NOT NULL,
  lucky_number    INTEGER       NOT NULL,
  color           TEXT          NOT NULL,
  date            DATE          NOT NULL DEFAULT CURRENT_DATE,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_predictions_sign_date
  ON predictions (sign, date);

ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on predictions"
  ON predictions FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- 3. birth_profiles — дата рождения пользователя (без изменений)
-- 4. profiles — контакты для рассылки (без изменений)
-- 5. daily_predictions — персональный кэш прогноза (без изменений)
