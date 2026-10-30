import { expect, test } from '@playwright/test'
import { ALICE, BOB, createAndJoin, inDays, inviteLink, login, memberCard, writeGoal } from './helpers'

test('le créateur modifie puis supprime son défi, les autres ne peuvent pas', async ({ browser }) => {
  const name = `Défi à gérer ${Date.now()}`
  const renamed = `${name} (modifié)`
  const alice = await (await browser.newContext()).newPage()
  const bob = await (await browser.newContext()).newPage()

  await login(alice, ALICE)
  await alice.getByRole('link', { name: 'Créer un défi' }).click()
  await alice.getByLabel('Nom du défi').fill(name)
  await alice.getByLabel('Date de fin').fill(inDays(30))
  await alice.getByRole('button', { name: 'Créer le défi' }).click()
  await expect(alice.getByRole('heading', { name })).toBeVisible()
  const challengeUrl = alice.url()
  const inviteUrl = await inviteLink(alice)

  // Bob rejoint : il ne voit pas « Modifier » et ne peut pas ouvrir la page de modification.
  await login(bob, BOB)
  await bob.goto(inviteUrl)
  await bob.getByRole('button', { name: 'Rejoindre la bande' }).click()
  await expect(bob).toHaveURL(challengeUrl)
  await expect(bob.getByText('2 dans la bande')).toBeVisible()
  await expect(bob.getByRole('link', { name: 'Modifier' })).toHaveCount(0)
  await bob.goto(`${challengeUrl}/modifier`)
  await expect(bob).toHaveURL(challengeUrl)

  // Alice modifie le nom, la date et l'enjeu.
  await alice.getByRole('link', { name: 'Modifier' }).click()
  await expect(alice.getByLabel('Nom du défi')).toHaveValue(name)
  await alice.getByLabel('Nom du défi').fill(renamed)
  await alice.getByLabel('Date de fin').fill(inDays(45))
  await alice.getByLabel('Enjeu (facultatif)').fill('Le perdant fait le ménage')
  await alice.getByRole('button', { name: 'Enregistrer les modifications' }).click()
  await expect(alice).toHaveURL(challengeUrl)
  await expect(alice.getByRole('heading', { name: renamed })).toBeVisible()
  await expect(alice.getByText('J-45', { exact: true })).toBeVisible()
  await expect(alice.getByText('Enjeu : Le perdant fait le ménage')).toBeVisible()

  await bob.reload()
  await expect(bob.getByRole('heading', { name: renamed })).toBeVisible()

  // Alice supprime le défi, avec une confirmation.
  await alice.getByRole('link', { name: 'Modifier' }).click()
  await expect(alice.getByText('Le défi disparaîtra aussi pour l’autre membre')).toBeVisible()
  await alice.getByRole('button', { name: 'Supprimer le défi' }).click()
  await alice.getByRole('button', { name: 'Oui, supprimer' }).click()
  await expect(alice.getByRole('heading', { name: 'Tes défis' })).toBeVisible()
  await expect(alice.getByRole('link', { name: new RegExp(renamed) })).toHaveCount(0)

  // Le défi a disparu pour Bob aussi.
  await bob.reload()
  await expect(bob.getByRole('alert')).toHaveText("Ce défi n'existe plus, ou tu n'en fais pas partie.")
  await bob.goto('/')
  await expect(bob.getByRole('heading', { name: 'Tes défis' })).toBeVisible()
  await expect(bob.getByRole('link', { name: new RegExp(renamed) })).toHaveCount(0)
})

test('un membre quitte le défi, le créateur ne peut pas', async ({ browser }) => {
  const name = `Défi à quitter ${Date.now()}`
  const alice = await (await browser.newContext()).newPage()
  const bob = await (await browser.newContext()).newPage()
  await login(alice, ALICE)
  await login(bob, BOB)
  const url = await createAndJoin(alice, bob, name, inDays(20))
  await writeGoal(bob, 'Objectif de Bob')

  await alice.reload()
  await expect(alice.getByRole('button', { name: 'Quitter le défi' })).toHaveCount(0)
  await expect(memberCard(alice, 'Bob').getByText('Objectif de Bob')).toBeVisible()

  await bob.getByRole('button', { name: 'Quitter le défi' }).click()
  await bob.getByRole('button', { name: 'Oui, quitter' }).click()
  await expect(bob.getByRole('heading', { name: 'Tes défis' })).toBeVisible()
  await expect(bob.getByRole('link', { name: new RegExp(name) })).toHaveCount(0)
  await bob.goto(url)
  await expect(bob.getByRole('alert')).toHaveText("Ce défi n'existe plus, ou tu n'en fais pas partie.")

  // Bob et son objectif ont disparu pour Alice.
  await alice.reload()
  await expect(alice.getByText('1 dans la bande')).toBeVisible()
  await expect(memberCard(alice, 'Bob')).toHaveCount(0)
})

test('le créateur retire un membre depuis « Modifier le défi »', async ({ browser }) => {
  const name = `Défi à trier ${Date.now()}`
  const alice = await (await browser.newContext()).newPage()
  const bob = await (await browser.newContext()).newPage()
  await login(alice, ALICE)
  await login(bob, BOB)
  const url = await createAndJoin(alice, bob, name, inDays(20))
  await writeGoal(bob, 'Objectif de Bob')

  await alice.reload()
  await alice.getByRole('link', { name: 'Modifier le défi' }).click()
  const members = alice.getByRole('region', { name: 'Membres' })
  await expect(members.getByText('Créateur')).toBeVisible()
  await members.getByRole('button', { name: 'Retirer Bob' }).click()
  await alice.screenshot({ path: 'test-results/remove-member.png' })
  await members.getByRole('button', { name: 'Oui, retirer' }).click()
  // Seule dans la bande : la liste des membres n'a plus lieu d'être.
  await expect(members).toHaveCount(0)

  await alice.goto(url)
  await expect(alice.getByText('1 dans la bande')).toBeVisible()
  await expect(memberCard(alice, 'Bob')).toHaveCount(0)
  await bob.goto(url)
  await expect(bob.getByRole('alert')).toHaveText("Ce défi n'existe plus, ou tu n'en fais pas partie.")
})
