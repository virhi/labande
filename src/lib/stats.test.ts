import { describe, expect, it } from 'vitest'
import { sessionStats } from './stats'

const s = (done_on: string, duration_min: number | null = null) => ({ done_on, duration_min })

describe('sessionStats', () => {
  it('est à zéro sans séance', () => {
    expect(sessionStats([], '2026-10-30')).toEqual({ total: 0, minutes: 0, perWeek: 0, streak: 0 })
  })

  it('additionne les séances et le temps', () => {
    const r = sessionStats([s('2026-10-27', 45), s('2026-10-29', 30), s('2026-10-30')], '2026-10-30')
    expect(r.total).toBe(3)
    expect(r.minutes).toBe(75)
  })

  it('fait la moyenne par semaine depuis la première séance', () => {
    // 3 semaines (12, 19 et 26 octobre), 4 séances
    const r = sessionStats([s('2026-10-12'), s('2026-10-13'), s('2026-10-20'), s('2026-10-27')], '2026-10-30')
    expect(r.perWeek).toBe(1.3)
  })

  it('compte la série de semaines consécutives', () => {
    const r = sessionStats([s('2026-09-30'), s('2026-10-14'), s('2026-10-21'), s('2026-10-28')], '2026-10-30')
    expect(r.streak).toBe(3) // la semaine du 28 septembre est séparée par un trou
  })

  it('ne casse pas la série tant que la semaine en cours n’est pas finie', () => {
    const r = sessionStats([s('2026-10-14'), s('2026-10-21')], '2026-10-27')
    expect(r.streak).toBe(2)
  })
})
