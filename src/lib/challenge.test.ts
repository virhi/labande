import { describe, expect, it } from 'vitest'
import { isGoalValidated, launchState } from './challenge'

const alice = { id: 'alice' }
const bob = { id: 'bob' }
const sam = { id: 'sam' }
const goalA = { id: 'gA', user_id: 'alice' }
const goalB = { id: 'gB', user_id: 'bob' }
const goalS = { id: 'gS', user_id: 'sam' }
const ok = (goal_id: string, reviewer_id: string) => ({ goal_id, reviewer_id, verdict: 'ok' })
const tooEasy = (goal_id: string, reviewer_id: string) => ({ goal_id, reviewer_id, verdict: 'too_easy' })

describe('isGoalValidated', () => {
  it('est validé quand tous les autres membres ont validé', () => {
    expect(isGoalValidated(goalA, [alice, bob, sam], [ok('gA', 'bob'), ok('gA', 'sam')])).toBe(true)
  })

  it('attend l’avis de chaque autre membre', () => {
    expect(isGoalValidated(goalA, [alice, bob, sam], [ok('gA', 'bob')])).toBe(false)
  })

  it('n’est pas validé si quelqu’un le trouve trop facile', () => {
    expect(isGoalValidated(goalA, [alice, bob, sam], [ok('gA', 'bob'), tooEasy('gA', 'sam')])).toBe(false)
  })

  it('ignore les avis donnés sur un autre objectif', () => {
    expect(isGoalValidated(goalA, [alice, bob], [ok('gB', 'bob')])).toBe(false)
  })
})

describe('launchState', () => {
  it('demande d’inviter quelqu’un quand on est seul', () => {
    const s = launchState([alice], [goalA], [])
    expect(s.ready).toBe(false)
    expect(s.message).toBe('Invite au moins un ami pour lancer le défi.')
  })

  it('compte les objectifs à écrire et à valider', () => {
    const s = launchState([alice, bob, sam], [goalA, goalB], [ok('gA', 'bob'), ok('gA', 'sam')])
    expect(s).toMatchObject({ ready: false, missing: 1, pending: 1 })
    expect(s.message).toBe('En attente : 1 objectif à écrire, 1 à valider.')
  })

  it('accorde le pluriel', () => {
    const s = launchState([alice, bob, sam], [goalA], [ok('gA', 'bob'), ok('gA', 'sam')])
    expect(s.message).toBe('En attente : 2 objectifs à écrire.')
  })

  it('lance le défi quand tout est écrit et validé', () => {
    const reviews = [ok('gA', 'bob'), ok('gA', 'sam'), ok('gB', 'alice'), ok('gB', 'sam'), ok('gS', 'alice'), ok('gS', 'bob')]
    const s = launchState([alice, bob, sam], [goalA, goalB, goalS], reviews)
    expect(s.ready).toBe(true)
    expect(s.message).toBe('Tous les objectifs sont validés : le défi est lancé !')
  })
})
