import { describe, expect, it } from 'vitest'
import { newSessions, pastWeeks, weekDays, weekRecap, weekStart } from './recap'

describe('weekStart', () => {
  it('ramène au lundi', () => {
    expect(weekStart('2026-10-30')).toBe('2026-10-26') // vendredi
    expect(weekStart('2026-10-26')).toBe('2026-10-26') // lundi
    expect(weekStart('2026-11-01')).toBe('2026-10-26') // dimanche
  })

  it('traverse un changement de mois et d’heure', () => {
    expect(weekStart('2026-10-25')).toBe('2026-10-19')
    expect(weekStart('2026-11-03')).toBe('2026-11-02')
  })
})

describe('weekDays', () => {
  it('liste les 7 jours du lundi au dimanche', () => {
    expect(weekDays('2026-10-26')).toEqual([
      '2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01',
    ])
  })
})

const members = [{ id: 'a' }, { id: 'b' }]

describe('weekRecap', () => {
  it('compte les séances de la semaine et les jours actifs de chacun', () => {
    const sessions = [
      { user_id: 'a', done_on: '2026-10-26' },
      { user_id: 'a', done_on: '2026-10-26' },
      { user_id: 'a', done_on: '2026-10-30' },
      { user_id: 'a', done_on: '2026-10-25' }, // semaine précédente
      { user_id: 'b', done_on: '2026-11-01' },
    ]
    expect(weekRecap(members, sessions, '2026-10-26')).toEqual([
      { id: 'a', count: 3, days: [true, false, false, false, true, false, false] },
      { id: 'b', count: 1, days: [false, false, false, false, false, false, true] },
    ])
  })
})

describe('pastWeeks', () => {
  it('liste les semaines écoulées depuis le début du défi, la plus récente d’abord', () => {
    const sessions = [
      { user_id: 'a', done_on: '2026-10-14' },
      { user_id: 'b', done_on: '2026-10-20' },
      { user_id: 'b', done_on: '2026-10-25' },
      { user_id: 'a', done_on: '2026-10-28' }, // semaine en cours : exclue
    ]
    expect(pastWeeks(sessions, '2026-10-13', '2026-10-30')).toEqual([
      { start: '2026-10-19', counts: { b: 2 } },
      { start: '2026-10-12', counts: { a: 1 } },
    ])
  })

  it('est vide pendant la première semaine', () => {
    expect(pastWeeks([], '2026-10-27', '2026-10-30')).toEqual([])
  })
})

describe('newSessions', () => {
  it('garde les séances des autres ajoutées après la dernière visite', () => {
    const sessions = [
      { id: '1', user_id: 'b', created_at: '2026-10-30T10:00:00Z' },
      { id: '2', user_id: 'b', created_at: '2026-10-29T10:00:00Z' },
      { id: '3', user_id: 'a', created_at: '2026-10-30T11:00:00Z' },
    ]
    expect(newSessions(sessions, 'a', '2026-10-30T00:00:00Z').map((s) => s.id)).toEqual(['1'])
  })
})
