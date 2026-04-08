-- ============================================================
-- Миграция: поддержка Telegram-бота
-- Выполнить в SQL Editor: https://supabase.com/dashboard/project/nefvwdrqzegiurxdgqzx/sql/new
-- ============================================================

-- telegram_chat_id — nullable: у веб-подписчиков его не будет
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS telegram_chat_id BIGINT;

-- Индекс для быстрой выборки при рассылке
CREATE INDEX IF NOT EXISTS idx_subscribers_chat_id ON subscribers (telegram_chat_id);

-- Политика на обновление собственной записи (если ещё нет)
DROP POLICY IF EXISTS "User updates own subscriber" ON subscribers;
CREATE POLICY "User updates own subscriber"
  ON subscribers FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
