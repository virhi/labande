import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { daysUntil, errorMessage, formatDate, formatDuration, plural } from '../lib/format'
import { voteOutcome, type Outcome } from '../lib/challenge'
import { sessionStats } from '../lib/stats'
import type { Tables } from '../lib/database.types'
import { BackLink, ErrorText, Screen } from '../components/ui'
import { OutcomeBadge } from '../components/Finale'

type Past = { challenge: Tables<'challenges'>; outcome: Outcome; sessions: number }
type Data = { sessions: Pick<Tables<'training_sessions'>, 'challenge_id' | 'done_on' | 'duration_min'>[]; past: Past[] }

async function load(me: string): Promise<Data> {
  const [c, m, s, v] = await Promise.all([
    supabase.from('challenges').select('*').order('end_date', { ascending: false }),
    supabase.from('challenge_members').select('challenge_id, user_id'),
    supabase.from('training_sessions').select('challenge_id, done_on, duration_min').eq('user_id', me),
    supabase.from('votes').select('voter_id, target_id, verdict, challenge_id').eq('target_id', me),
  ])
  for (const res of [c, m, s, v]) if (res.error) throw res.error
  const sessions = s.data ?? []
  const past = (c.data ?? [])
    .filter((ch) => daysUntil(ch.end_date) <= 0)
    .map((ch) => ({
      challenge: ch,
      outcome: voteOutcome(
        me,
        (m.data ?? []).filter((x) => x.challenge_id === ch.id).map((x) => ({ id: x.user_id })),
        (v.data ?? []).filter((x) => x.challenge_id === ch.id),
      ),
      sessions: sessions.filter((x) => x.challenge_id === ch.id).length,
    }))
  return { sessions, past }
}

export default function Stats() {
  const { session } = useAuth()
  const me = session!.user.id
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    load(me).then(setData, (e) => setError(errorMessage(e)))
  }, [me])

  const stats = data && sessionStats(data.sessions)
  const won = data?.past.filter((p) => p.outcome.status === 'success').length ?? 0
  const decided = data?.past.filter((p) => p.outcome.status !== 'pending').length ?? 0

  return (
    <Screen>
      <div className="row gap">
        <BackLink to="/" />
        <p className="eyebrow">Historique</p>
      </div>
      <h1>Tes stats</h1>
      <ErrorText>{error}</ErrorText>

      {!data || !stats ? (
        !error && <p className="muted">Chargement…</p>
      ) : (
        <>
          <div className="stats">
            <Tile value={String(stats.total)} label={stats.total > 1 ? 'séances' : 'séance'} />
            <Tile value={stats.minutes ? formatDuration(stats.minutes) : '—'} label="d'entraînement" />
            <Tile value={String(stats.perWeek).replace('.', ',')} label="séances par semaine" />
            <Tile value={String(stats.streak)} label={stats.streak > 1 ? 'semaines d’affilée' : 'semaine d’affilée'} />
          </div>

          <section className="stack">
            <h2>Défis terminés</h2>
            {data.past.length === 0 ? (
              <p className="muted">Pas encore de défi terminé. Ton historique se remplira à la fin du premier.</p>
            ) : (
              <>
                <p className="muted">{decided ? `${won} réussi${won > 1 ? 's' : ''} sur ${plural(decided, 'défi')} jugé${decided > 1 ? 's' : ''}.` : 'Les votes sont en cours.'}</p>
                <ul className="list">
                  {data.past.map((p) => (
                    <li key={p.challenge.id}>
                      <Link to={`/defi/${p.challenge.id}`} className="card link-card">
                        <span className="row gap">
                          <strong className="grow">{p.challenge.name}</strong>
                          <OutcomeBadge outcome={p.outcome} />
                        </span>
                        <span className="muted">Fini le {formatDate(p.challenge.end_date)} · {plural(p.sessions, 'séance')}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </>
      )}
    </Screen>
  )
}

function Tile({ value, label }: { value: string; label: string }) {
  return (
    <div className="card stat">
      <span className="stat-value">{value}</span>
      <span className="muted small">{label}</span>
    </div>
  )
}
