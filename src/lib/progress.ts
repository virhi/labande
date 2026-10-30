import type { Tables } from './database.types'

type Goal = Pick<Tables<'goals'>, 'user_id' | 'target_value' | 'unit' | 'track_progress'>
type Session = Pick<Tables<'training_sessions'>, 'user_id' | 'value'>

// Nombre saisi à la française ou non : « 12,5 », « 12.5 », « 100 ». null si ce n'est pas un nombre.
export function parseQuantity(input: string | null | undefined): number | null {
  const text = (input ?? '').trim()
  if (!/^[0-9]+([.,][0-9]+)?$/.test(text)) return null
  return Number(text.replace(',', '.'))
}

// Un objectif peut additionner les séances s'il a une cible chiffrée (« 100 ») et une unité (« km »).
export function canTrack(target: string | null | undefined, unit: string | null | undefined): boolean {
  const n = parseQuantity(target)
  return n !== null && n > 0 && Boolean(unit?.trim())
}

export function formatQuantity(n: number): string {
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 1 })
}

export type Progress = { done: number; target: number; unit: string; ratio: number }

// Où en est le membre : somme des quantités de ses séances face à sa cible.
export function goalProgress(goal: Goal | undefined, sessions: Session[]): Progress | null {
  if (!goal?.track_progress || !canTrack(goal.target_value, goal.unit)) return null
  const target = parseQuantity(goal.target_value)!
  const done = sessions.filter((s) => s.user_id === goal.user_id).reduce((sum, s) => sum + (s.value ?? 0), 0)
  return { done, target, unit: goal.unit!.trim(), ratio: Math.min(1, done / target) }
}
