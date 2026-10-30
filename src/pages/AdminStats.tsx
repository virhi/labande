import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { plural } from '../lib/format'
import { BackLink, ErrorText, Screen } from '../components/ui'

// Ce que renvoie la fonction admin_stats() : uniquement des totaux.
export type AdminStatsData = {
  totals: { users: number; challenges: number; ongoing: number; finished: number; sessions: number; avg_members: number | null; solo_challenges: number }
  finale: { finished: number; with_proof: number }
  retention: { active_this_week: number; active_last_week: number; returning: number }
  weeks: { week: string; signups: number; challenges: number; sessions: number; active_users: number }[]
}

function weekLabel(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

// Mot au pluriel, sans le nombre (affiché à part).
const words = (n: number, one: string, many: string) => (n > 1 ? many : one)

const percent = (part: number, total: number) => (total ? `${Math.round((part / total) * 100)} %` : '—')

// Réservée aux admins : la base refuse les chiffres à tout le monde d'autre (fonction admin_stats).
export default function AdminStats() {
  const [data, setData] = useState<AdminStatsData | null>(null)
  const [denied, setDenied] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.rpc('admin_stats').then(({ data, error }) => {
      if (error) return error.message.includes('Accès réservé') ? setDenied(true) : setError(error.message)
      setData(data as AdminStatsData)
    })
  }, [])

  return (
    <Screen>
      <div className="row gap">
        <BackLink to="/profil" />
        <p className="eyebrow">Réservé aux admins</p>
      </div>
      <h1>Stats de La Bande</h1>

      {denied ? (
        <div className="card">
          <p>Accès réservé.</p>
        </div>
      ) : error ? (
        <ErrorText>{error}</ErrorText>
      ) : !data ? (
        <p className="muted">Chargement…</p>
      ) : (
        <StatsView data={data} />
      )}
    </Screen>
  )
}

export function StatsView({ data }: { data: AdminStatsData }) {
  const { totals, finale, retention, weeks } = data
  const maxSessions = Math.max(1, ...weeks.map((w) => w.sessions))

  return (
    <>
      <div className="stats">
        <Tile value={totals.users} label={words(totals.users, 'inscrit', 'inscrits')} />
        <Tile value={totals.challenges} label={`${words(totals.challenges, 'défi', 'défis')} · ${totals.ongoing} en cours`} />
        <Tile value={totals.sessions} label={words(totals.sessions, 'séance', 'séances')} />
        <Tile value={totals.avg_members == null ? '—' : String(totals.avg_members).replace('.', ',')} label="membres par défi" />
      </div>

      <section className="card stack" aria-label="Jour J">
        <h2>Jusqu'au jour J</h2>
        {finale.finished === 0 ? (
          <p className="muted">Aucun défi terminé pour l'instant.</p>
        ) : (
          <p>
            <strong>{percent(finale.with_proof, finale.finished)}</strong>{' '}
            <span className="muted">
              des défis terminés ont reçu au moins une preuve ({finale.with_proof} sur {finale.finished}).
            </span>
          </p>
        )}
        <p className="muted small">
          {plural(totals.solo_challenges, 'défi')} sans personne d'autre que son créateur.
        </p>
      </section>

      <section className="card stack" aria-label="Fidélité">
        <h2>Qui revient</h2>
        <ul className="rows flush">
          <li className="row between"><span>Actifs cette semaine</span><strong>{retention.active_this_week}</strong></li>
          <li className="row between"><span>Actifs la semaine dernière</span><strong>{retention.active_last_week}</strong></li>
          <li className="row between">
            <span>Revenus cette semaine</span>
            <strong>{retention.returning} <span className="muted small">({percent(retention.returning, retention.active_last_week)})</span></strong>
          </li>
        </ul>
        <p className="muted small">Actif : a noté au moins une séance dans la semaine.</p>
      </section>

      <section className="card stack" aria-label="Semaine par semaine">
        <h2>Semaine par semaine</h2>
        <ul className="rows flush">
          {[...weeks].reverse().map((w) => (
            <li key={w.week} className="stack tight-gap">
              <div className="row between">
                <strong>Sem. du {weekLabel(w.week)}</strong>
                <span className="muted small">{plural(w.sessions, 'séance')}</span>
              </div>
              <div className="bar" aria-hidden="true"><span style={{ width: `${(w.sessions / maxSessions) * 100}%` }} /></div>
              <span className="muted small">
                {plural(w.active_users, 'actif')} · {plural(w.signups, 'inscrit')} · {w.challenges} {words(w.challenges, 'défi créé', 'défis créés')}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}

function Tile({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="card stat">
      <span className="stat-value">{value}</span>
      <span className="muted small">{label}</span>
    </div>
  )
}
