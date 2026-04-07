const LS_PROFILE = 'star-oracle-profile-prefs'

export function readProfilePrefs() {
  try {
    const raw = localStorage.getItem(LS_PROFILE)
    if (!raw) return { showLucky: true, showAvoid: true }
    return { ...JSON.parse(raw) }
  } catch {
    return { showLucky: true, showAvoid: true }
  }
}

export function persistProfilePrefs(next) {
  localStorage.setItem(LS_PROFILE, JSON.stringify(next))
}

export function clearProfilePrefs() {
  localStorage.removeItem(LS_PROFILE)
}
