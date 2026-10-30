import { describe, expect, it } from 'vitest'
import { authError, checkNewPassword, guessableWord } from './password'

describe('checkNewPassword', () => {
  it('accepte un mot de passe robuste et confirmé', () => {
    expect(checkNewPassword('Sprint2026Fort', 'Sprint2026Fort')).toBeNull()
  })

  it('liste ce qui manque à un mot de passe faible', () => {
    expect(checkNewPassword('court', 'court')).toBe('Mot de passe trop faible : au moins 10 caractères, une majuscule, un chiffre.')
    expect(checkNewPassword('SPRINT2026FORT', 'SPRINT2026FORT')).toBe('Mot de passe trop faible : une minuscule.')
  })

  it('refuse un mot courant, son pseudo ou le début de son email', () => {
    expect(checkNewPassword('Motdepasse123', 'Motdepasse123')).toBe('Mot de passe trop facile à deviner : évite « motdepasse ».')
    expect(checkNewPassword('Julie2026Run', 'Julie2026Run', ['Julie', 'j.martin@exemple.fr'])).toBe('Mot de passe trop facile à deviner : évite « julie ».')
    expect(guessableWord('Xj.martin99Ab', ['', 'j.martin@exemple.fr'])).toBe('j.martin')
    expect(guessableWord('Sprint2026Fort', ['Al'])).toBeNull()
  })

  it('refuse deux mots de passe différents', () => {
    expect(checkNewPassword('Sprint2026Fort', 'Sprint2026Faux')).toBe('Les deux mots de passe ne sont pas identiques.')
  })
})
describe('authError', () => {
  it.each([
    ['invalid_credentials', 'Email ou mot de passe incorrect.'],
    ['email_not_confirmed', "Ton email n'est pas encore confirmé : clique sur le lien reçu à l'inscription."],
    ['user_already_exists', 'Un compte existe déjà avec cet email. Connecte-toi ou utilise « Mot de passe oublié ».'],
    ['email_exists', 'Un compte existe déjà avec cet email. Connecte-toi ou utilise « Mot de passe oublié ».'],
    ['over_email_send_rate_limit', "Trop d'emails envoyés pour le moment. Réessaie dans quelques minutes."],
  ])('traduit le code %s', (code, message) => {
    expect(authError({ code, message: 'anglais' })).toBe(message)
  })

  it('garde le message d’origine pour un code inconnu', () => {
    expect(authError({ code: 'autre', message: 'Something failed' })).toBe('Something failed')
  })
})
