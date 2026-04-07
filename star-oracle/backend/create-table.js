import 'dotenv/config'

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const SQL = `
CREATE TABLE IF NOT EXISTS subscribers (
  id          SERIAL        PRIMARY KEY,
  email       TEXT          NOT NULL UNIQUE,
  birth_date  VARCHAR(10)   NOT NULL CHECK (birth_date ~ '^\\d{4}-\\d{2}-\\d{2}$'),
  active      BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscribers_email ON subscribers (email);

ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'subscribers' AND policyname = 'Service role full access'
  ) THEN
    CREATE POLICY "Service role full access" ON subscribers FOR ALL USING (TRUE) WITH CHECK (TRUE);
  END IF;
END $$;
`

async function tryMethod(name, fn) {
  try {
    console.log(`Trying: ${name}...`)
    const result = await fn()
    console.log(`  Success!`)
    return result
  } catch (e) {
    console.log(`  Failed: ${e.message}`)
    return null
  }
}

async function main() {
  // Method 1: pg-meta query endpoint (available in most Supabase projects)
  let ok = await tryMethod('pg-meta /query', async () => {
    const res = await fetch(`${SUPABASE_URL}/pg-meta/default/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({ query: SQL }),
    })
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`)
    return await res.json()
  })

  if (!ok) {
    // Method 2: try /rest/v1/ endpoint with raw SQL via rpc
    ok = await tryMethod('REST rpc pg_execute', async () => {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({ query: SQL }),
      })
      if (!res.ok) throw new Error(`${res.status} ${await res.text()}`)
      return await res.json()
    })
  }

  if (!ok) {
    console.log('\n--- Automatic table creation failed ---')
    console.log('Please create the table manually:')
    console.log('1. Open: https://supabase.com/dashboard/project/nefvwdrqzegiurxdgqzx/sql/new')
    console.log('2. Paste the SQL below and click "Run":')
    console.log(SQL)
    return
  }

  // Verify
  console.log('\nVerifying table...')
  const res = await fetch(`${SUPABASE_URL}/rest/v1/subscribers?select=id&limit=1`, {
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
  })
  if (res.ok) {
    console.log('Table "subscribers" created and accessible!')
  } else {
    console.log('Verification result:', res.status, await res.text())
  }
}

main().catch(console.error)
