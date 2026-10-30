import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { CHALLENGE_NOT_FOUND, errorMessage } from '../lib/format'
import type { Tables } from '../lib/database.types'
import { BackLink, ErrorText, Screen } from '../components/ui'
import ChallengeForm from '../components/ChallengeForm'

export default function EditChallenge() {
  const { id = '' } = useParams()
  const { session } = useAuth()
  const navigate = useNavigate()
  const [challenge, setChallenge] = useState<Tables<'challenges'> | null>(null)
  const [memberCount, setMemberCount] = useState(0)
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    Promise.all([
      supabase.from('challenges').select('*').eq('id', id).maybeSingle(),
      supabase.from('challenge_members').select('user_id', { count: 'exact', head: true }).eq('challenge_id', id),
    ]).then(([c, m]) => {
      if (c.error) return setError(errorMessage(c.error))
      if (!c.data) return setError(CHALLENGE_NOT_FOUND)
      setChallenge(c.data)
      setMemberCount(m.count ?? 0)
    })
  }, [id])

  if (!challenge) {
    return (
      <Screen>
        <BackLink to={`/defi/${id}`} />
        {error ? <ErrorText>{error}</ErrorText> : <p className="muted">Chargement…</p>}
      </Screen>
    )
  }

  // Seul le créateur modifie ou supprime le défi (la base le refuse aussi aux autres).
  if (challenge.created_by !== session?.user.id) return <Navigate to={`/defi/${id}`} replace />

  async function remove() {
    setDeleting(true)
    setError('')
    const { error } = await supabase.from('challenges').delete().eq('id', id)
    setDeleting(false)
    if (error) return setError(errorMessage(error))
    navigate('/', { replace: true })
  }

  const others = memberCount - 1

  return (
    <Screen>
      <div className="row gap">
        <BackLink to={`/defi/${id}`} />
        <p className="eyebrow">Modifier le défi</p>
      </div>
      <h1>{challenge.name}</h1>

      <ChallengeForm
        initial={{ name: challenge.name, endDate: challenge.end_date, stake: challenge.stake ?? '' }}
        submitLabel="Enregistrer les modifications"
        busyLabel="Enregistrement…"
        onSubmit={async ({ name, endDate, stake }) => {
          const { error } = await supabase.from('challenges').update({ name, end_date: endDate, stake }).eq('id', id)
          if (error) return errorMessage(error)
          navigate(`/defi/${id}`, { replace: true })
          return null
        }}
      />

      <section className="card stack danger">
        <h2>Supprimer le défi</h2>
        <p className="muted">
          {others > 0
            ? `Le défi disparaîtra aussi pour ${others === 1 ? 'l’autre membre' : `les ${others} autres membres`}, avec tous les objectifs, avis et séances.`
            : 'Le défi et tout son contenu seront effacés.'}{' '}
          C'est définitif.
        </p>
        <ErrorText>{error}</ErrorText>
        {confirming ? (
          <div className="grid2">
            <button type="button" className="btn delete" onClick={remove} disabled={deleting}>
              {deleting ? 'Suppression…' : 'Oui, supprimer'}
            </button>
            <button type="button" className="btn outline" onClick={() => setConfirming(false)}>Annuler</button>
          </div>
        ) : (
          <button type="button" className="btn outline-danger" onClick={() => setConfirming(true)}>
            Supprimer le défi
          </button>
        )}
      </section>
    </Screen>
  )
}
