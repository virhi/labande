import { addDays, isoDate } from './format'

type Session = { user_id: string; done_on: string }
type Member = { id: string }

// Lundi de la semaine d'une date 'AAAA-MM-JJ'.
export function weekStart(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return addDays(iso, -((date.getDay() + 6) % 7))
}

export function weekDays(start: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

export type MemberWeek = { id: string; count: number; days: boolean[] }

// Séances de chaque membre sur une semaine : total et jours actifs (lundi → dimanche).
export function weekRecap(members: Member[], sessions: Session[], start: string): MemberWeek[] {
  const days = weekDays(start)
  return members.map((m) => {
    const mine = sessions.filter((s) => s.user_id === m.id && days.includes(s.done_on))
    return { id: m.id, count: mine.length, days: days.map((d) => mine.some((s) => s.done_on === d)) }
  })
}

export type PastWeek = { start: string; counts: Record<string, number> }

// Semaines écoulées avant la semaine en cours, de la plus récente à la plus ancienne.
export function pastWeeks(sessions: Session[], from: string, today: string = isoDate()): PastWeek[] {
  const current = weekStart(today)
  const weeks: PastWeek[] = []
  for (let start = addDays(current, -7); start >= weekStart(from); start = addDays(start, -7)) {
    const end = addDays(start, 6)
    const counts: Record<string, number> = {}
    for (const s of sessions) {
      if (s.done_on >= start && s.done_on <= end) counts[s.user_id] = (counts[s.user_id] ?? 0) + 1
    }
    weeks.push({ start, counts })
  }
  return weeks
}

// Séances des autres ajoutées depuis la dernière visite.
export function newSessions<T extends { user_id: string; created_at: string }>(sessions: T[], me: string, since: string): T[] {
  return sessions.filter((s) => s.user_id !== me && s.created_at > since)
}
