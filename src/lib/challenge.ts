import type { Tables } from './database.types'

type Goal = Pick<Tables<'goals'>, 'id' | 'user_id'>
type Review = Pick<Tables<'goal_reviews'>, 'goal_id' | 'reviewer_id' | 'verdict'>
type Member = { id: string }

// Un objectif est validé quand tous les autres membres ont répondu « Valider ».
export function isGoalValidated(goal: Goal, members: Member[], reviews: Review[]): boolean {
  return members
    .filter((m) => m.id !== goal.user_id)
    .every((m) => reviews.some((r) => r.goal_id === goal.id && r.reviewer_id === m.id && r.verdict === 'ok'))
}

export type LaunchState = { ready: boolean; missing: number; pending: number; message: string }

// Le défi est lancé quand chacun a écrit son objectif et que tous les objectifs sont validés.
export function launchState(members: Member[], goals: Goal[], reviews: Review[]): LaunchState {
  const missing = members.filter((m) => !goals.some((g) => g.user_id === m.id)).length
  const pending = goals.filter((g) => !isGoalValidated(g, members, reviews)).length
  const ready = members.length > 1 && missing === 0 && pending === 0

  let message: string
  if (ready) message = 'Tous les objectifs sont validés : le défi est lancé !'
  else if (members.length < 2) message = 'Invite au moins un ami pour lancer le défi.'
  else {
    const parts = []
    if (missing) parts.push(`${missing} objectif${missing > 1 ? 's' : ''} à écrire`)
    if (pending) parts.push(`${pending} à valider`)
    message = `En attente : ${parts.join(', ')}.`
  }
  return { ready, missing, pending, message }
}

type Vote = Pick<Tables<'votes'>, 'voter_id' | 'target_id' | 'verdict'>

export type Outcome = { status: 'success' | 'fail' | 'pending'; success: number; fail: number; expected: number }

// Résultat d'un membre : la majorité des autres membres décide.
// Quand tout le monde a voté et qu'il y a égalité, le doute profite au sportif.
export function voteOutcome(targetId: string, members: Member[], votes: Vote[]): Outcome {
  const expected = members.filter((m) => m.id !== targetId).length
  const mine = votes.filter((v) => v.target_id === targetId && v.voter_id !== targetId)
  const success = mine.filter((v) => v.verdict === 'success').length
  const fail = mine.filter((v) => v.verdict === 'fail').length
  let status: Outcome['status'] = 'pending'
  if (expected > 0) {
    if (success > expected / 2) status = 'success'
    else if (fail > expected / 2) status = 'fail'
    else if (success + fail >= expected) status = success >= fail ? 'success' : 'fail'
  }
  return { status, success, fail, expected }
}
