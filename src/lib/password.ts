import { errorMessage } from './format'

export const MIN_PASSWORD = 10

// Mêmes exigences que Supabase (Authentication › Sign In / Providers › Email) :
// longueur minimale, minuscule, majuscule et chiffre (lettres sans accent, comme le serveur).
export const PASSWORD_RULES = [
  { id: 'length', label: `Au moins ${MIN_PASSWORD} caractères`, test: (p: string) => p.length >= MIN_PASSWORD },
  { id: 'lower', label: 'Une minuscule', test: (p: string) => /[a-z]/.test(p) },
  { id: 'upper', label: 'Une majuscule', test: (p: string) => /[A-Z]/.test(p) },
  { id: 'digit', label: 'Un chiffre', test: (p: string) => /[0-9]/.test(p) },
]

// Mots que les attaquants essaient en premier.
const COMMON = ['password', 'motdepasse', 'azerty', 'qwerty', '123456', 'labande', 'soleil', 'bonjour']

// Le mot de passe ne doit reprendre ni un mot courant, ni son pseudo, ni le début de son email.
export function guessableWord(password: string, personal: string[] = []): string | null {
  const p = password.toLowerCase()
  const words = [...COMMON, ...personal.map((w) => w.trim().toLowerCase().split('@')[0])].filter((w) => w.length >= 3)
  return words.find((w) => p.includes(w)) ?? null
}

// Renvoie le message d'erreur à afficher, ou null si le nouveau mot de passe convient.
export function checkNewPassword(password: string, confirm: string, personal: string[] = []): string | null {
  const missing = PASSWORD_RULES.filter((r) => !r.test(password))
  if (missing.length) return `Mot de passe trop faible : ${missing.map((r) => r.label.toLowerCase()).join(', ')}.`
  const word = guessableWord(password, personal)
  if (word) return `Mot de passe trop facile à deviner : évite « ${word} ».`
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
      return `Mot de passe trop faible : au moins ${MIN_PASSWORD} caractères, avec une minuscule, une majuscule et un chiffre.`
    case 'over_email_send_rate_limit':
      return "Trop d'emails envoyés pour le moment. Réessaie dans quelques minutes."
    default:
      return errorMessage(e)
  }
}
