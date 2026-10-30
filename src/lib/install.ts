import { useSyncExternalStore } from 'react'

// Installation sur l'écran d'accueil.
// Android/Chrome propose une fenêtre d'installation qu'on déclenche nous-mêmes ;
// iOS n'en a pas : il faut passer par Partager › Sur l'écran d'accueil.
type InstallPrompt = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

export type InstallMode = 'installed' | 'prompt' | 'ios' | 'none'

let deferred: InstallPrompt | null = null
let installed = false
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())

// Écouté dès le chargement du module : l'événement peut arriver avant l'affichage de la page.
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferred = e as InstallPrompt
  notify()
})
window.addEventListener('appinstalled', () => {
  deferred = null
  installed = true
  notify()
})

export function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
}

// L'iPad se présente comme un Mac, on le reconnaît à l'écran tactile.
export function isIos(ua = navigator.userAgent, touchPoints = navigator.maxTouchPoints) {
  return /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && touchPoints > 1)
}

export function installMode(): InstallMode {
  if (installed || isStandalone()) return 'installed'
  if (deferred) return 'prompt'
  if (isIos()) return 'ios'
  return 'none'
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useInstallMode() {
  return useSyncExternalStore(subscribe, installMode)
}

export async function promptInstall() {
  if (!deferred) return
  const event = deferred
  deferred = null
  await event.prompt()
  const { outcome } = await event.userChoice
  if (outcome === 'accepted') installed = true
  notify()
}
