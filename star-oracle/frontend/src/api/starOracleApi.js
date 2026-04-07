import { supabase, assertSupabaseConfigured } from '../supabaseClient.js'
import { generateDailyForecast } from '../forecastGenerator.js'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001'

export function localDateISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function mapForecastPayload(row) {
  if (!row || typeof row.payload !== 'object' || row.payload === null) return null
  const p = row.payload
  const favorable = Array.isArray(p.favorable) ? p.favorable : []
  const avoid = Array.isArray(p.avoid) ? p.avoid : []
  const mainText = typeof p.mainText === 'string' ? p.mainText : ''
  const vedicHint = typeof p.vedicHint === 'string' ? p.vedicHint : ''
  if (!mainText && !vedicHint && favorable.length === 0 && avoid.length === 0) return null
  return {
    vedicHint,
    mainText,
    luckyNumber: typeof p.luckyNumber === 'number' ? p.luckyNumber : 0,
    luckyNumberNote: typeof p.luckyNumberNote === 'string' ? p.luckyNumberNote : '',
    favorable,
    avoid,
  }
}

export async function fetchDailyForecast(userId) {
  assertSupabaseConfigured()
  const predictionDate = localDateISO()

  const { data, error } = await supabase
    .from('daily_predictions')
    .select('id, payload, prediction_date')
    .eq('user_id', userId)
    .eq('prediction_date', predictionDate)
    .maybeSingle()

  if (error) throw error

  if (data) {
    const mapped = mapForecastPayload(data)
    if (mapped) return { row: data, forecast: mapped, predictionDate }
  }

  const birth = await fetchPrimaryBirth(userId)
  if (birth?.date) {
    const generated = generateDailyForecast(birth.date, predictionDate)
    return { row: null, forecast: generated, predictionDate }
  }

  return { row: null, forecast: null, predictionDate }
}

export async function fetchPrimaryBirth(userId) {
  assertSupabaseConfigured()
  const { data, error } = await supabase
    .from('birth_profiles')
    .select('id, birth_date, birth_time, birth_city, is_primary')
    .eq('user_id', userId)
    .eq('is_primary', true)
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  return {
    date: data.birth_date,
    time: data.birth_time ? String(data.birth_time).slice(0, 5) : '',
    city: data.birth_city ?? '',
  }
}

export async function upsertPrimaryBirth(userId, { date, time, city }) {
  assertSupabaseConfigured()
  const { data: existing, error: selErr } = await supabase
    .from('birth_profiles')
    .select('id')
    .eq('user_id', userId)
    .eq('is_primary', true)
    .maybeSingle()

  if (selErr) throw selErr

  const payload = {
    user_id: userId,
    birth_date: date,
    birth_time: time && time.length > 0 ? `${time}:00` : null,
    birth_city: city && city.trim() ? city.trim() : null,
    is_primary: true,
  }

  if (existing?.id) {
    const { error } = await supabase.from('birth_profiles').update(payload).eq('id', existing.id)
    if (error) throw error
  } else {
    const { error } = await supabase.from('birth_profiles').insert(payload)
    if (error) throw error
  }
}

export async function upsertProfileContacts(userId, { email, telegram }) {
  assertSupabaseConfigured()
  const tg = telegram.replace(/^@/, '').trim()
  const em = email.trim()
  const { error } = await supabase.from('profiles').upsert(
    {
      user_id: userId,
      newsletter_email: em || null,
      telegram_username: tg || null,
      email_notifications: Boolean(em),
      telegram_notifications: Boolean(tg),
      consent_accepted_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )

  if (error) throw error
}

export async function fetchProfileRow(userId) {
  assertSupabaseConfigured()
  const { data, error } = await supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle()

  if (error) throw error
  return data
}

export async function deleteUserStoredReadings(userId) {
  assertSupabaseConfigured()
  const errors = []
  for (const table of ['daily_predictions', 'birth_profiles', 'profiles']) {
    const { error } = await supabase.from(table).delete().eq('user_id', userId)
    if (error) errors.push(`${table}: ${error.message}`)
  }
  if (errors.length) throw new Error(errors.join('; '))
}

// ─── Backend API (Express + OpenAI) ───────────────────────

export async function fetchAIPrediction(birthDate) {
  const res = await fetch(`${API_BASE}/api/prediction?birthDate=${encodeURIComponent(birthDate)}`)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Ошибка сервера: ${res.status}`)
  }
  return res.json()
}

export async function createSubscriber(email, birthDate) {
  const res = await fetch(`${API_BASE}/api/subscribers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, birthDate }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Ошибка сервера: ${res.status}`)
  }
  return res.json()
}

export async function fetchSubscriber(email) {
  const res = await fetch(`${API_BASE}/api/subscribers?email=${encodeURIComponent(email)}`)
  if (res.status === 404) return null
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Ошибка сервера: ${res.status}`)
  }
  const data = await res.json()
  return data.subscriber
}
