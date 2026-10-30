// Date du jour pour l'appli. En mode test, Playwright peut la fixer (clé 'labande.now')
// pour arriver au jour J d'un défi sans toucher à l'horloge réelle des sessions.
export function today(): Date {
  if (import.meta.env.MODE === 'test') {
    const fake = window.localStorage.getItem('labande.now')
    if (fake) return new Date(fake)
  }
  return new Date()
}

// Nombre de jours entre aujourd'hui et une date 'AAAA-MM-JJ' (négatif si passée).
export function daysUntil(isoDate: string, now: Date = today()): number {
  const [y, m, d] = isoDate.split('-').map(Number)
  const end = new Date(y, m - 1, d)
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  return Math.round((end.getTime() - today.getTime()) / 86_400_000)
}

// Date 'AAAA-MM-JJ' en heure locale.
export function isoDate(d: Date = today()): string {
  return d.toLocaleDateString('sv-SE')
}

export function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  return isoDate(new Date(y, m - 1, d + n))
}

// « aujourd'hui », « hier », sinon « lun. 27 oct. ».
export function formatDay(iso: string, now: Date = today()): string {
  const diff = daysUntil(iso, now)
  if (diff === 0) return 'aujourd’hui'
  if (diff === -1) return 'hier'
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${h} h ${String(rest).padStart(2, '0')}` : `${h} h`
}

export function plural(n: number, word: string): string {
  return `${n} ${word}${n > 1 ? 's' : ''}`
}

export function formatDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function inviteUrl(code: string): string {
  return `${window.location.origin}/rejoindre/${code}`
}

export function initial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?'
}

const AVATAR_COLORS = ['#C2410C', '#1D4ED8', '#0F766E', '#6D28D9', '#B45309', '#BE185D']

export function avatarColor(id: string): string {
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

export const CHALLENGE_NOT_FOUND = "Ce défi n'existe plus, ou tu n'en fais pas partie."

export function errorMessage(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message)
  return 'Une erreur est survenue.'
}
