import { expect, test } from '@playwright/test'
import { ALICE, BOB, createAndJoin, inDays, login } from './helpers'

test('marquer une séance : récap de la semaine et nouveautés pour la bande', async ({ browser }) => {
  const name = `Défi séances ${Date.now()}`
  const alice = await (await browser.newContext()).newPage()
  const bob = await (await browser.newContext()).newPage()
  await login(alice, ALICE)
  await login(bob, BOB)
  const url = await createAndJoin(alice, bob, name, inDays(30))

  // Bob a vu le défi : il part sur l'accueil.
  await bob.goto('/')

  await alice.reload()
  await expect(alice.getByText('Aucune séance pour l\'instant', { exact: false })).toBeVisible()
  await alice.getByRole('button', { name: "J'ai fait une séance" }).click()
  const form = alice.getByRole('form', { name: 'Nouvelle séance' })
  await form.getByLabel('Durée (min)').fill('45')
  await form.getByLabel('Activité').fill('Course')
  await form.getByLabel('Un mot (facultatif)').fill('Fractionné')
  await form.getByRole('button', { name: 'Enregistrer la séance' }).click()

  const list = alice.locator('section', { has: alice.getByRole('heading', { name: 'Les séances' }) })
  await expect(list.getByText('Course · 45 min')).toBeVisible()
  await expect(list.getByText('« Fractionné »')).toBeVisible()
  await expect(alice.getByRole('listitem', { name: 'Alice : 1 séance cette semaine' })).toBeVisible()
  await expect(alice.getByRole('listitem', { name: 'Bob : 0 séance cette semaine' })).toBeVisible()

  // Bob voit la nouveauté sur l'accueil, puis dans le défi.
  await bob.reload()
  const card = bob.getByRole('link', { name: new RegExp(name) })
  await expect(card.getByText('1 nouvelle séance')).toBeVisible()
  await card.click()
  await expect(bob).toHaveURL(url)
  await expect(bob.getByText('nouveau', { exact: true })).toBeVisible()
  await expect(bob.getByRole('button', { name: 'supprimer' })).toHaveCount(0)
  await bob.goto('/')
  await expect(bob.getByRole('link', { name: new RegExp(name) }).getByText('nouvelle séance')).toHaveCount(0)

  // Alice supprime sa séance.
  alice.once('dialog', (d) => d.accept())
  await list.getByRole('button', { name: 'supprimer' }).click()
  await expect(alice.getByText('Aucune séance pour l\'instant', { exact: false })).toBeVisible()
})
