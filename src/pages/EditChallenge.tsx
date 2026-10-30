import { useCallback, useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { CHALLENGE_NOT_FOUND, errorMessage } from '../lib/format'
import type { Tables } from '../lib/database.types'
import { Avatar, BackLink, ErrorText, Screen } from '../components/ui'
import ChallengeForm from '../components/ChallengeForm'

export default function EditChallenge() {
  const { id = '' } = useParams()
  const { session } = useAuth()
  const navigate = useNavigate()
  const [challenge, setChallenge] = useState<Tables<'challenges'> | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const loadMembers = useCallback(async () => {
    const { data } = await supabase.from('challenge_members').select('user_id, profiles(display_name)').eq('challenge_id', id).order('joined_at')
    setMembers((data ?? []).map((m) => ({ id: m.user_id, name: m.profiles?.display_name ?? '?' })))
  }, [id])

  useEffect(() => {
    supabase.from('challenges').select('*').eq('id', id).maybeSingle().then((c) => {
      if (c.error) return setError(errorMessage(c.error))
      if (!c.data) return setError(CHALLENGE_NOT_FOUND)
      setChallenge(c.data)
    })
    loadMembers()
  }, [id, loadMembers])

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
    // Les photos de preuve ne partent pas toutes seules avec le défi.
    const photos = await supabase.from('proofs').select('photo_path').eq('challenge_id', id).not('photo_path', 'is', null)
    const paths = (photos.data ?? []).map((p) => p.photo_path!).filter(Boolean)
    if (paths.length) await supabase.storage.from('proofs').remove(paths)
    const { error } = await supabase.from('challenges').delete().eq('id', id)
    setDeleting(false)
    if (error) return setError(errorMessage(error))
    navigate('/', { replace: true })
  }

  const others = members.length - 1

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

      {others > 0 && <MembersCard challengeId={id} creatorId={challenge.created_by} members={members} onRemoved={loadMembers} />}

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

type Member = { id: string; name: string }

function MembersCard({ challengeId, creatorId, members, onRemoved }: { challengeId: string; creatorId: string; members: Member[]; onRemoved: () => Promise<void> }) {
  const [confirming, setConfirming] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function remove(userId: string) {
    setBusy(true)
    setError('')
    // Sa photo de preuve ne part pas toute seule avec ses données.
    const proof = await supabase.from('proofs').select('photo_path').eq('challenge_id', challengeId).eq('user_id', userId).maybeSingle()
    if (proof.data?.photo_path) await supabase.storage.from('proofs').remove([proof.data.photo_path])
    const { error } = await supabase.rpc('remove_member', { p_challenge_id: challengeId, p_user_id: userId })
    setBusy(false)
    if (error) return setError(errorMessage(error))
    setConfirming(null)
    await onRemoved()
  }

  return (
    <section className="card stack" aria-label="Membres">
      <h2>Membres</h2>
      <ul className="rows flush">
        {members.map((m) => (
          <li key={m.id} className="stack tight-gap">
            <div className="row gap">
              <Avatar id={m.id} name={m.name} size={32} />
              <span className="grow">{m.name}</span>
              {m.id === creatorId ? (
                <span className="muted small">Créateur</span>
              ) : (
                confirming !== m.id && (
                  <button type="button" className="link danger-link" onClick={() => setConfirming(m.id)} aria-label={`Retirer ${m.name}`}>
                    Retirer
                  </button>
                )
              )}
            </div>
            {confirming === m.id && (
              <div className="stack tight-gap">
                <p className="muted small">
                  {m.name} quittera le défi : son objectif, ses séances, sa preuve et ses votes seront effacés. Le lien d'invitation
                  lui permettra de revenir.
                </p>
                <ErrorText>{error}</ErrorText>
                <div className="grid2">
                  <button type="button" className="btn delete compact" onClick={() => remove(m.id)} disabled={busy}>
                    {busy ? 'Retrait…' : 'Oui, retirer'}
                  </button>
                  <button type="button" className="btn outline compact" onClick={() => setConfirming(null)}>
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
