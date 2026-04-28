const KEY = 'star-oracle-guest-birth'

export function readGuestBirth() {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const o = JSON.parse(raw)
    if (!o || typeof o.date !== 'string' || !o.date.trim()) return null
    return {
      date: o.date.trim(),
      time: typeof o.time === 'string' ? o.time : '',
      city: typeof o.city === 'string' ? o.city : '',
    }
  } catch {
    return null
  }
}

export function writeGuestBirth({ date, time, city }) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(
    KEY,
    JSON.stringify({
      date,
      time: time || '',
      city: city || '',
    }),
  )
}

export function clearGuestBirth() {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(KEY)
}
