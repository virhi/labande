import { addDays, isoDate } from './format'
import { weekStart } from './recap'

type Session = { done_on: string; duration_min: number | null }

export type SessionStats = { total: number; minutes: number; perWeek: number; streak: number }

// Total, temps cumulé, moyenne par semaine depuis la première séance,
// et série de semaines consécutives avec au moins une séance.
export function sessionStats(sessions: Session[], today: string = isoDate()): SessionStats {
  const total = sessions.length
  const minutes = sessions.reduce((sum, s) => sum + (s.duration_min ?? 0), 0)
  if (!total) return { total, minutes, perWeek: 0, streak: 0 }

  const weeks = new Set(sessions.map((s) => weekStart(s.done_on)))
  const first = [...weeks].sort()[0]
  const current = weekStart(today)
  const span = Math.round((Date.parse(current) - Date.parse(first)) / (7 * 86_400_000)) + 1
  const perWeek = Math.round((total / span) * 10) / 10

  // La semaine en cours ne casse pas la série tant qu'elle n'est pas finie.
  let week = weeks.has(current) ? current : addDays(current, -7)
  let streak = 0
  while (weeks.has(week)) {
    streak++
    week = addDays(week, -7)
  }
  return { total, minutes, perWeek, streak }
}
