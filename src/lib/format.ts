// Nombre de jours entre aujourd'hui et une date 'AAAA-MM-JJ' (négatif si passée).
export function daysUntil(isoDate: string): number {
  const [y, m, d] = isoDate.split('-').map(Number)
  const end = new Date(y, m - 1, d)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((end.getTime() - today.getTime()) / 86_400_000)
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

export function errorMessage(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message)
  return 'Une erreur est survenue.'
}
