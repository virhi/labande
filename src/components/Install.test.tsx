import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { isIos } from '../lib/install'
import { InstallCard } from './Install'

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'
const ANDROID = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36'
const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15'

function fakePrompt(outcome: 'accepted' | 'dismissed') {
  const event = new Event('beforeinstallprompt') as Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }
  event.prompt = vi.fn().mockResolvedValue(undefined)
  event.userChoice = Promise.resolve({ outcome })
  return event
}

describe('isIos', () => {
  it("reconnaît l'iPhone et l'iPad, pas Android ni le Mac", () => {
    expect(isIos(IPHONE, 5)).toBe(true)
    expect(isIos(MAC, 5)).toBe(true) // iPad récent : se dit Mac mais tactile
    expect(isIos(MAC, 0)).toBe(false)
    expect(isIos(ANDROID, 5)).toBe(false)
  })
})

describe('InstallCard', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.restoreAllMocks())

  it("n'apparaît pas quand le navigateur ne sait pas installer", () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(ANDROID)
    render(<InstallCard dismissible />)
    expect(screen.queryByRole('region', { name: "Installer l'app" })).not.toBeInTheDocument()
  })

  it("explique la marche à suivre sur iPhone et se masque avec « Plus tard »", async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(IPHONE)
    const { unmount } = render(<InstallCard dismissible />)
    expect(screen.getByText(/Sur l'écran d'accueil/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Plus tard' }))
    expect(screen.queryByRole('region', { name: "Installer l'app" })).not.toBeInTheDocument()

    unmount()
    render(<InstallCard dismissible />)
    expect(screen.queryByRole('region', { name: "Installer l'app" })).not.toBeInTheDocument()
  })

  it("sur le profil, reste affichée même après « Plus tard »", () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(IPHONE)
    localStorage.setItem('labande.install-dismissed', '1')
    render(<InstallCard />)
    expect(screen.getByRole('region', { name: "Installer l'app" })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Plus tard' })).not.toBeInTheDocument()
  })

  it("ouvre la fenêtre d'installation du navigateur, puis disparaît une fois installée", async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(ANDROID)
    render(<InstallCard dismissible />)
    const event = fakePrompt('accepted')
    act(() => {
      window.dispatchEvent(event)
    })
    await userEvent.click(screen.getByRole('button', { name: 'Installer' }))
    expect(event.prompt).toHaveBeenCalled()
    expect(screen.queryByRole('region', { name: "Installer l'app" })).not.toBeInTheDocument()
  })
})
