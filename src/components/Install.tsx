import { useState } from 'react'
import { promptInstall, useInstallMode } from '../lib/install'

const DISMISS_KEY = 'labande.install-dismissed'

function readDismissed() {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

const ShareIcon = () => (
  <svg className="inline-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3v12M8 7l4-4 4 4M6 11H5v10h14V11h-1" />
  </svg>
)

// dismissible : sur l'accueil, « Plus tard » masque la carte pour de bon.
export function InstallCard({ dismissible = false }: { dismissible?: boolean }) {
  const mode = useInstallMode()
  const [dismissed, setDismissed] = useState(() => dismissible && readDismissed())

  if (dismissed || mode === 'installed' || mode === 'none') return null

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // Pas de stockage : la carte reviendra à la prochaine visite.
    }
    setDismissed(true)
  }

  return (
    <section className="card install-card" aria-label="Installer l'app">
      <img src="/icon-192.png" alt="" width="44" height="44" />
      <div className="stack tight-gap grow">
        <strong>Installe La Bande sur ton téléphone</strong>
        {mode === 'prompt' ? (
          <span className="muted">Elle s'ouvre comme une vraie app, en un geste.</span>
        ) : (
          <span className="muted">
            Touche <ShareIcon /> Partager, puis « Sur l'écran d'accueil ».
          </span>
        )}
        {(mode === 'prompt' || dismissible) && (
          <div className="row gap">
            {mode === 'prompt' && (
              <button type="button" className="btn primary compact" onClick={promptInstall}>
                Installer
              </button>
            )}
            {dismissible && (
              <button type="button" className="btn ghost compact" onClick={dismiss}>
                Plus tard
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
