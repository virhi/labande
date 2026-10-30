import { errorMessage } from './format'

export const MIN_PASSWORD = 8

// Renvoie le message d'erreur à afficher, ou null si le nouveau mot de passe convient.
export function checkNewPassword(password: string, confirm: string): string | null {
  if (password.length < MIN_PASSWORD) return `Le mot de passe doit faire au moins ${MIN_PASSWORD} caractères.`
  if (password !== confirm) return 'Les deux mots de passe ne sont pas identiques.'
  return null
}

// Messages Supabase les plus courants, en français.
export function authError(e: unknown): string {
  const code = e && typeof e === 'object' && 'code' in e ? String((e as { code: unknown }).code) : ''
  switch (code) {
    case 'invalid_credentials':
      return 'Email ou mot de passe incorrect.'
    case 'email_not_confirmed':
      return "Ton email n'est pas encore confirmé : clique sur le lien reçu à l'inscription."
    case 'user_already_exists':
    case 'email_exists':
      return 'Un compte existe déjà avec cet email. Connecte-toi ou utilise « Mot de passe oublié ».'
    case 'weak_password':
      return `Mot de passe trop faible : au moins ${MIN_PASSWORD} caractères.`
    case 'over_email_send_rate_limit':
      return "Trop d'emails envoyés pour le moment. Réessaie dans quelques minutes."
    default:
      return errorMessage(e)
  }
}
