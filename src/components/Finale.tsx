import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { errorMessage } from '../lib/format'
import { shrinkImage } from '../lib/image'
import { voteOutcome, type Outcome } from '../lib/challenge'
import type { Tables } from '../lib/database.types'
import { Avatar, ErrorText } from './ui'

type Member = { id: string; name: string }
type Proof = Tables<'proofs'>
type Vote = Tables<'votes'>

const BUCKET = 'proofs'

// Les photos sont privées : on demande des liens temporaires pour les afficher.
function usePhotoUrls(proofs: Proof[]): Record<string, string> {
  const [urls, setUrls] = useState<Record<string, string>>({})
  const paths = proofs.map((p) => p.photo_path).filter((p): p is string => !!p)
  const key = paths.join('|')

  useEffect(() => {
    if (!paths.length) return
    supabase.storage.from(BUCKET).createSignedUrls(paths, 3600).then(({ data }) => {
      const next: Record<string, string> = {}
      for (const item of data ?? []) if (item.path && item.signedUrl) next[item.path] = item.signedUrl
      setUrls(next)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return urls
}

export function OutcomeBadge({ outcome }: { outcome: Outcome }) {
  if (outcome.status === 'success') return <span className="badge ok">Réussi</span>
  if (outcome.status === 'fail') return <span className="badge ko">Raté</span>
  return <span className="badge">{outcome.expected ? `${outcome.success + outcome.fail}/${outcome.expected} vote${outcome.expected > 1 ? 's' : ''}` : 'Seul dans le défi'}</span>
}

export default function Finale({ challengeId, me, members, proofs, votes, onChange }: {
  challengeId: string
  me: string
  members: Member[]
  proofs: Proof[]
  votes: Vote[]
  onChange: () => void
}) {
  const urls = usePhotoUrls(proofs)
  const proofOf = (id: string) => proofs.find((p) => p.user_id === id)
  const others = members.filter((m) => m.id !== me)
  const pendingVotes = others.filter((m) => !votes.some((v) => v.voter_id === me && v.target_id === m.id)).length

  return (
    <section className="stack" aria-labelledby="finale-title">
      <h2 id="finale-title">Fin du défi</h2>
      <p className="muted">
        Chacun montre ce qu'il a fait, puis la bande vote. La majorité décide ; en cas d'égalité, le doute profite au sportif.
        {pendingVotes > 0 && ` Il te reste ${pendingVotes} vote${pendingVotes > 1 ? 's' : ''}.`}
      </p>

      <ul className="list tight card">
        {members.map((m) => (
          <li key={m.id} className="row gap">
            <Avatar id={m.id} name={m.name} size={28} />
            <span className="grow ellipsis">{m.id === me ? 'Toi' : m.name}</span>
            <OutcomeBadge outcome={voteOutcome(m.id, members, votes)} />
          </li>
        ))}
      </ul>

      <MyProof challengeId={challengeId} me={me} proof={proofOf(me)} photoUrl={urls[proofOf(me)?.photo_path ?? '']} onSaved={onChange} />

      {others.map((m) => (
        <MemberProof
          key={m.id}
          challengeId={challengeId}
          me={me}
          member={m}
          proof={proofOf(m.id)}
          photoUrl={urls[proofOf(m.id)?.photo_path ?? '']}
          myVote={votes.find((v) => v.voter_id === me && v.target_id === m.id)}
          onChange={onChange}
        />
      ))}
    </section>
  )
}

function MyProof({ challengeId, me, proof, photoUrl, onSaved }: {
  challengeId: string
  me: string
  proof: Proof | undefined
  photoUrl: string | undefined
  onSaved: () => void
}) {
  const [editing, setEditing] = useState(!proof)
  const [note, setNote] = useState(proof?.note ?? '')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!note.trim() && !file && !proof?.photo_path) return setError('Ajoute un mot ou une photo.')
    setBusy(true)
    setError('')
    try {
      let photoPath = proof?.photo_path ?? null
      if (file) {
        const blob = await shrinkImage(file)
        photoPath = `${challengeId}/${me}/${Date.now()}.jpg`
        const up = await supabase.storage.from(BUCKET).upload(photoPath, blob, { contentType: 'image/jpeg' })
        if (up.error) throw up.error
      }
      const values = { note: note.trim() || null, photo_path: photoPath }
      const { error } = proof
        ? await supabase.from('proofs').update(values).eq('challenge_id', challengeId).eq('user_id', me)
        : await supabase.from('proofs').insert({ ...values, challenge_id: challengeId, user_id: me })
      if (error) throw error
      // L'ancienne photo n'est plus utilisée.
      if (file && proof?.photo_path) await supabase.storage.from(BUCKET).remove([proof.photo_path])
      setFile(null)
      setEditing(false)
      onSaved()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card stack" aria-labelledby="ma-preuve">
      <h2 id="ma-preuve">Ta preuve</h2>
      {editing ? (
        <form className="stack" onSubmit={save}>
          <div className="field">
            <label htmlFor="p-note">Ce que tu as fait</label>
            <textarea id="p-note" rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Semi bouclé en 1h48, voici mon temps officiel" />
          </div>
          <div className="field">
            <label htmlFor="p-photo">{proof?.photo_path ? 'Remplacer la photo' : 'Photo (facultatif)'}</label>
            <input id="p-photo" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
          <ErrorText>{error}</ErrorText>
          <div className="row gap">
            <button type="submit" className="btn primary grow" disabled={busy}>{busy ? 'Envoi…' : 'Envoyer ma preuve'}</button>
            {proof && <button type="button" className="btn ghost" onClick={() => setEditing(false)}>Annuler</button>}
          </div>
        </form>
      ) : proof ? (
        <>
          <ProofContent proof={proof} photoUrl={photoUrl} alt="Ta photo de preuve" />
          <button type="button" className="btn outline" onClick={() => setEditing(true)}>Modifier ma preuve</button>
        </>
      ) : null}
    </section>
  )
}

function ProofContent({ proof, photoUrl, alt }: { proof: Proof; photoUrl: string | undefined; alt: string }) {
  return (
    <>
      {proof.photo_path && (photoUrl ? <img className="proof-photo" src={photoUrl} alt={alt} /> : <div className="proof-photo placeholder" />)}
      {proof.note && <p>« {proof.note} »</p>}
    </>
  )
}

function MemberProof({ challengeId, me, member, proof, photoUrl, myVote, onChange }: {
  challengeId: string
  me: string
  member: Member
  proof: Proof | undefined
  photoUrl: string | undefined
  myVote: Vote | undefined
  onChange: () => void
}) {
  const [error, setError] = useState('')
  const [changing, setChanging] = useState(false)

  async function vote(verdict: 'success' | 'fail') {
    setError('')
    const { error } = myVote
      ? await supabase.from('votes').update({ verdict }).eq('challenge_id', challengeId).eq('voter_id', me).eq('target_id', member.id)
      : await supabase.from('votes').insert({ challenge_id: challengeId, voter_id: me, target_id: member.id, verdict })
    if (error) return setError(errorMessage(error))
    setChanging(false)
    onChange()
  }

  return (
    <article className="card stack" aria-label={`Preuve de ${member.name}`}>
      <div className="row gap">
        <Avatar id={member.id} name={member.name} />
        <strong className="grow">{member.name}</strong>
      </div>
      {proof ? (
        <ProofContent proof={proof} photoUrl={photoUrl} alt={`Photo de preuve de ${member.name}`} />
      ) : (
        <p className="muted">Pas encore de preuve.</p>
      )}
      {myVote && !changing ? (
        <p className="muted small">
          Ton vote : <strong>{myVote.verdict === 'success' ? 'réussi' : 'raté'}</strong>.{' '}
          <button type="button" className="link" onClick={() => setChanging(true)}>changer</button>
        </p>
      ) : (
        <div className="grid2">
          <button type="button" className="btn blue" onClick={() => vote('success')}>Réussi</button>
          <button type="button" className="btn outline" onClick={() => vote('fail')}>Raté</button>
        </div>
      )}
      <ErrorText>{error}</ErrorText>
    </article>
  )
}
