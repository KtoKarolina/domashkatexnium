import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

async function main() {
  console.log('Supabase URL:', process.env.SUPABASE_URL)
  console.log()

  // 1. Check if subscribers table exists
  console.log('1. Checking if "subscribers" table exists...')
  const { data, error } = await supabase.from('subscribers').select('id').limit(1)

  if (error && error.code === '42P01') {
    console.log('   Table "subscribers" does NOT exist.')
    console.log()
    console.log('   Please create it:')
    console.log('   Open Supabase Dashboard -> SQL Editor -> paste this SQL:')
    console.log()
    console.log(`
CREATE TABLE IF NOT EXISTS subscribers (
  id          SERIAL        PRIMARY KEY,
  email       TEXT          NOT NULL UNIQUE,
  birth_date  VARCHAR(10)   NOT NULL CHECK (birth_date ~ '^\\d{4}-\\d{2}-\\d{2}$'),
  active      BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscribers_email ON subscribers (email);

ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access"
  ON subscribers FOR ALL
  USING (TRUE) WITH CHECK (TRUE);
`)
    console.log('   Then re-run this script: node setup-db.js')
    return
  }

  if (error) {
    console.log('   Error:', error.message)
    console.log('   Code:', error.code)
    return
  }

  console.log('   Table "subscribers" exists. Rows found:', data.length)
  console.log()

  // 2. Insert a test subscriber
  console.log('2. Inserting test subscriber...')
  const testEmail = 'test@star-oracle.dev'

  const existing = await supabase
    .from('subscribers')
    .select('*')
    .eq('email', testEmail)
    .maybeSingle()

  if (existing.data) {
    console.log('   Test subscriber already exists:', existing.data)
  } else {
    const { data: inserted, error: insertErr } = await supabase
      .from('subscribers')
      .insert({ email: testEmail, birth_date: '1995-06-15' })
      .select()
      .single()

    if (insertErr) {
      console.log('   Insert error:', insertErr.message)
    } else {
      console.log('   Inserted:', inserted)
    }
  }

  // 3. Verify by reading back
  console.log()
  console.log('3. All subscribers:')
  const { data: all, error: allErr } = await supabase
    .from('subscribers')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10)

  if (allErr) {
    console.log('   Error:', allErr.message)
  } else {
    console.table(all)
  }

  console.log()
  console.log('Database connection verified! Backend is ready to use.')
}

main().catch(console.error)
