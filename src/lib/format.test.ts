import { describe, expect, it } from 'vitest'
import { addDays, avatarColor, daysUntil, errorMessage, formatDate, formatDay, formatDuration, initial, inviteUrl, plural } from './format'

describe('daysUntil', () => {
  const now = new Date(2026, 9, 30, 18, 45) // 30 octobre 2026, en soirée

  it('compte les jours jusqu’à la date de fin', () => {
    expect(daysUntil('2027-03-01', now)).toBe(122)
  })

  it('renvoie 0 le jour J, quelle que soit l’heure', () => {
    expect(daysUntil('2026-10-30', now)).toBe(0)
  })

  it('est négatif une fois la date passée', () => {
    expect(daysUntil('2026-10-28', now)).toBe(-2)
  })

  it('traverse le changement d’heure sans se décaler', () => {
    expect(daysUntil('2026-11-02', new Date(2026, 9, 24))).toBe(9)
  })
})

describe('formatDate', () => {
  it('écrit la date en français', () => {
    expect(formatDate('2027-03-01')).toBe('1 mars 2027')
  })
})

describe('inviteUrl', () => {
  it('construit le lien d’invitation sur le site courant', () => {
    expect(inviteUrl('abc123')).toBe(`${window.location.origin}/rejoindre/abc123`)
  })
})

describe('initial', () => {
  it('prend la première lettre en majuscule', () => {
    expect(initial('  julie')).toBe('J')
  })

  it('met un point d’interrogation sans nom', () => {
    expect(initial('   ')).toBe('?')
  })
})

describe('avatarColor', () => {
  it('donne toujours la même couleur à la même personne', () => {
    expect(avatarColor('user-1')).toBe(avatarColor('user-1'))
    expect(avatarColor('user-1')).toMatch(/^#[0-9A-F]{6}$/i)
  })
})

describe('errorMessage', () => {
  it('reprend le message d’une erreur', () => {
    expect(errorMessage({ message: 'Invitation introuvable' })).toBe('Invitation introuvable')
  })

  it('a un message par défaut', () => {
    expect(errorMessage(null)).toBe('Une erreur est survenue.')
  })
})

describe('dates et durées', () => {
  it('ajoute des jours en heure locale', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDays('2026-10-26', -7)).toBe('2026-10-19')
  })

  it('écrit le jour d’une séance', () => {
    const now = new Date(2026, 9, 30, 8)
    expect(formatDay('2026-10-30', now)).toBe('aujourd’hui')
    expect(formatDay('2026-10-29', now)).toBe('hier')
    expect(formatDay('2026-10-26', now)).toBe('lun. 26 oct.')
  })

  it('écrit une durée', () => {
    expect(formatDuration(45)).toBe('45 min')
    expect(formatDuration(60)).toBe('1 h')
    expect(formatDuration(95)).toBe('1 h 35')
  })

  it('accorde au pluriel', () => {
    expect(plural(1, 'séance')).toBe('1 séance')
    expect(plural(3, 'séance')).toBe('3 séances')
  })
})
