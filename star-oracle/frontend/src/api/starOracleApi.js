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

async function getAccessToken() {
  if (!supabase) return null
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

async function authHeaders() {
  const token = await getAccessToken()
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

async function apiFetch(url, options = {}) {
  const res = await fetch(url, options)

  if (res.status === 401) {
    if (supabase) await supabase.auth.signOut()
    throw new Error('Сессия истекла. Войдите снова.')
  }

  if (res.status === 403) {
    throw new Error('Нет прав')
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message || `Ошибка сервера: ${res.status}`)
  }

  return res.json()
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
  const headers = await authHeaders()
  return apiFetch(`${API_BASE}/api/profile`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ email, telegram }),
  })
}

export async function fetchProfileRow(userId) {
  const headers = await authHeaders()
  const json = await apiFetch(`${API_BASE}/api/profile`, { headers })
  return json.profile
}

export async function deleteUserStoredReadings(userId) {
  const headers = await authHeaders()
  return apiFetch(`${API_BASE}/api/user/stored-readings`, {
    method: 'DELETE',
    headers,
  })
}

// ─── Backend API (Express) ────────────────────────────────

export async function fetchAIPrediction(birthDate) {
  const headers = await authHeaders()
  return apiFetch(
    `${API_BASE}/api/prediction?birthDate=${encodeURIComponent(birthDate)}`,
    { headers },
  )
}

export async function createSubscriber(email, birthDate) {
  const headers = await authHeaders()
  return apiFetch(`${API_BASE}/api/subscribers`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email, birthDate }),
  })
}
