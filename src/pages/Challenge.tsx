import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { CHALLENGE_NOT_FOUND, daysUntil, errorMessage, formatDate, inviteUrl, isoDate, plural } from '../lib/format'
import { newSessions, weekRecap, weekStart } from '../lib/recap'
import { isGoalValidated, launchState } from '../lib/challenge'
import type { Tables } from '../lib/database.types'
import { Avatar, BackLink, ErrorText, Screen } from '../components/ui'
import QrCode from '../components/QrCode'
import { SessionForm, SessionList, WeekDots, WeekRecap, type Session } from '../components/Sessions'
import Finale from '../components/Finale'
import Sheet from '../components/Sheet'

type Member = { id: string; name: string }
type Review = Tables<'goal_reviews'>
type Goal = Tables<'goals'>
type Tab = 'semaine' | 'seances' | 'objectifs'

const TABS: { id: Tab; label: string }[] = [
  { id: 'semaine', label: 'Semaine' },
  { id: 'seances', label: 'Séances' },
  { id: 'objectifs', label: 'Objectifs' },
]

type Data = {
  challenge: Tables<'challenges'>
  members: Member[]
  goals: Goal[]
  reviews: Review[]
  sessions: Session[]
  proofs: Tables<'proofs'>[]
  votes: Tables<'votes'>[]
  lastSeen: Record<string, string>
}

