-- Выполните один раз в SQL Editor (для upsert партнёра и JSON совместимости)
ALTER TABLE partner_birth_profiles ADD COLUMN IF NOT EXISTS analysis jsonb DEFAULT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS partner_birth_profiles_user_id_label_key
  ON partner_birth_profiles (user_id, label);
