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
  await alice.getByRole('tab', { name: 'Séances' }).click()
  await expect(alice.getByText('Aucune séance pour l\'instant', { exact: false })).toBeVisible()

  // Le bouton fixe ouvre le panneau de saisie.
  await alice.getByRole('button', { name: "J'ai fait une séance" }).click()
  const form = alice.getByRole('dialog', { name: 'Nouvelle séance' })
  await form.getByLabel('Durée (min)').fill('45')
  await form.getByLabel('Activité').fill('Course')
  await form.getByLabel('Un mot (facultatif)').fill('Fractionné')
  await form.getByRole('button', { name: 'Enregistrer la séance' }).click()
  await expect(form).toHaveCount(0)

  const list = alice.getByRole('region', { name: 'Les séances' })
  await expect(list.getByRole('heading', { name: 'aujourd’hui' })).toBeVisible()
  await expect(list.getByText('Course · 45 min')).toBeVisible()
  await expect(list.getByText('« Fractionné »')).toBeVisible()

  await alice.getByRole('tab', { name: 'Semaine' }).click()
  await expect(alice.getByRole('listitem', { name: 'Alice : 1 séance cette semaine' })).toBeVisible()
  await expect(alice.getByRole('listitem', { name: 'Bob : 0 séance cette semaine' })).toBeVisible()

  // Bob voit la nouveauté sur l'accueil, puis dans le défi.
  await bob.reload()
  const card = bob.getByRole('link', { name: new RegExp(name) })
  await expect(card.getByText('1 nouvelle séance')).toBeVisible()
  await card.click()
  await expect(bob).toHaveURL(url)
  await bob.getByRole('tab', { name: 'Séances' }).click()
  await expect(bob.getByText('nouveau', { exact: true })).toBeVisible()
  await expect(bob.getByRole('button', { name: 'supprimer' })).toHaveCount(0)
  await bob.goto('/')
  await expect(bob.getByRole('link', { name: new RegExp(name) }).getByText('nouvelle séance')).toHaveCount(0)

  // Alice supprime sa séance.
  await alice.getByRole('tab', { name: 'Séances' }).click()
  alice.once('dialog', (d) => d.accept())
  await list.getByRole('button', { name: 'supprimer' }).click()
  await expect(alice.getByText('Aucune séance pour l\'instant', { exact: false })).toBeVisible()
})

test('le panneau d’invitation s’ouvre depuis l’en-tête et se ferme', async ({ browser }) => {
  const alice = await (await browser.newContext()).newPage()
  const bob = await (await browser.newContext()).newPage()
  await login(alice, ALICE)
  await login(bob, BOB)
  await createAndJoin(alice, bob, `Défi invitation ${Date.now()}`, inDays(20))

  await bob.getByRole('button', { name: 'Inviter' }).click()
  const sheet = bob.getByRole('dialog', { name: 'Invite ta bande' })
  await expect(sheet.getByRole('img', { name: "QR code d'invitation au défi" })).toBeVisible()
  await bob.keyboard.press('Escape')
  await expect(sheet).toHaveCount(0)
})
