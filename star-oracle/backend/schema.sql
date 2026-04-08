-- ============================================================
-- Star Oracle: full DB schema (PostgreSQL / Supabase)
-- ============================================================

-- 1. subscribers
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

CREATE POLICY "User sees own subscribers"
  ON subscribers FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "User inserts own subscriber"
  ON subscribers FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "User updates own subscriber"
  ON subscribers FOR UPDATE
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 2. predictions (AI cache: one OpenAI call per sign per day)
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

CREATE POLICY "Authenticated can read predictions"
  ON predictions FOR SELECT TO authenticated USING (true);

-- 3. profiles (role + contact info; writes only via service_role)
-- Table already exists; migration adds role column.
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner reads own profile"
  ON profiles FOR SELECT USING (user_id = auth.uid());

-- 4. birth_profiles (owner full CRUD)
ALTER TABLE birth_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner select birth_profiles"
  ON birth_profiles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Owner insert birth_profiles"
  ON birth_profiles FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owner update birth_profiles"
  ON birth_profiles FOR UPDATE
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owner delete birth_profiles"
  ON birth_profiles FOR DELETE USING (user_id = auth.uid());

-- 5. daily_predictions (owner full CRUD)
ALTER TABLE daily_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner select daily_predictions"
  ON daily_predictions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Owner insert daily_predictions"
  ON daily_predictions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owner update daily_predictions"
  ON daily_predictions FOR UPDATE
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owner delete daily_predictions"
  ON daily_predictions FOR DELETE USING (user_id = auth.uid());

-- 6. Trigger: auto-create profile on registration
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
