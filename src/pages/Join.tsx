import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { daysUntil, errorMessage, formatDate } from '../lib/format'
import type { Database } from '../lib/database.types'
import { Brand, ErrorText, Screen } from '../components/ui'

type Invite = Database['public']['Functions']['get_invite']['Returns'][number]

export default function Join() {
  const { code = '' } = useParams()
  const navigate = useNavigate()
  const [invite, setInvite] = useState<Invite | null | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.rpc('get_invite', { p_code: code }).then(({ data, error }) => {
      if (error) setError(errorMessage(error))
      setInvite(data?.[0] ?? null)
    })
  }, [code])

  async function join() {
    setBusy(true)
    const { data, error } = await supabase.rpc('join_challenge', { p_code: code })
    setBusy(false)
    if (error || !data) return setError(errorMessage(error))
    navigate(`/defi/${data}`, { replace: true })
  }

  return (
    <Screen>
      <Brand />
      {invite === undefined ? (
        <p className="muted">Chargement de l'invitation…</p>
      ) : invite === null ? (
        <>
          <h1>Invitation introuvable</h1>
          <p className="lead">Le lien est peut-être incomplet. Demande-le à nouveau à ton ami.</p>
          <ErrorText>{error}</ErrorText>
        </>
      ) : (
        <>
          <p className="eyebrow">{invite.creator_name} t'invite</p>
          <h1>{invite.name}</h1>
          <div className="card dark">
            <span className="big-number">{Math.max(0, daysUntil(invite.end_date))}</span>
            <span>jours restants · fin le {formatDate(invite.end_date)}</span>
            {invite.stake && <span className="on-dark-muted">Enjeu : {invite.stake}</span>}
          </div>
          <p className="muted">{invite.member_count} {invite.member_count > 1 ? 'personnes ont' : 'personne a'} déjà rejoint.</p>
          <ErrorText>{error}</ErrorText>
          <button type="button" className="btn primary" onClick={join} disabled={busy}>
            {busy ? 'Un instant…' : 'Rejoindre la bande'}
          </button>
        </>
      )}
    </Screen>
  )
}
