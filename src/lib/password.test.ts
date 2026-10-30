import { describe, expect, it } from 'vitest'
import { authError, checkNewPassword } from './password'

describe('checkNewPassword', () => {
  it('accepte un mot de passe assez long et confirmé', () => {
    expect(checkNewPassword('motdepasse', 'motdepasse')).toBeNull()
  })

  it('refuse un mot de passe trop court', () => {
    expect(checkNewPassword('court', 'court')).toBe('Le mot de passe doit faire au moins 8 caractères.')
  })

  it('refuse deux mots de passe différents', () => {
    expect(checkNewPassword('motdepasse', 'motdepasso')).toBe('Les deux mots de passe ne sont pas identiques.')
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
