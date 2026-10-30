import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { daysUntil, errorMessage, formatDate, inviteUrl } from '../lib/format'
import type { Tables } from '../lib/database.types'
import { Avatar, BackLink, ErrorText, Screen } from '../components/ui'
import QrCode from '../components/QrCode'

type Member = { id: string; name: string }
type Review = Tables<'goal_reviews'>
type Goal = Tables<'goals'>

type Data = {
  challenge: Tables<'challenges'>
  members: Member[]
  goals: Goal[]
  reviews: Review[]
}

async function load(id: string): Promise<Data> {
  const [c, m, g] = await Promise.all([
    supabase.from('challenges').select('*').eq('id', id).single(),
    supabase.from('challenge_members').select('user_id, joined_at, profiles(id, display_name)').eq('challenge_id', id).order('joined_at'),
    supabase.from('goals').select('*').eq('challenge_id', id),
  ])
  if (c.error) throw c.error
  if (m.error) throw m.error
  if (g.error) throw g.error
  const goals = g.data
  const r = goals.length
    ? await supabase.from('goal_reviews').select('*').in('goal_id', goals.map((x) => x.id))
    : { data: [] as Review[], error: null }
  if (r.error) throw r.error
  return {
    challenge: c.data,
    members: m.data.map((row) => ({ id: row.user_id, name: row.profiles?.display_name ?? '?' })),
    goals,
    reviews: r.data,
  }
}

export default function Challenge() {
  const { id = '' } = useParams()
  const { session } = useAuth()
  const me = session!.user.id
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState('')

  const reload = useCallback(() => {
    load(id).then(setData, (e) => setError(errorMessage(e)))
  }, [id])

  useEffect(reload, [reload])

  if (!data) {
    return (
      <Screen>
        <BackLink to="/" />
        {error ? <ErrorText>{error}</ErrorText> : <p className="muted">Chargement…</p>}
      </Screen>
    )
  }

  const { challenge, members, goals, reviews } = data
  const days = daysUntil(challenge.end_date)
  const nameOf = (uid: string) => members.find((m) => m.id === uid)?.name ?? '?'
  const goalOf = (uid: string) => goals.find((g) => g.user_id === uid)
  const reviewsOf = (goalId: string) => reviews.filter((r) => r.goal_id === goalId)
  const others = members.filter((m) => m.id !== me)
  const isValidated = (goal: Goal) => {
    const rs = reviewsOf(goal.id)
    const reviewers = members.filter((m) => m.id !== goal.user_id)
    return reviewers.every((m) => rs.some((r) => r.reviewer_id === m.id && r.verdict === 'ok'))
  }
  const missing = members.filter((m) => !goalOf(m.id)).length
  const pending = goals.filter((g) => !isValidated(g)).length
  const ready = members.length > 1 && missing === 0 && pending === 0

  return (
    <Screen>
      <div className="row gap">
        <BackLink to="/" />
        <p className="eyebrow">{members.length} dans la bande</p>
      </div>
      <h1>{challenge.name}</h1>

      <div className="card dark">
        <span className="big-number">{Math.max(0, days)}</span>
        <span>{days > 0 ? 'jours restants' : days === 0 ? "C'est le jour J !" : 'Défi terminé'} · fin le {formatDate(challenge.end_date)}</span>
        {challenge.stake && <span className="on-dark-muted">Enjeu : {challenge.stake}</span>}
      </div>

      <p className={ready ? 'status ok' : 'status'}>
        {ready
          ? 'Tous les objectifs sont validés : le défi est lancé !'
          : members.length < 2
            ? 'Invite au moins un ami pour lancer le défi.'
            : `En attente : ${missing ? `${missing} objectif${missing > 1 ? 's' : ''} à écrire` : ''}${missing && pending ? ', ' : ''}${pending ? `${pending} à valider` : ''}.`}
      </p>

      <InviteCard code={challenge.invite_code} />

      <MyGoal challengeId={challenge.id} me={me} goal={goalOf(me)} reviews={goalOf(me) ? reviewsOf(goalOf(me)!.id) : []} reviewerCount={others.length} nameOf={nameOf} onSaved={reload} />

      <section className="stack">
        <h2>Les objectifs de la bande</h2>
        {others.length === 0 && <p className="muted">Personne n'a encore rejoint. Partage le lien d'invitation.</p>}
        {others.map((m) => (
          <OtherGoal key={m.id} member={m} me={me} goal={goalOf(m.id)} reviews={goalOf(m.id) ? reviewsOf(goalOf(m.id)!.id) : []} validated={goalOf(m.id) ? isValidated(goalOf(m.id)!) : false} nameOf={nameOf} onChange={reload} />
        ))}
      </section>
    </Screen>
  )
}

