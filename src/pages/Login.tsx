import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { MIN_PASSWORD, authError, checkNewPassword } from '../lib/password'
import { Brand, ErrorText, Screen } from '../components/ui'

type Mode = 'login' | 'signup' | 'forgot'

export default function Login({ intro }: { intro?: string }) {
  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sentTo, setSentTo] = useState<{ kind: 'signup' | 'forgot'; email: string } | null>(null)

  function switchTo(next: Mode) {
    setMode(next)
    setError('')
    setPassword('')
    setConfirm('')
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    const cleanEmail = email.trim()

    if (mode === 'signup') {
      const invalid = checkNewPassword(password, confirm)
      if (invalid) return setError(invalid)
    }

    setBusy(true)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password })
        if (error) throw error
      } else if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: { data: { display_name: name.trim() }, emailRedirectTo: window.location.origin },
        })
        if (error) throw error
        // Sans session, Supabase attend la confirmation de l'email.
        if (!data.session) setSentTo({ kind: 'signup', email: cleanEmail })
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, { redirectTo: window.location.origin })
        if (error) throw error
        setSentTo({ kind: 'forgot', email: cleanEmail })
      }
    } catch (err) {
      setError(authError(err))
    } finally {
      setBusy(false)
    }
  }

  if (sentTo) {
    return (
      <Screen>
        <Brand />
        <div className="card stack">
          <h2>Regarde tes emails</h2>
          {sentTo.kind === 'signup' ? (
            <p>
              On a envoyé un lien à <strong>{sentTo.email}</strong> pour confirmer ton adresse. Clique dessus, puis reviens te connecter.
            </p>
          ) : (
            <p>
              Si un compte existe pour <strong>{sentTo.email}</strong>, tu vas recevoir un lien pour choisir un nouveau mot de passe.
            </p>
          )}
          <button type="button" className="btn outline" onClick={() => { setSentTo(null); switchTo('login') }}>
            Retour à la connexion
          </button>
        </div>
      </Screen>
    )
  }

  return (
    <Screen>
      <Brand />
      <h1>Des défis entre amis, une date commune.</h1>
      <p className="lead">{intro ?? 'Chacun son objectif, tout le monde au rendez-vous le jour J.'}</p>

      {mode !== 'forgot' && (
        <div className="tabs" role="tablist" aria-label="Connexion ou inscription">
          <button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'tab on' : 'tab'} onClick={() => switchTo('login')}>
            Se connecter
          </button>
          <button type="button" role="tab" aria-selected={mode === 'signup'} className={mode === 'signup' ? 'tab on' : 'tab'} onClick={() => switchTo('signup')}>
            Créer un compte
          </button>
        </div>
      )}

      {mode === 'forgot' && (
        <div className="stack tight">
          <h2>Mot de passe oublié</h2>
          <p className="muted">Entre ton email : on t'envoie un lien pour en choisir un nouveau.</p>
        </div>
      )}

      <form className="stack" onSubmit={submit}>
        {mode === 'signup' && (
          <div className="field">
            <label htmlFor="pseudo">Prénom ou pseudo</label>
            <input id="pseudo" required maxLength={40} autoComplete="nickname" value={name} onChange={(e) => setName(e.target.value)} placeholder="Julie" />
          </div>
        )}
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="toi@exemple.fr" />
        </div>
        {mode !== 'forgot' && (
          <div className="field">
            <label htmlFor="password">Mot de passe</label>
            <input
              id="password"
              type="password"
              required
              minLength={mode === 'signup' ? MIN_PASSWORD : undefined}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {mode === 'signup' && <span className="hint">Au moins {MIN_PASSWORD} caractères.</span>}
          </div>
        )}
        {mode === 'signup' && (
          <div className="field">
            <label htmlFor="confirm">Confirme le mot de passe</label>
            <input id="confirm" type="password" required autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
        )}

        <ErrorText>{error}</ErrorText>

        <button type="submit" className="btn primary" disabled={busy}>
          {busy ? 'Un instant…' : mode === 'login' ? 'Se connecter' : mode === 'signup' ? 'Créer mon compte' : 'Recevoir le lien'}
        </button>

        {mode === 'login' && (
          <button type="button" className="link center" onClick={() => switchTo('forgot')}>
            Mot de passe oublié ?
          </button>
        )}
        {mode === 'forgot' && (
          <button type="button" className="link center" onClick={() => switchTo('login')}>
            Retour à la connexion
          </button>
        )}
      </form>
    </Screen>
  )
}
