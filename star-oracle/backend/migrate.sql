-- ============================================================
-- Миграция: добавить таблицу predictions, убрать prediction_cache
-- Выполнить в SQL Editor: https://supabase.com/dashboard/project/nefvwdrqzegiurxdgqzx/sql/new
-- ============================================================

-- 1. Новая таблица predictions
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

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'predictions' AND policyname = 'Service role full access on predictions'
  ) THEN
    CREATE POLICY "Service role full access on predictions"
      ON predictions FOR ALL USING (TRUE) WITH CHECK (TRUE);
  END IF;
END $$;

-- 2. Убрать старый prediction_cache (заменён на predictions)
DROP TABLE IF EXISTS prediction_cache;
