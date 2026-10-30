import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { errorMessage } from '../lib/format'
import { Brand, ErrorText, Screen } from '../components/ui'

export default function Login({ intro }: { intro?: string }) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    })
    setBusy(false)
    if (error) setError(errorMessage(error))
    else setSent(true)
  }

  return (
    <Screen>
      <Brand />
      <h1>Des défis entre amis, une date commune.</h1>
      <p className="lead">{intro ?? 'Chacun son objectif, tout le monde au rendez-vous le jour J.'}</p>

      {sent ? (
        <div className="card">
          <h2>Regarde tes emails</h2>
          <p>
            On a envoyé un lien de connexion à <strong>{email}</strong>. Ouvre-le sur cet appareil pour continuer.
          </p>
          <button type="button" className="btn ghost" onClick={() => setSent(false)}>
            Changer d'adresse
          </button>
        </div>
      ) : (
        <form className="stack" onSubmit={submit}>
          <div className="field">
            <label htmlFor="email">Ton email</label>
            <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="toi@exemple.fr" />
          </div>
          <ErrorText>{error}</ErrorText>
          <button type="submit" className="btn primary" disabled={busy}>
            {busy ? 'Envoi…' : 'Recevoir un lien de connexion'}
          </button>
          <p className="hint">Pas de mot de passe : tu reçois un lien par email.</p>
        </form>
      )}
    </Screen>
  )
}
