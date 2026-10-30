import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { daysUntil, errorMessage, formatDate } from '../lib/format'
import type { Tables } from '../lib/database.types'
import { Brand, ErrorText, Screen } from '../components/ui'

export default function Home() {
  const { profile, refreshProfile } = useAuth()
  const [challenges, setChallenges] = useState<Tables<'challenges'>[] | null>(null)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')

  useEffect(() => {
    supabase
      .from('challenges')
      .select('*')
      .order('end_date')
      .then(({ data, error }) => {
        if (error) setError(errorMessage(error))
        setChallenges(data ?? [])
      })
  }, [])

  async function saveName(e: FormEvent) {
    e.preventDefault()
    if (!profile) return
    const { error } = await supabase.from('profiles').update({ display_name: name.trim() }).eq('id', profile.id)
    if (error) return setError(errorMessage(error))
    await refreshProfile()
    setEditing(false)
  }

  return (
    <Screen>
      <div className="row between">
        <Brand />
        <div className="row gap">
          <Link to="/mot-de-passe" className="link">Mot de passe</Link>
          <button type="button" className="link" onClick={() => supabase.auth.signOut()}>
            Se déconnecter
          </button>
        </div>
      </div>

      {editing ? (
        <form className="card stack" onSubmit={saveName}>
          <div className="field">
            <label htmlFor="pseudo">Ton prénom ou pseudo</label>
            <input id="pseudo" required maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="row gap">
            <button type="submit" className="btn primary">Enregistrer</button>
            <button type="button" className="btn ghost" onClick={() => setEditing(false)}>Annuler</button>
          </div>
        </form>
      ) : (
        <p className="muted">
          Tu apparais comme <strong>{profile?.display_name}</strong> ·{' '}
          <button type="button" className="link" onClick={() => { setName(profile?.display_name ?? ''); setEditing(true) }}>
            modifier
          </button>
        </p>
      )}

      <h1>Tes défis</h1>
      <ErrorText>{error}</ErrorText>

      {challenges === null ? (
        <p className="muted">Chargement…</p>
      ) : challenges.length === 0 ? (
        <div className="card">
          <p>Aucun défi pour l'instant. Lance le premier et invite ta bande.</p>
        </div>
      ) : (
        <ul className="list">
          {challenges.map((c) => {
            const days = daysUntil(c.end_date)
            return (
              <li key={c.id}>
                <Link to={`/defi/${c.id}`} className="card link-card">
                  <strong>{c.name}</strong>
                  <span className="muted">
                    {days > 0 ? `${days} jours restants` : days === 0 ? "C'est aujourd'hui !" : 'Terminé'} · fin le {formatDate(c.end_date)}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      <Link to="/nouveau" className="btn primary">Créer un défi</Link>
    </Screen>
  )
}
