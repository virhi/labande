import { useState, type FormEvent } from 'react'
import { ErrorText } from './ui'

export type ChallengeValues = { name: string; endDate: string; stake: string }

function tomorrow(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toLocaleDateString('sv-SE') // AAAA-MM-JJ en heure locale
}

// Formulaire commun à la création et à la modification d'un défi.
export default function ChallengeForm({ initial, submitLabel, busyLabel, onSubmit }: {
  initial?: ChallengeValues
  submitLabel: string
  busyLabel: string
  onSubmit: (values: ChallengeValues) => Promise<string | null>
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [endDate, setEndDate] = useState(initial?.endDate ?? '')
  const [stake, setStake] = useState(initial?.stake ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const failure = await onSubmit({ name, endDate, stake })
    setBusy(false)
    if (failure) setError(failure)
  }

  // On peut garder la date d'origine, mais une nouvelle date doit être dans le futur.
  const minDate = initial && endDate === initial.endDate ? undefined : tomorrow()

  return (
    <form className="stack" onSubmit={submit}>
      <div className="field">
        <label htmlFor="nom">Nom du défi</label>
        <input id="nom" required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="Défi du printemps" />
      </div>
      <div className="field">
        <label htmlFor="date">Date de fin</label>
        <input id="date" type="date" required min={minDate} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="enjeu">Enjeu (facultatif)</label>
        <input id="enjeu" maxLength={200} value={stake} onChange={(e) => setStake(e.target.value)} placeholder="Les perdants paient le resto" />
      </div>
      <p className="note">À la date de fin, chacun envoie une preuve et le groupe vote. Le résultat se fait à la majorité.</p>
      <ErrorText>{error}</ErrorText>
      <button type="submit" className="btn primary" disabled={busy}>
        {busy ? busyLabel : submitLabel}
      </button>
    </form>
  )
}
