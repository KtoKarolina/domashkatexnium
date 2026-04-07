import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function check(name) {
  const { data, error } = await supabase.from(name).select('*').limit(1)
  if (error) return console.log(`  [x] ${name} — ${error.message}`)
  console.log(`  [ok] ${name}`)
}

async function main() {
  console.log('Tables:')
  await check('subscribers')
  await check('predictions')
  await check('birth_profiles')
  await check('profiles')
  await check('daily_predictions')

  console.log('\nDeleted:')
  await check('partner_birth_profiles')
  await check('prediction_cache')

  console.log('\nAll good!')
}

main().catch(console.error)
