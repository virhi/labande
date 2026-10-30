import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { errorMessage } from '../lib/format'
import { MIN_PASSWORD, checkNewPassword } from '../lib/password'
import { BackLink, Brand, ErrorText, Screen } from '../components/ui'

// Sert après le lien « Mot de passe oublié » et depuis l'accueil pour changer son mot de passe.
export default function NewPassword() {
  const { recovering, endRecovery } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    const invalid = checkNewPassword(password, confirm)
    if (invalid) return setError(invalid)
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) return setError(errorMessage(error))
    setDone(true)
  }

  function finish() {
    endRecovery()
    navigate('/', { replace: true })
  }

  return (
    <Screen>
      {recovering ? <Brand /> : <BackLink to="/" />}
      <h1>{recovering ? 'Nouveau mot de passe' : 'Changer de mot de passe'}</h1>

      {done ? (
        <div className="card stack">
          <p>Ton mot de passe est enregistré.</p>
          <button type="button" className="btn primary" onClick={finish}>Continuer</button>
        </div>
      ) : (
        <form className="stack" onSubmit={submit}>
          <div className="field">
            <label htmlFor="password">Nouveau mot de passe</label>
            <input id="password" type="password" required minLength={MIN_PASSWORD} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <span className="hint">Au moins {MIN_PASSWORD} caractères.</span>
          </div>
          <div className="field">
            <label htmlFor="confirm">Confirme le mot de passe</label>
            <input id="confirm" type="password" required autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          <ErrorText>{error}</ErrorText>
          <button type="submit" className="btn primary" disabled={busy}>
            {busy ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </form>
      )}
    </Screen>
  )
}
