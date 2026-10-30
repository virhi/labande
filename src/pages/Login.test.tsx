import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Login from './Login'

const auth = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  resetPasswordForEmail: vi.fn(),
}))

vi.mock('../lib/supabase', () => ({ supabase: { auth } }))

beforeEach(() => {
  vi.resetAllMocks()
})

describe('Login', () => {
  it('se connecte avec l’email et le mot de passe', async () => {
    auth.signInWithPassword.mockResolvedValue({ data: {}, error: null })
    const user = userEvent.setup()
    render(<Login />)

    await user.type(screen.getByLabelText('Email'), '  julie@exemple.fr ')
    await user.type(screen.getByLabelText('Mot de passe'), 'secret123')
    await user.click(screen.getByRole('button', { name: 'Se connecter' }))

    expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: 'julie@exemple.fr', password: 'secret123' })
  })

  it('affiche une erreur en français si les identifiants sont faux', async () => {
    auth.signInWithPassword.mockResolvedValue({ data: {}, error: { code: 'invalid_credentials', message: 'Invalid login credentials' } })
    const user = userEvent.setup()
    render(<Login />)

    await user.type(screen.getByLabelText('Email'), 'julie@exemple.fr')
    await user.type(screen.getByLabelText('Mot de passe'), 'mauvais')
    await user.click(screen.getByRole('button', { name: 'Se connecter' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Email ou mot de passe incorrect.')
  })

  it('refuse l’inscription si les mots de passe diffèrent, sans appeler Supabase', async () => {
    const user = userEvent.setup()
    render(<Login />)

    await user.click(screen.getByRole('tab', { name: 'Créer un compte' }))
    await user.type(screen.getByLabelText('Prénom ou pseudo'), 'Julie')
    await user.type(screen.getByLabelText('Email'), 'julie@exemple.fr')
    await user.type(screen.getByLabelText('Mot de passe'), 'motdepasse')
    await user.type(screen.getByLabelText('Confirme le mot de passe'), 'autrechose')
    await user.click(screen.getByRole('button', { name: 'Créer mon compte' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Les deux mots de passe ne sont pas identiques.')
    expect(auth.signUp).not.toHaveBeenCalled()
  })

  it('crée le compte avec le pseudo et demande de confirmer l’email', async () => {
    auth.signUp.mockResolvedValue({ data: { session: null, user: {} }, error: null })
    const user = userEvent.setup()
    render(<Login />)

    await user.click(screen.getByRole('tab', { name: 'Créer un compte' }))
    await user.type(screen.getByLabelText('Prénom ou pseudo'), ' Julie ')
    await user.type(screen.getByLabelText('Email'), 'julie@exemple.fr')
    await user.type(screen.getByLabelText('Mot de passe'), 'motdepasse')
    await user.type(screen.getByLabelText('Confirme le mot de passe'), 'motdepasse')
    await user.click(screen.getByRole('button', { name: 'Créer mon compte' }))

    expect(auth.signUp).toHaveBeenCalledWith({
      email: 'julie@exemple.fr',
      password: 'motdepasse',
      options: { data: { display_name: 'Julie' }, emailRedirectTo: window.location.origin },
    })
    expect(await screen.findByText('Regarde tes emails')).toBeInTheDocument()
  })

  it('envoie le lien de mot de passe oublié', async () => {
    auth.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null })
    const user = userEvent.setup()
    render(<Login />)

    await user.click(screen.getByRole('button', { name: 'Mot de passe oublié ?' }))
    await user.type(screen.getByLabelText('Email'), 'julie@exemple.fr')
    await user.click(screen.getByRole('button', { name: 'Recevoir le lien' }))

    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith('julie@exemple.fr', { redirectTo: window.location.origin })
    expect(await screen.findByText(/tu vas recevoir un lien pour choisir un nouveau mot de passe/)).toBeInTheDocument()
  })

  it('montre le message d’invitation quand on arrive par un lien', () => {
    render(<Login intro="Un ami t’invite à un défi. Connecte-toi pour le rejoindre." />)
    expect(screen.getByText('Un ami t’invite à un défi. Connecte-toi pour le rejoindre.')).toBeInTheDocument()
  })
})
