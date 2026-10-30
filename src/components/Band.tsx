import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { daysUntil, errorMessage, formatDate } from '../lib/format'
import { bandChain } from '../lib/band'
import { voteOutcome, type Outcome } from '../lib/challenge'
import type { Tables } from '../lib/database.types'
import ChallengeForm from './ChallengeForm'

type Brief = Pick<Tables<'challenges'>, 'id' | 'name' | 'end_date' | 'replayed_from'>
type Result = { id: string; name: string; outcome: Outcome }
type Past = Brief & { results: Result[] }

async function loadBand(challengeId: string) {
  const { data, error } = await supabase.from('challenges').select('id, name, end_date, replayed_from')
  if (error) throw error
  const { before, after } = bandChain(data ?? [], challengeId)
  if (!before.length) return { past: [] as Past[], next: after[0] ?? null }

  const ids = before.map((c) => c.id)
  const [m, v] = await Promise.all([
    supabase.from('challenge_members').select('challenge_id, user_id, profiles(display_name)').in('challenge_id', ids),
    supabase.from('votes').select('challenge_id, voter_id, target_id, verdict').in('challenge_id', ids),
  ])
  if (m.error) throw m.error
  if (v.error) throw v.error
  const past = before.map((c) => {
    const members = (m.data ?? []).filter((x) => x.challenge_id === c.id).map((x) => ({ id: x.user_id, name: x.profiles?.display_name ?? '?' }))
    const votes = (v.data ?? []).filter((x) => x.challenge_id === c.id)
    return { ...c, results: members.map((x) => ({ ...x, outcome: voteOutcome(x.id, members, votes) })) }
  })
  return { past, next: after[0] ?? null }
}

const OUTCOME_TEXT: Record<Outcome['status'], string> = { success: 'réussi', fail: 'raté', pending: 'en attente' }

// Rejouer avec la même bande (à partir du jour J) et défis précédents de la bande.
export default function Band({ challenge, memberCount }: { challenge: Tables<'challenges'>; memberCount: number }) {
  const navigate = useNavigate()
  const [band, setBand] = useState<{ past: Past[]; next: Brief | null } | null>(null)
  const [error, setError] = useState('')
  const [replaying, setReplaying] = useState(false)
  const canReplay = daysUntil(challenge.end_date) <= 0

  useEffect(() => {
    loadBand(challenge.id).then(setBand, (e) => setError(errorMessage(e)))
  }, [challenge.id])

  if (error) return null
  if (!band) return null

  return (
    <>
      {canReplay && band.next && (
        <Link to={`/defi/${band.next.id}`} className="card link-card" aria-label="La revanche">
          <strong>La revanche est lancée</strong>
          <span className="muted">{band.next.name} · fin le {formatDate(band.next.end_date)}</span>
        </Link>
      )}

      {canReplay && !band.next && (
        <section className="card stack" aria-label="Rejouer avec la même bande">
          <h2>Rejouer avec la même bande</h2>
          {replaying ? (
            <>
              <p className="muted small">
                {memberCount > 1
                  ? `Les ${memberCount - 1} autres membres sont ajoutés tout de suite : pas besoin de QR code. Chacun écrit un nouvel objectif.`
                  : 'Un nouveau défi, avec un nouvel objectif.'}
              </p>
              <ChallengeForm
                initial={{ name: `${challenge.name} (revanche)`.slice(0, 80), endDate: '', stake: challenge.stake ?? '' }}
                submitLabel="Lancer la revanche"
                busyLabel="Lancement…"
                onSubmit={async ({ name, endDate, stake }) => {
                  const { data, error } = await supabase.rpc('replay_challenge', { p_from: challenge.id, p_name: name, p_end_date: endDate, p_stake: stake })
                  if (error) return errorMessage(error)
                  navigate(`/defi/${data}`)
                  return null
                }}
              />
              <button type="button" className="btn ghost" onClick={() => setReplaying(false)}>Annuler</button>
            </>
          ) : (
            <>
              <p className="muted">Un nouveau défi avec les mêmes membres, en un clic.</p>
              <button type="button" className="btn dark" onClick={() => setReplaying(true)}>Rejouer</button>
            </>
          )}
        </section>
      )}

      {band.past.length > 0 && (
        <section className="stack" aria-label="L'historique de la bande">
          <h2>L'historique de la bande</h2>
          <ul className="list">
            {band.past.map((c) => (
              <li key={c.id}>
                <Link to={`/defi/${c.id}`} className="card link-card">
                  <strong>{c.name}</strong>
                  <span className="muted small">Fini le {formatDate(c.end_date)}</span>
                  <span className="results">
                    {c.results.map((r) => (
                      <span key={r.id} className={`result ${r.outcome.status}`}>
                        {r.name} : {OUTCOME_TEXT[r.outcome.status]}
                      </span>
                    ))}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}
