import { expect, test, type Page } from '@playwright/test'
import { ALICE, BOB, createAndJoin, inDays, login } from './helpers'

// L'appli (en mode test) se croit au lendemain : le défi qui finit demain arrive au jour J.
async function tomorrow(page: Page) {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(12, 0, 0, 0)
  await page.addInitScript((t) => window.localStorage.setItem('labande.now', t), d.toISOString())
}

test('objectif chiffré : les séances font avancer la barre, la bande dit bravo', async ({ browser }) => {
  const alice = await (await browser.newContext()).newPage()
  const bob = await (await browser.newContext()).newPage()
  await login(alice, ALICE)
  await login(bob, BOB)
  const url = await createAndJoin(alice, bob, `Défi km ${Date.now()}`, inDays(30))

  await alice.reload()
  const goal = alice.locator('section', { has: alice.getByRole('heading', { name: 'Ton objectif' }) })
  await goal.getByLabel('Objectif', { exact: true }).fill('Rouler 100 km')
  await goal.getByLabel('Valeur cible').fill('100')
  await goal.getByLabel('Unité').fill('km')
  await goal.getByLabel('Additionner mes séances').check()
  await goal.getByRole('button', { name: 'Enregistrer mon objectif' }).click()
  await expect(goal.getByRole('progressbar', { name: 'Ta progression' })).toHaveAttribute('aria-valuenow', '0')

  await alice.getByRole('button', { name: "J'ai fait une séance" }).click()
  const form = alice.getByRole('dialog', { name: 'Nouvelle séance' })
  await form.getByLabel('Quantité (km)').fill('12,5')
  await form.getByLabel('Activité').fill('Vélo')
  await form.getByRole('button', { name: 'Enregistrer la séance' }).click()
  await expect(form).toHaveCount(0)
  await expect(alice.getByRole('region', { name: 'Les séances' }).getByText('Vélo · 12,5 km')).toBeVisible()

  // Bob voit la progression d'Alice et la félicite.
  await bob.goto(url)
  await bob.getByRole('tab', { name: 'Objectifs' }).click()
  await expect(bob.getByRole('progressbar', { name: 'Progression de Alice' })).toHaveAttribute('aria-valuenow', '13')
  await bob.getByRole('tab', { name: 'Séances' }).click()
  const cheer = bob.getByRole('button', { name: /Bravo à Alice/ })
  await cheer.click()
  await expect(cheer).toHaveAttribute('aria-pressed', 'true')

  await alice.reload()
  await alice.getByRole('tab', { name: 'Séances' }).click()
  await expect(alice.getByText('👏 Bob')).toBeVisible()
  await expect(alice.getByRole('button', { name: /Bravo à/ })).toHaveCount(0)
  await alice.screenshot({ path: 'test-results/band-sessions.png' })
})

test('rejouer avec la même bande, puis retrouver l’historique', async ({ browser }) => {
  const name = `Défi saison ${Date.now()}`
  const alice = await (await browser.newContext()).newPage()
  const bob = await (await browser.newContext()).newPage()
  await login(alice, ALICE)
  await login(bob, BOB)
  const url = await createAndJoin(alice, bob, name, inDays(1))

  // Avant le jour J, pas de revanche possible.
  await alice.reload()
  await expect(alice.getByRole('region', { name: 'Rejouer avec la même bande' })).toHaveCount(0)

  await tomorrow(alice)
  await alice.goto(url)
  const replay = alice.getByRole('region', { name: 'Rejouer avec la même bande' })
  await replay.getByRole('button', { name: 'Rejouer' }).click()
  await expect(replay.getByLabel('Nom du défi')).toHaveValue(`${name} (revanche)`)
  await replay.getByLabel('Date de fin').fill(inDays(30))
  await replay.getByRole('button', { name: 'Lancer la revanche' }).click()

  await expect(alice.getByRole('heading', { name: `${name} (revanche)` })).toBeVisible()
  await expect(alice.getByText('2 dans la bande')).toBeVisible()
  const history = alice.getByRole('region', { name: "L'historique de la bande" })
  await expect(history.getByText(name, { exact: true })).toBeVisible()
  await expect(history.getByText('Bob : en attente')).toBeVisible()
  await alice.screenshot({ path: 'test-results/band-history.png', fullPage: true })

  // Bob est déjà dans la revanche, et l'ancien défi y mène.
  await bob.goto('/')
  await expect(bob.getByRole('link', { name: new RegExp(`${name} \\(revanche\\)`) })).toBeVisible()
  await tomorrow(bob)
  await bob.goto(url)
  await expect(bob.getByRole('link', { name: 'La revanche' })).toBeVisible()
})
