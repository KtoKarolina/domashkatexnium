const SIGNS = [
  { name: 'Овен',      nameEn: 'Aries',       from: [3, 21], to: [4, 19] },
  { name: 'Телец',     nameEn: 'Taurus',      from: [4, 20], to: [5, 20] },
  { name: 'Близнецы',  nameEn: 'Gemini',      from: [5, 21], to: [6, 20] },
  { name: 'Рак',       nameEn: 'Cancer',      from: [6, 21], to: [7, 22] },
  { name: 'Лев',       nameEn: 'Leo',         from: [7, 23], to: [8, 22] },
  { name: 'Дева',      nameEn: 'Virgo',       from: [8, 23], to: [9, 22] },
  { name: 'Весы',      nameEn: 'Libra',       from: [9, 23], to: [10, 22] },
  { name: 'Скорпион',  nameEn: 'Scorpio',     from: [10, 23], to: [11, 21] },
  { name: 'Стрелец',   nameEn: 'Sagittarius', from: [11, 22], to: [12, 21] },
  { name: 'Козерог',   nameEn: 'Capricorn',   from: [12, 22], to: [1, 19] },
  { name: 'Водолей',   nameEn: 'Aquarius',    from: [1, 20], to: [2, 18] },
  { name: 'Рыбы',      nameEn: 'Pisces',      from: [2, 19], to: [3, 20] },
]

export function getZodiacSign(birthDateStr) {
  const d = new Date(birthDateStr + 'T12:00:00')
  if (Number.isNaN(d.getTime())) return null

  const m = d.getMonth() + 1
  const day = d.getDate()

  for (const sign of SIGNS) {
    const [sm, sd] = sign.from
    const [em, ed] = sign.to
    if (sm <= em) {
      if ((m === sm && day >= sd) || (m === em && day <= ed) || (m > sm && m < em)) return sign
    } else {
      if ((m === sm && day >= sd) || (m === em && day <= ed) || m > sm || m < em) return sign
    }
  }
  return SIGNS[9]
}
