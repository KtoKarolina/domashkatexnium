-- ============================================================
-- Миграция: авторизация, роли, RLS-политики
-- Выполнить в SQL Editor: https://supabase.com/dashboard/project/nefvwdrqzegiurxdgqzx/sql/new
-- ============================================================

-- 1. Добавить поле role в profiles (если нет)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';

-- 2. Триггер: автоматически создавать профиль при регистрации пользователя
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Включить RLS на всех таблицах
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles    ENABLE ROW LEVEL SECURITY;

-- 4. RLS-политики для subscribers
DROP POLICY IF EXISTS "Service role full access on subscribers" ON subscribers;
DROP POLICY IF EXISTS "Service role full access" ON subscribers;
DROP POLICY IF EXISTS "User sees own subscribers" ON subscribers;
DROP POLICY IF EXISTS "User inserts own subscriber" ON subscribers;

CREATE POLICY "User sees own subscribers"
  ON subscribers FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "User inserts own subscriber"
  ON subscribers FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- 5. RLS-политики для predictions
DROP POLICY IF EXISTS "Service role full access on predictions" ON predictions;
DROP POLICY IF EXISTS "Authenticated can read predictions" ON predictions;
DROP POLICY IF EXISTS "Service role writes predictions" ON predictions;

CREATE POLICY "Authenticated can read predictions"
  ON predictions FOR SELECT
  USING (auth.role() = 'authenticated');

-- 6. RLS-политики для profiles
DROP POLICY IF EXISTS "Service role full access" ON profiles;
DROP POLICY IF EXISTS "User reads own profile" ON profiles;
DROP POLICY IF EXISTS "Service role full access on profiles" ON profiles;

CREATE POLICY "User reads own profile"
  ON profiles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "User updates own profile"
  ON profiles FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
