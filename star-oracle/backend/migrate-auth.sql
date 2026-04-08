-- ============================================================
-- Миграция: авторизация, роли, RLS-политики
-- Выполнить в SQL Editor Supabase
-- ============================================================

-- 1. Добавить поле role в profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';

-- 2. Триггер: авто-создание профиля при регистрации
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

-- 3. Включить RLS
ALTER TABLE subscribers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE birth_profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_predictions ENABLE ROW LEVEL SECURITY;

-- 4. subscribers: user видит/пишет только свои
DROP POLICY IF EXISTS "Service role full access on subscribers" ON subscribers;
DROP POLICY IF EXISTS "Service role full access" ON subscribers;
DROP POLICY IF EXISTS "User sees own subscribers" ON subscribers;
DROP POLICY IF EXISTS "User inserts own subscriber" ON subscribers;
DROP POLICY IF EXISTS "User updates own subscriber" ON subscribers;
DROP POLICY IF EXISTS "Users read own subscribers" ON subscribers;
DROP POLICY IF EXISTS "Users insert own subscribers" ON subscribers;
DROP POLICY IF EXISTS "Users update own subscribers" ON subscribers;

CREATE POLICY "User sees own subscribers"
  ON subscribers FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "User inserts own subscriber"
  ON subscribers FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "User updates own subscriber"
  ON subscribers FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 5. predictions: чтение для авторизованных, запись только service_role
DROP POLICY IF EXISTS "Service role full access on predictions" ON predictions;
DROP POLICY IF EXISTS "Authenticated can read predictions" ON predictions;
DROP POLICY IF EXISTS "Authenticated read predictions" ON predictions;
DROP POLICY IF EXISTS "Service role writes predictions" ON predictions;

CREATE POLICY "Authenticated can read predictions"
  ON predictions FOR SELECT
  TO authenticated
  USING (true);

-- 6. profiles: чтение владелец, запись только service_role
DROP POLICY IF EXISTS "Service role full access" ON profiles;
DROP POLICY IF EXISTS "Service role full access on profiles" ON profiles;
DROP POLICY IF EXISTS "User reads own profile" ON profiles;
DROP POLICY IF EXISTS "User updates own profile" ON profiles;
DROP POLICY IF EXISTS "Owner reads own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile." ON profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON profiles;

CREATE POLICY "Owner reads own profile"
  ON profiles FOR SELECT
  USING (user_id = auth.uid());

-- 7. birth_profiles: владелец полный CRUD
DROP POLICY IF EXISTS "Users can view own birth profiles." ON birth_profiles;
DROP POLICY IF EXISTS "Users can insert own birth profiles." ON birth_profiles;
DROP POLICY IF EXISTS "Users can update own birth profiles." ON birth_profiles;
DROP POLICY IF EXISTS "Users can delete own birth profiles." ON birth_profiles;
DROP POLICY IF EXISTS "Owner manages own birth_profiles" ON birth_profiles;

CREATE POLICY "Owner select birth_profiles"
  ON birth_profiles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Owner insert birth_profiles"
  ON birth_profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Owner update birth_profiles"
  ON birth_profiles FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Owner delete birth_profiles"
  ON birth_profiles FOR DELETE
  USING (user_id = auth.uid());

-- 8. daily_predictions: владелец полный CRUD
DROP POLICY IF EXISTS "Users can view own predictions." ON daily_predictions;
DROP POLICY IF EXISTS "Users can insert own predictions." ON daily_predictions;
DROP POLICY IF EXISTS "Users can update own predictions." ON daily_predictions;
DROP POLICY IF EXISTS "Users can delete own predictions." ON daily_predictions;
DROP POLICY IF EXISTS "Owner manages own daily_predictions" ON daily_predictions;

CREATE POLICY "Owner select daily_predictions"
  ON daily_predictions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Owner insert daily_predictions"
  ON daily_predictions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Owner update daily_predictions"
  ON daily_predictions FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Owner delete daily_predictions"
  ON daily_predictions FOR DELETE
  USING (user_id = auth.uid());
