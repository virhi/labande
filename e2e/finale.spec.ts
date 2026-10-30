import { expect, test, type Page } from '@playwright/test'
import { ALICE, BOB, createAndJoin, inDays, login } from './helpers'

// Petite image PNG (8 × 8 px orange) pour la preuve.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEUlEQVR4nGM45MiDFTEMLQkAps5DwRGu074AAAAASUVORK5CYII=',
  'base64',
)

// Le défi finit demain : l'appli (en mode test) se croit au lendemain pour arriver au jour J.
// L'horloge réelle ne bouge pas, sinon la session Supabase paraîtrait expirée.
async function tomorrow(page: Page) {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(12, 0, 0, 0)
  await page.addInitScript((t) => window.localStorage.setItem('labande.now', t), d.toISOString())
}

test('jour J : preuve avec photo, vote de la bande et historique', async ({ browser }) => {
  const name = `Défi final ${Date.now()}`
  const alice = await (await browser.newContext()).newPage()
  const bob = await (await browser.newContext()).newPage()
  await login(alice, ALICE)
  await login(bob, BOB)
  const url = await createAndJoin(alice, bob, name, inDays(1))

  // Avant le jour J, pas de preuve ni de vote.
  await expect(bob.getByRole('heading', { name: 'Fin du défi' })).toHaveCount(0)

  await tomorrow(alice)
  await tomorrow(bob)
  await alice.goto(url)
  await expect(alice.getByRole('heading', { name: 'Fin du défi' })).toBeVisible()
  await expect(alice.getByRole('button', { name: "J'ai fait une séance" })).toBeVisible()

  // Alice envoie sa preuve, avec un mot et une photo.
  await alice.getByLabel('Ce que tu as fait').fill('Semi bouclé en 1h48')
  await alice.getByLabel('Photo (facultatif)').setInputFiles({ name: 'preuve.png', mimeType: 'image/png', buffer: PNG })
  await alice.getByRole('button', { name: 'Envoyer ma preuve' }).click()
  await expect(alice.getByRole('img', { name: 'Ta photo de preuve' })).toBeVisible()
  await expect(alice.getByText('« Semi bouclé en 1h48 »')).toBeVisible()

  // Bob voit la preuve et vote.
  await bob.goto(url)
  const proof = bob.getByRole('article', { name: 'Preuve de Alice' })
  await expect(proof.getByText('« Semi bouclé en 1h48 »')).toBeVisible()
  await expect(proof.getByRole('img', { name: 'Photo de preuve de Alice' })).toBeVisible()
  await expect.poll(() => proof.getByRole('img').evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0)
  await expect(bob.getByRole('article', { name: 'Preuve de Alice' }).getByText('Pas encore de preuve')).toHaveCount(0)

  await proof.getByRole('button', { name: 'Réussi' }).click()
  const summary = bob.locator('li', { hasText: 'Alice' }).filter({ has: bob.locator('.badge') })
  await expect(summary.getByText('Réussi')).toBeVisible()

  // Il change d'avis.
  await proof.getByRole('button', { name: 'changer' }).click()
  await proof.getByRole('button', { name: 'Raté' }).click()
  await expect(proof.getByText('Ton vote : raté.')).toBeVisible()
  await expect(summary.getByText('Raté', { exact: true })).toBeVisible()

  // Bob n'a pas de preuve : Alice le voit.
  await alice.reload()
  await expect(alice.getByRole('article', { name: 'Preuve de Bob' }).getByText('Pas encore de preuve.')).toBeVisible()

  // L'historique d'Alice reprend le défi et son résultat.
  await alice.goto('/historique')
  await expect(alice.getByRole('heading', { name: 'Tes stats' })).toBeVisible()
  const row = alice.getByRole('link', { name: new RegExp(name) })
  await expect(row.getByText('Raté', { exact: true })).toBeVisible()
})
