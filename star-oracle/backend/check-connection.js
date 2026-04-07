import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

async function main() {
  console.log('Supabase URL:', process.env.SUPABASE_URL)
  console.log()

  const tables = ['subscribers', 'birth_profiles', 'profiles', 'daily_predictions']

  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('*').limit(3)
    if (error) {
      console.log(`  [x] ${t} — ${error.message}`)
    } else {
      console.log(`  [ok] ${t} — ${data.length} row(s)`)
      if (data.length > 0) console.log('       ', JSON.stringify(data[0]).slice(0, 120))
    }
  }
}

main().catch(console.error)
