import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { errorMessage } from '../lib/format'
import { BackLink, Screen } from '../components/ui'
import ChallengeForm from '../components/ChallengeForm'

export default function NewChallenge() {
  const navigate = useNavigate()

  return (
    <Screen>
      <div className="row gap">
        <BackLink to="/" />
        <p className="eyebrow">Étape 1 sur 2</p>
      </div>
      <h1>Nouveau défi</h1>
      <p className="lead">Fixe une date commune. Chacun choisira ensuite son propre objectif.</p>

      <ChallengeForm
        submitLabel="Créer le défi"
        busyLabel="Création…"
        onSubmit={async ({ name, endDate, stake }) => {
          const { data, error } = await supabase.rpc('create_challenge', { p_name: name, p_end_date: endDate, p_stake: stake })
          if (error || !data) return errorMessage(error)
          navigate(`/defi/${data}`, { replace: true })
          return null
        }}
      />
    </Screen>
  )
}
