import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { daysUntil, errorMessage, formatDate, plural } from '../lib/format'
import { newSessions } from '../lib/recap'
import type { Tables } from '../lib/database.types'
import { Brand, ErrorText, Screen } from '../components/ui'
import { InstallCard } from '../components/Install'

export default function Home() {
  const { session, profile } = useAuth()
  const me = session!.user.id
  const [challenges, setChallenges] = useState<Tables<'challenges'>[] | null>(null)
  const [news, setNews] = useState<Record<string, number>>({})
  const [error, setError] = useState('')

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


  return (
    <Screen nav>
      <Brand />
      <div className="stack tight-gap">
        <p className="muted">Salut {profile?.display_name ?? ''}</p>
        <h1>Tes défis</h1>
      </div>
      <InstallCard dismissible />
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

      <Link to="/nouveau" className="card new-card">
        <span aria-hidden="true">+</span> Créer un défi
      </Link>

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
                {days > 0 ? `${plural(days, 'jour')} restant${days > 1 ? 's' : ''}` : days === 0 ? "C'est aujourd'hui ! Preuves et votes ouverts" : 'Terminé'} · fin le {formatDate(c.end_date)}
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
