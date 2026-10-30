import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { errorMessage, formatDate, formatDay, formatDuration, isoDate, plural } from '../lib/format'
import { pastWeeks, weekRecap, weekStart } from '../lib/recap'
import type { Tables } from '../lib/database.types'
import { Avatar, ErrorText } from './ui'

type Member = { id: string; name: string }
export type Session = Tables<'training_sessions'>

const DAY_LETTERS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const KINDS = ['Course', 'Vélo', 'Natation', 'Muscu', 'Marche', 'Yoga', 'Escalade']

// Le récap de la semaine, sur le site plutôt que par email.
export function WeekRecap({ members, sessions, since }: { members: Member[]; sessions: Session[]; since: string }) {
  const today = isoDate()
  const start = weekStart(today)
  const week = weekRecap(members, sessions, start)
  const past = pastWeeks(sessions, since, today)
  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? '?'

  return (
    <section className="card stack" aria-labelledby="recap-title">
      <div className="row between">
        <h2 id="recap-title">Cette semaine</h2>
        <span className="muted small">depuis lundi {formatDate(start).replace(/ \d{4}$/, '')}</span>
      </div>
      <ul className="list tight">
        {week.map((w) => (
          <li key={w.id} className="row gap" aria-label={`${nameOf(w.id)} : ${plural(w.count, 'séance')} cette semaine`}>
            <Avatar id={w.id} name={nameOf(w.id)} size={32} />
            <span className="grow ellipsis">{nameOf(w.id)}</span>
            <span className="week-dots" aria-hidden="true">
              {w.days.map((on, i) => (
                <span key={i} className={on ? 'dot on' : 'dot'}>{DAY_LETTERS[i]}</span>
              ))}
            </span>
            <strong className="count">{w.count}</strong>
          </li>
        ))}
      </ul>
      {past.length > 0 && (
        <details className="past-weeks">
          <summary>Semaines précédentes</summary>
          <ul className="list tight">
            {past.map((p) => (
              <li key={p.start} className="small">
                <strong>Semaine du {formatDate(p.start).replace(/ \d{4}$/, '')}</strong> :{' '}
                {members.map((m) => `${m.name} ${p.counts[m.id] ?? 0}`).join(' · ')}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}

export function SessionForm({ challengeId, me, endDate, onSaved }: {
  challengeId: string
  me: string
  endDate: string
  onSaved: () => void
}) {
  const today = isoDate()
  const [open, setOpen] = useState(false)
  const [doneOn, setDoneOn] = useState(today)
  const [kind, setKind] = useState('')
  const [duration, setDuration] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function save(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error } = await supabase.from('training_sessions').insert({
      challenge_id: challengeId,
      user_id: me,
      done_on: doneOn,
      kind: kind.trim() || null,
      duration_min: duration ? Number(duration) : null,
      note: note.trim() || null,
    })
    setBusy(false)
    if (error) return setError(errorMessage(error))
    setOpen(false)
    setKind('')
    setDuration('')
    setNote('')
    setDoneOn(today)
    onSaved()
  }

  if (!open) {
    return (
      <button type="button" className="btn primary" onClick={() => setOpen(true)}>
        J'ai fait une séance
      </button>
    )
  }

  return (
    <form className="card stack" onSubmit={save} aria-label="Nouvelle séance">
      <h2>Nouvelle séance</h2>
      <div className="grid2">
        <div className="field">
          <label htmlFor="s-date">Date</label>
          <input id="s-date" type="date" required value={doneOn} max={endDate < today ? endDate : today} onChange={(e) => setDoneOn(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="s-duree">Durée (min)</label>
          <input id="s-duree" type="number" inputMode="numeric" min={1} max={1440} value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="45" />
        </div>
      </div>
      <div className="field">
        <label htmlFor="s-type">Activité</label>
        <input id="s-type" list="s-types" maxLength={40} value={kind} onChange={(e) => setKind(e.target.value)} placeholder="Course" />
        <datalist id="s-types">
          {KINDS.map((k) => <option key={k} value={k} />)}
        </datalist>
      </div>
      <div className="field">
        <label htmlFor="s-note">Un mot (facultatif)</label>
        <textarea id="s-note" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Fractionné 10 × 400 m, dur mais bon" />
      </div>
      <ErrorText>{error}</ErrorText>
      <div className="row gap">
        <button type="submit" className="btn primary grow" disabled={busy}>{busy ? 'Enregistrement…' : 'Enregistrer la séance'}</button>
        <button type="button" className="btn ghost" onClick={() => setOpen(false)}>Annuler</button>
      </div>
    </form>
  )
}

const PAGE = 10

export function SessionList({ sessions, members, me, fresh, onChange }: {
  sessions: Session[]
  members: Member[]
  me: string
  fresh: Set<string>
  onChange: () => void
}) {
  const [shown, setShown] = useState(PAGE)
  const [error, setError] = useState('')
  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? '?'

  async function remove(id: string) {
    if (!window.confirm('Supprimer cette séance ?')) return
    const { error } = await supabase.from('training_sessions').delete().eq('id', id)
    if (error) return setError(errorMessage(error))
    onChange()
  }

  return (
    <section className="stack" aria-labelledby="seances-title">
      <h2 id="seances-title">Les séances</h2>
      <ErrorText>{error}</ErrorText>
      {sessions.length === 0 ? (
        <p className="muted">Aucune séance pour l'instant. La première motive toute la bande.</p>
      ) : (
        <ul className="list">
          {sessions.slice(0, shown).map((s) => (
            <li key={s.id} className="card row gap start session">
              <Avatar id={s.user_id} name={nameOf(s.user_id)} size={36} />
              <div className="stack tight grow">
                <span>
                  <strong>{s.user_id === me ? 'Toi' : nameOf(s.user_id)}</strong>
                  {fresh.has(s.id) && <span className="tag">nouveau</span>}
                </span>
                <span>{[s.kind ?? 'Séance', s.duration_min ? formatDuration(s.duration_min) : null].filter(Boolean).join(' · ')}</span>
                {s.note && <span className="muted small">« {s.note} »</span>}
              </div>
              <div className="stack tight end">
                <span className="muted small">{formatDay(s.done_on)}</span>
                {s.user_id === me && (
                  <button type="button" className="link small" onClick={() => remove(s.id)}>supprimer</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {sessions.length > shown && (
        <button type="button" className="btn ghost" onClick={() => setShown(shown + PAGE)}>Voir plus de séances</button>
      )}
    </section>
  )
}