function InviteCard({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  const url = inviteUrl(code)

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      window.prompt('Copie ce lien :', url)
    }
  }

  async function share() {
    try {
      await navigator.share({ title: 'La Bande', text: 'Rejoins mon défi sur La Bande !', url })
    } catch {
      // partage annulé
    }
  }

  return (
    <section className="card stack">
      <h2>Invite ta bande</h2>
      <div className="qr-box">
        <QrCode value={url} label="QR code d'invitation au défi" />
        <p className="muted small">Fais scanner ce QR code avec l'appareil photo, ou envoie le lien.</p>
      </div>
      <p className="invite-url">{url}</p>
      <div className="grid2">
        <button type="button" className="btn outline" onClick={copy}>{copied ? 'Lien copié' : 'Copier le lien'}</button>
        {'share' in navigator && (
          <button type="button" className="btn dark" onClick={share}>Partager</button>
        )}
      </div>
    </section>
  )
}

function MyGoal({ challengeId, me, goal, reviews, reviewerCount, nameOf, onSaved }: {
  challengeId: string
  me: string
  goal: Goal | undefined
  reviews: Review[]
  reviewerCount: number
  nameOf: (id: string) => string
  onSaved: () => void
}) {
  const [editing, setEditing] = useState(!goal)
  const [title, setTitle] = useState(goal?.title ?? '')
  const [target, setTarget] = useState(goal?.target_value ?? '')
  const [unit, setUnit] = useState(goal?.unit ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function save(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const values = { title: title.trim(), target_value: target.trim() || null, unit: unit.trim() || null }
    const { error } = goal
      ? await supabase.from('goals').update(values).eq('id', goal.id)
      : await supabase.from('goals').insert({ ...values, challenge_id: challengeId, user_id: me })
    setBusy(false)
    if (error) return setError(errorMessage(error))
    setEditing(false)
    onSaved()
  }

  const okBy = reviews.filter((r) => r.verdict === 'ok').map((r) => nameOf(r.reviewer_id))
  const tooEasy = reviews.filter((r) => r.verdict === 'too_easy')

  return (
    <section className="card stack">
      <h2>Ton objectif</h2>
      {editing ? (
        <form className="stack" onSubmit={save}>
          <div className="field">
            <label htmlFor="goal">Objectif</label>
            <input id="goal" required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Courir un semi-marathon en moins de 1h50" />
          </div>
          <div className="grid2">
            <div className="field">
              <label htmlFor="cible">Valeur cible</label>
              <input id="cible" maxLength={40} value={target} onChange={(e) => setTarget(e.target.value)} placeholder="1h50" />
            </div>
            <div className="field">
              <label htmlFor="unite">Unité</label>
              <input id="unite" maxLength={40} value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="temps" />
            </div>
          </div>
          {goal && <p className="hint">Une nouvelle version repart en validation auprès de toute la bande.</p>}
          <ErrorText>{error}</ErrorText>
          <div className="row gap">
            <button type="submit" className="btn primary grow" disabled={busy}>{busy ? 'Enregistrement…' : goal ? 'Proposer cette version' : 'Enregistrer mon objectif'}</button>
            {goal && <button type="button" className="btn ghost" onClick={() => setEditing(false)}>Annuler</button>}
          </div>
        </form>
      ) : goal ? (
        <>
          <p className="goal-title">{goal.title}</p>
          {goal.target_value && <p className="muted">Mesure : {goal.target_value}{goal.unit ? ` (${goal.unit})` : ''}</p>}
          {tooEasy.map((r) => (
            <div key={r.reviewer_id} className="alert">
              <strong>{nameOf(r.reviewer_id)} trouve ton objectif trop facile</strong>
              {r.comment && <span>« {r.comment} »</span>}
            </div>
          ))}
          <p className="muted">
            {reviewerCount === 0
              ? 'En attente de tes amis.'
              : okBy.length === reviewerCount
                ? 'Validé par toute la bande.'
                : `Validé par ${okBy.length ? okBy.join(', ') : 'personne pour l’instant'} · ${okBy.length}/${reviewerCount}`}
          </p>
          <button type="button" className="btn outline" onClick={() => setEditing(true)}>
            {tooEasy.length ? 'Proposer une nouvelle version' : 'Modifier mon objectif'}
          </button>
        </>
      ) : null}
    </section>
  )
}

function OtherGoal({ member, me, goal, reviews, validated, nameOf, onChange }: {
  member: Member
  me: string
  goal: Goal | undefined
  reviews: Review[]
  validated: boolean
  nameOf: (id: string) => string
  onChange: () => void
}) {
  const mine = reviews.find((r) => r.reviewer_id === me)
  const [commenting, setCommenting] = useState(false)
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')

  async function review(verdict: 'ok' | 'too_easy', text?: string) {
    if (!goal) return
    setError('')
    const { error } = await supabase
      .from('goal_reviews')
      .upsert({ goal_id: goal.id, reviewer_id: me, verdict, comment: text?.trim() || null })
    if (error) return setError(errorMessage(error))
    setCommenting(false)
    setComment('')
    onChange()
  }

  async function undo() {
    if (!goal) return
    const { error } = await supabase.from('goal_reviews').delete().eq('goal_id', goal.id).eq('reviewer_id', me)
    if (error) return setError(errorMessage(error))
    onChange()
  }

  const tooEasyBy = reviews.filter((r) => r.verdict === 'too_easy' && r.reviewer_id !== me).map((r) => nameOf(r.reviewer_id))

  return (
    <article className="card stack">
      <div className="row gap start">
        <Avatar id={member.id} name={member.name} />
        <div className="stack tight">
          <strong>{member.name}</strong>
          {goal ? (
            <>
              <span>{goal.title}</span>
              {goal.target_value && <span className="muted small">Mesure : {goal.target_value}{goal.unit ? ` (${goal.unit})` : ''}</span>}
            </>
          ) : (
            <span className="muted">N'a pas encore choisi son objectif.</span>
          )}
        </div>
      </div>

      {goal && validated && <p className="status ok">Validé par toute la bande</p>}
      {goal && tooEasyBy.length > 0 && <p className="muted small">Trop facile selon {tooEasyBy.join(', ')}</p>}

      {goal && !mine && !commenting && (
        <div className="grid2">
          <button type="button" className="btn blue" onClick={() => review('ok')}>Valider</button>
          <button type="button" className="btn outline" onClick={() => setCommenting(true)}>Trop facile !</button>
        </div>
      )}

      {goal && commenting && (
        <div className="stack">
          <div className="field">
            <label htmlFor={`c-${member.id}`}>Un mot pour {member.name} (facultatif)</label>
            <textarea id={`c-${member.id}`} rows={2} maxLength={500} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Tu peux viser plus haut !" />
          </div>
          <div className="row gap">
            <button type="button" className="btn primary grow" onClick={() => review('too_easy', comment)}>Envoyer</button>
            <button type="button" className="btn ghost" onClick={() => setCommenting(false)}>Annuler</button>
          </div>
        </div>
      )}

      {goal && mine && (
        <p className="muted small">
          {mine.verdict === 'ok' ? 'Tu as validé cet objectif.' : `Remarque envoyée : ${member.name} va proposer une nouvelle version.`}{' '}
          <button type="button" className="link" onClick={undo}>changer d'avis</button>
        </p>
      )}
      <ErrorText>{error}</ErrorText>
    </article>
  )
}