async function load(id: string): Promise<Data> {
  const [c, m, g, s, p, v] = await Promise.all([
    supabase.from('challenges').select('*').eq('id', id).maybeSingle(),
    supabase.from('challenge_members').select('user_id, joined_at, last_seen_at, profiles(id, display_name)').eq('challenge_id', id).order('joined_at'),
    supabase.from('goals').select('*').eq('challenge_id', id),
    supabase.from('training_sessions').select('*').eq('challenge_id', id).order('done_on', { ascending: false }).order('created_at', { ascending: false }),
    supabase.from('proofs').select('*').eq('challenge_id', id),
    supabase.from('votes').select('*').eq('challenge_id', id),
  ])
  if (c.error) throw c.error
  if (!c.data) throw new Error(CHALLENGE_NOT_FOUND)
  for (const res of [m, g, s, p, v]) if (res.error) throw res.error
  const goals = g.data ?? []
  const r = goals.length
    ? await supabase.from('goal_reviews').select('*').in('goal_id', goals.map((x) => x.id))
    : { data: [] as Review[], error: null }
  if (r.error) throw r.error
  return {
    challenge: c.data,
    members: (m.data ?? []).map((row) => ({ id: row.user_id, name: row.profiles?.display_name ?? '?' })),
    goals,
    reviews: r.data,
    sessions: s.data ?? [],
    proofs: p.data ?? [],
    votes: v.data ?? [],
    lastSeen: Object.fromEntries((m.data ?? []).map((row) => [row.user_id, row.last_seen_at])),
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

  // Dernière visite : retenue au premier chargement (pour marquer les nouveautés), puis mise à jour.
  const [seenAt, setSeenAt] = useState<string | null>(null)
  useEffect(() => {
    if (!data || seenAt) return
    setSeenAt(data.lastSeen[me] ?? new Date().toISOString())
    supabase.from('challenge_members').update({ last_seen_at: new Date().toISOString() }).eq('challenge_id', id).eq('user_id', me).then()
  }, [data, seenAt, id, me])

  const fresh = useMemo(
    () => new Set(data && seenAt ? newSessions(data.sessions, me, seenAt).map((s) => s.id) : []),
    [data, seenAt, me],
  )

  const [tab, setTab] = useState<Tab | null>(null)
  const [sheet, setSheet] = useState<'invite' | 'session' | null>(null)
  const closeSheet = useCallback(() => setSheet(null), [])

  if (!data) {
    return (
      <Screen>
        <BackLink to="/" />
        {error ? <ErrorText>{error}</ErrorText> : <p className="muted">Chargement…</p>}
      </Screen>
    )
  }

  const { challenge, members, goals, reviews, sessions, proofs, votes } = data
  const days = daysUntil(challenge.end_date)
  const nameOf = (uid: string) => members.find((m) => m.id === uid)?.name ?? '?'
  const goalOf = (uid: string) => goals.find((g) => g.user_id === uid)
  const reviewsOf = (goalId: string) => reviews.filter((r) => r.goal_id === goalId)
  const others = members.filter((m) => m.id !== me)
  const isValidated = (goal: Goal) => isGoalValidated(goal, members, reviews)
  const { ready, message } = launchState(members, goals, reviews)
  const finished = days <= 0
  const alone = members.length < 2
  const since = isoDate(new Date(challenge.created_at))
  const myGoal = goalOf(me)
  const myWeek = weekRecap([{ id: me }], sessions, weekStart(isoDate()))[0]
  const current = tab ?? (ready ? 'semaine' : 'objectifs')

  // Une seule chose à faire, selon la phase du défi.
  let next: { title: string; text: string } | null = null
  if (days === 0) next = { title: "C'est le jour J !", text: 'Envoie ta preuve, puis vote pour la bande.' }
  else if (days < 0) next = { title: 'Défi terminé', text: 'Les preuves et les votes restent ouverts.' }
  else if (!ready) {
    const toReview = others.filter((m) => {
      const g = goalOf(m.id)
      return g && !reviews.some((r) => r.goal_id === g.id && r.reviewer_id === me)
    }).length
    const tooEasy = myGoal && reviewsOf(myGoal.id).some((r) => r.verdict === 'too_easy')
    const title = alone
      ? 'Invite ta bande'
      : !myGoal
        ? 'Écris ton objectif'
        : tooEasy
          ? 'Propose une nouvelle version de ton objectif'
          : toReview
            ? `Donne ton avis sur ${plural(toReview, 'objectif')}`
            : 'Le défi se lance bientôt'
    next = { title, text: message }
  }

  const tabs = (
    <>
      <div className="tabs three" role="tablist" aria-label="Contenu du défi">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" id={`tab-${t.id}`} aria-selected={current === t.id} aria-controls="tab-panel" className={current === t.id ? 'tab on' : 'tab'} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      <div id="tab-panel" role="tabpanel" aria-labelledby={`tab-${current}`} className="stack">
        {current === 'semaine' && <WeekRecap members={members} sessions={sessions} since={since} />}
        {current === 'seances' && <SessionList sessions={sessions} members={members} me={me} fresh={fresh} onChange={reload} />}
        {current === 'objectifs' && (
          <>
            <MyGoal challengeId={challenge.id} me={me} goal={myGoal} reviews={myGoal ? reviewsOf(myGoal.id) : []} reviewerCount={others.length} nameOf={nameOf} onSaved={reload} />
            {others.map((m) => (
              <OtherGoal key={m.id} member={m} me={me} goal={goalOf(m.id)} reviews={goalOf(m.id) ? reviewsOf(goalOf(m.id)!.id) : []} validated={goalOf(m.id) ? isValidated(goalOf(m.id)!) : false} nameOf={nameOf} onChange={reload} />
            ))}
          </>
        )}
      </div>
    </>
  )

  return (
    <Screen>
      <div className={days >= 0 ? 'stack page-with-cta' : 'stack'}>
        <div className="row between">
          <BackLink to="/" />
          {challenge.created_by === me && (
            <Link to={`/defi/${challenge.id}/modifier`} className="icon-btn" aria-label="Modifier le défi">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4" />
              </svg>
            </Link>
          )}
        </div>

        <header className="stack tight-gap">
          <h1>{challenge.name}</h1>
          <div className="row gap">
            <span className="muted grow">
              <strong className="countdown">{days > 0 ? `J-${days}` : days === 0 ? 'Jour J' : 'Terminé'}</strong> · fin le {formatDate(challenge.end_date)}
            </span>
            <span className="avatars" aria-hidden="true">
              {members.slice(0, 5).map((m) => <Avatar key={m.id} id={m.id} name={m.name} size={28} />)}
            </span>
            {!finished && (
              <button type="button" className="icon-btn small" aria-label="Inviter" onClick={() => setSheet('invite')}>+</button>
            )}
          </div>
          <span className="muted small">
            {members.length} dans la bande{challenge.stake ? ` · Enjeu : ${challenge.stake}` : ''}
          </span>
        </header>

        {next ? (
          <section className="card next-step stack tight-gap" aria-label="Prochaine étape">
            <strong className="next-title">{next.title}</strong>
            <span className={ready ? 'status ok' : 'muted'}>{next.text}</span>
          </section>
        ) : (
          <section className="card dark hero" aria-label="Ton défi">
            <span className="on-dark-muted small">Ton objectif</span>
            <span className="hero-goal">{myGoal?.title}</span>
            <span className="status ok on-dark">{message}</span>
            <span className="row gap">
              <span className="on-dark-muted small grow">Ta semaine</span>
              <WeekDots days={myWeek.days} />
              <strong className="count">{myWeek.count}</strong>
            </span>
          </section>
        )}

        {alone && !finished && <InviteCard code={challenge.invite_code} />}

        {finished ? (
          <>
            <Finale challengeId={challenge.id} me={me} members={members} proofs={proofs} votes={votes} onChange={reload} />
            <details className="more">
              <summary>Séances et objectifs</summary>
              <div className="stack">{tabs}</div>
            </details>
          </>
        ) : (
          tabs
        )}
      </div>

      {days >= 0 && (
        <div className="sticky-cta">
          <button type="button" className="btn primary" onClick={() => setSheet('session')}>+ J'ai fait une séance</button>
        </div>
      )}

      {sheet === 'invite' && (
        <Sheet title="Invite ta bande" onClose={closeSheet}>
          <InviteCard code={challenge.invite_code} bare />
        </Sheet>
      )}
      {sheet === 'session' && (
        <Sheet title="Nouvelle séance" onClose={closeSheet}>
          <SessionForm
            challengeId={challenge.id}
            me={me}
            endDate={challenge.end_date}
            onCancel={closeSheet}
            onSaved={() => {
              closeSheet()
              setTab('seances')
              reload()
            }}
          />
        </Sheet>
      )}
    </Screen>
  )
}

function InviteCard({ code, bare = false }: { code: string; bare?: boolean }) {
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
    <section className={bare ? 'stack' : 'card stack'}>
      {!bare && <h2>Invite ta bande</h2>}
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
