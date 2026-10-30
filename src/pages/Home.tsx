import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { daysUntil, errorMessage, formatDate } from '../lib/format'
import { newSessions } from '../lib/recap'
import type { Tables } from '../lib/database.types'
import { Brand, ErrorText, Screen } from '../components/ui'

export default function Home() {
  const { session, profile, refreshProfile } = useAuth()
  const me = session!.user.id
  const [challenges, setChallenges] = useState<Tables<'challenges'>[] | null>(null)
  const [news, setNews] = useState<Record<string, number>>({})
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')

  useEffect(() => {
    Promise.all([
      supabase.from('challenges').select('*').order('end_date'),
      supabase.from('challenge_members').select('challenge_id, last_seen_at').eq('user_id', me),
    ]).then(async ([c, m]) => {
      if (c.error || m.error) setError(errorMessage(c.error ?? m.error))
      setChallenges(c.data ?? [])
      // Nouvelles séances des autres depuis ma dernière visite de chaque défi.
      const seen = m.data ?? []
      if (!seen.length) return
      const oldest = seen.map((r) => r.last_seen_at).sort()[0]
      const s = await supabase
        .from('training_sessions')
        .select('challenge_id, user_id, created_at')
        .in('challenge_id', seen.map((r) => r.challenge_id))
        .neq('user_id', me)
        .gt('created_at', oldest)
      const counts: Record<string, number> = {}
      for (const r of seen) {
        counts[r.challenge_id] = newSessions((s.data ?? []).filter((x) => x.challenge_id === r.challenge_id), me, r.last_seen_at).length
      }
      setNews(counts)
    })
  }, [me])

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
          <Link to="/historique" className="link">Historique</Link>
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
        <ChallengeList challenges={challenges.filter((c) => daysUntil(c.end_date) >= 0)} news={news} />
      )}

      <Link to="/nouveau" className="btn primary">Créer un défi</Link>

      {challenges && challenges.some((c) => daysUntil(c.end_date) < 0) && (
        <>
          <h2>Terminés</h2>
          <ChallengeList challenges={challenges.filter((c) => daysUntil(c.end_date) < 0).reverse()} news={news} />
        </>
      )}
    </Screen>
  )
}

function ChallengeList({ challenges, news }: { challenges: Tables<'challenges'>[]; news: Record<string, number> }) {
  return (
    <ul className="list">
      {challenges.map((c) => {
        const days = daysUntil(c.end_date)
        const fresh = news[c.id] ?? 0
        return (
          <li key={c.id}>
            <Link to={`/defi/${c.id}`} className="card link-card">
              <span className="row gap">
                <strong className="grow">{c.name}</strong>
                {fresh > 0 && <span className="tag">{fresh > 1 ? `${fresh} nouvelles séances` : '1 nouvelle séance'}</span>}
              </span>
              <span className="muted">
                {days > 0 ? `${days} jours restants` : days === 0 ? "C'est aujourd'hui ! Preuves et votes ouverts" : 'Terminé'} · fin le {formatDate(c.end_date)}
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
