import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { errorMessage } from '../lib/format'
import { BackLink, ErrorText, Screen } from '../components/ui'

function tomorrow(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toLocaleDateString('sv-SE') // AAAA-MM-JJ en heure locale
}

export default function NewChallenge() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [endDate, setEndDate] = useState('')
  const [stake, setStake] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { data, error } = await supabase.rpc('create_challenge', { p_name: name, p_end_date: endDate, p_stake: stake })
    setBusy(false)
    if (error || !data) return setError(errorMessage(error))
    navigate(`/defi/${data}`, { replace: true })
  }

  return (
    <Screen>
      <div className="row gap">
        <BackLink to="/" />
        <p className="eyebrow">Étape 1 sur 2</p>
      </div>
      <h1>Nouveau défi</h1>
      <p className="lead">Fixe une date commune. Chacun choisira ensuite son propre objectif.</p>

      <form className="stack" onSubmit={submit}>
        <div className="field">
          <label htmlFor="nom">Nom du défi</label>
          <input id="nom" required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="Défi du printemps" />
        </div>
        <div className="field">
          <label htmlFor="date">Date de fin</label>
          <input id="date" type="date" required min={tomorrow()} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="enjeu">Enjeu (facultatif)</label>
          <input id="enjeu" maxLength={200} value={stake} onChange={(e) => setStake(e.target.value)} placeholder="Les perdants paient le resto" />
        </div>
        <p className="note">À la date de fin, chacun envoie une preuve et le groupe vote. Le résultat se fait à la majorité.</p>
        <ErrorText>{error}</ErrorText>
        <button type="submit" className="btn primary" disabled={busy}>
          {busy ? 'Création…' : 'Créer le défi'}
        </button>
      </form>
    </Screen>
  )
}
