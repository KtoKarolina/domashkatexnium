import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

async function describeTable(name) {
  const { data, error } = await supabase.from(name).select('*').limit(2)
  if (error) return { name, error: error.message, columns: null, sample: null }
  const columns = data.length > 0 ? Object.keys(data[0]) : '(empty — no rows to infer columns)'
  return { name, error: null, columns, sample: data }
}

async function main() {
  const tables = ['birth_profiles', 'profiles', 'daily_predictions', 'partner_birth_profiles', 'subscribers']

  for (const t of tables) {
    const info = await describeTable(t)
    console.log(`\n=== ${info.name} ===`)
    if (info.error) {
      console.log(`  ERROR: ${info.error}`)
    } else {
      console.log(`  Columns: ${JSON.stringify(info.columns)}`)
      if (info.sample?.length > 0) {
        console.log(`  Sample row:`)
        console.log(`    ${JSON.stringify(info.sample[0], null, 2)}`)
      } else {
        console.log('  (no rows)')
      }
    }
  }
}

main().catch(console.error)
