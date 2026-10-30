import { expect, test } from '@playwright/test'
import { ALICE, BOB, login } from './helpers'

// Sur le projet de test, Alice est admin (private.admins) et Bob ne l'est pas : voir le README.
test('les stats de La Bande ne sont visibles que par un admin', async ({ browser }) => {
  const alice = await (await browser.newContext()).newPage()
  const bob = await (await browser.newContext()).newPage()
  await login(alice, ALICE)
  await login(bob, BOB)

  await alice.goto('/profil')
  await alice.getByRole('link', { name: 'Stats de La Bande' }).click()
  await expect(alice.getByRole('heading', { name: 'Stats de La Bande' })).toBeVisible()
  await expect(alice.getByText('membres par défi')).toBeVisible()
  await expect(alice.getByRole('region', { name: 'Semaine par semaine' }).getByRole('listitem')).toHaveCount(8)
  await alice.screenshot({ path: 'test-results/admin-stats.png', fullPage: true })

  // Bob n'a pas le lien, et l'adresse tapée à la main ne lui montre rien.
  await bob.goto('/profil')
  await expect(bob.getByRole('link', { name: 'Mot de passe' })).toBeVisible()
  await expect(bob.getByRole('link', { name: 'Stats de La Bande' })).toHaveCount(0)
  await bob.goto('/stats-admin')
  await expect(bob.getByText('Accès réservé.')).toBeVisible()
  await expect(bob.getByText('membres par défi')).toHaveCount(0)
})
