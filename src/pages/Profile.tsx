import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { errorMessage } from '../lib/format'
import { Avatar, ErrorText, Screen } from '../components/ui'

const Chevron = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 6l6 6-6 6" />
  </svg>
)

export default function Profile() {
  const { session, profile, refreshProfile } = useAuth()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function saveName(e: FormEvent) {
    e.preventDefault()
    if (!profile) return
    setBusy(true)
    setError('')
    const { error } = await supabase.from('profiles').update({ display_name: name.trim() }).eq('id', profile.id)
    setBusy(false)
    if (error) return setError(errorMessage(error))
    await refreshProfile()
    setEditing(false)
  }

  return (
    <Screen nav>
      <h1>Profil</h1>

      <div className="profile-head">
        <Avatar id={session!.user.id} name={profile?.display_name ?? '?'} size={72} />
        <strong className="profile-name">{profile?.display_name}</strong>
        <span className="muted">{session!.user.email}</span>
      </div>

      {editing ? (
        <form className="card stack" onSubmit={saveName}>
          <div className="field">
            <label htmlFor="pseudo">Ton prénom ou pseudo</label>
            <input id="pseudo" required maxLength={40} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <ErrorText>{error}</ErrorText>
          <div className="row gap">
            <button type="submit" className="btn primary grow" disabled={busy}>{busy ? 'Enregistrement…' : 'Enregistrer'}</button>
            <button type="button" className="btn ghost" onClick={() => setEditing(false)}>Annuler</button>
          </div>
        </form>
      ) : (
        <ul className="rows card menu">
          <li>
            <button type="button" className="menu-item" onClick={() => { setName(profile?.display_name ?? ''); setEditing(true) }}>
              <span className="grow">Changer mon pseudo</span>
              <Chevron />
            </button>
          </li>
          <li>
            <Link to="/mot-de-passe" className="menu-item">
              <span className="grow">Mot de passe</span>
              <Chevron />
            </Link>
          </li>
        </ul>
      )}

      <ul className="rows card menu">
        <li>
          <button type="button" className="menu-item danger" onClick={() => supabase.auth.signOut()}>
            Se déconnecter
          </button>
        </li>
      </ul>
    </Screen>
  )
}
