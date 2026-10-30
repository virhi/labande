import { describe, expect, it } from 'vitest'
import { canTrack, formatQuantity, goalProgress, parseQuantity } from './progress'

const goal = { user_id: 'a', target_value: '100', unit: 'km', track_progress: true }

describe('parseQuantity', () => {
  it('lit les nombres à la française ou non', () => {
    expect(parseQuantity('12,5')).toBe(12.5)
    expect(parseQuantity(' 100 ')).toBe(100)
    expect(parseQuantity('8.2')).toBe(8.2)
  })

  it('refuse ce qui n’est pas un nombre', () => {
    expect(parseQuantity('1h50')).toBeNull()
    expect(parseQuantity('')).toBeNull()
    expect(parseQuantity(null)).toBeNull()
  })
})

describe('canTrack', () => {
  it('demande une cible chiffrée et une unité', () => {
    expect(canTrack('100', 'km')).toBe(true)
    expect(canTrack('100', '')).toBe(false)
    expect(canTrack('1h50', 'temps')).toBe(false)
    expect(canTrack('0', 'km')).toBe(false)
  })
})

describe('goalProgress', () => {
  it('additionne les quantités du membre seulement', () => {
    const sessions = [
      { user_id: 'a', value: 8 },
      { user_id: 'a', value: 12.5 },
      { user_id: 'a', value: null },
      { user_id: 'b', value: 50 },
    ]
    expect(goalProgress(goal, sessions)).toEqual({ done: 20.5, target: 100, unit: 'km', ratio: 0.205 })
  })

  it('plafonne la barre à 100 % quand la cible est dépassée', () => {
    expect(goalProgress(goal, [{ user_id: 'a', value: 120 }])?.ratio).toBe(1)
  })

  it('ne suit rien si l’objectif n’additionne pas les séances', () => {
    expect(goalProgress({ ...goal, track_progress: false }, [])).toBeNull()
    expect(goalProgress(undefined, [])).toBeNull()
  })
})

describe('formatQuantity', () => {
  it('écrit les décimales à la française', () => {
    expect(formatQuantity(20.5)).toBe('20,5')
    expect(formatQuantity(42)).toBe('42')
  })
})
