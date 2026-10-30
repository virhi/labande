import { expect, test } from '@playwright/test'
import { ALICE, BOB, fillLogin, inviteLink, login, memberCard, writeGoal } from './helpers'

function inDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toLocaleDateString('sv-SE')
}

test('créer un défi, inviter, se mettre d’accord sur les objectifs', async ({ browser }) => {
  const name = `Défi e2e ${Date.now()}`
  const alice = await (await browser.newContext()).newPage()
  const bob = await (await browser.newContext()).newPage()

  // Alice crée le défi et écrit son objectif.
  await login(alice, ALICE)
  await alice.getByRole('link', { name: 'Créer un défi' }).click()
  await alice.getByLabel('Nom du défi').fill(name)
  await alice.getByLabel('Date de fin').fill(inDays(60))
  await alice.getByLabel('Enjeu (facultatif)').fill('Les perdants paient le resto')
  await alice.getByRole('button', { name: 'Créer le défi' }).click()

  await expect(alice.getByRole('heading', { name })).toBeVisible()
  await expect(alice.getByText('J-60', { exact: true })).toBeVisible()
  await expect(alice.getByText('Invite au moins un ami pour lancer le défi.')).toBeVisible()
  // Le QR code n'est plus affiché dans la page : il s'ouvre dans un panneau.
  await expect(alice.getByRole('img', { name: "QR code d'invitation au défi" })).toHaveCount(0)
  await alice.getByRole('button', { name: 'Montrer le QR code' }).click()
  await expect(alice.getByRole('dialog', { name: 'Invite ta bande' }).getByRole('img', { name: "QR code d'invitation au défi" })).toBeVisible()
  await alice.keyboard.press('Escape')
  await writeGoal(alice, 'Courir un semi en moins de 1h50', '1h50', 'temps')

  const inviteUrl = await inviteLink(alice)
  expect(inviteUrl).toMatch(/\/rejoindre\/[0-9a-f]{10}$/)

  // Bob ouvre l'invitation sans être connecté, se connecte et revient sur l'invitation.
  await bob.goto(inviteUrl)
  await expect(bob.getByText('Un ami t’invite à un défi. Connecte-toi pour le rejoindre.')).toBeVisible()
  await fillLogin(bob, BOB.email)
  await expect(bob.getByText("Alice t'invite")).toBeVisible()
  await expect(bob.getByRole('heading', { name })).toBeVisible()
  await bob.getByRole('button', { name: 'Rejoindre la bande' }).click()

  // Bob écrit son objectif et trouve celui d'Alice trop facile.
  await expect(bob.getByText('2 dans la bande')).toBeVisible()
  await writeGoal(bob, '50 tractions d’affilée', '50', 'tractions')
  const aliceCard = memberCard(bob, 'Alice')
  await expect(aliceCard.getByText('Courir un semi en moins de 1h50')).toBeVisible()
  await aliceCard.getByRole('button', { name: 'Trop facile !' }).click()
  await aliceCard.getByLabel('Un mot pour Alice (facultatif)').fill('Vise 1h45 !')
  await aliceCard.getByRole('button', { name: 'Envoyer' }).click()
  await expect(aliceCard.getByText('Remarque envoyée : Alice va proposer une nouvelle version.')).toBeVisible()

  // Alice voit la remarque et propose une nouvelle version : la remarque disparaît.
  await alice.reload()
  await expect(alice.getByText('Bob trouve ton objectif trop facile')).toBeVisible()
  await expect(alice.getByText('« Vise 1h45 ! »')).toBeVisible()
  await alice.getByRole('button', { name: 'Proposer une nouvelle version' }).click()
  await writeGoal(alice, 'Courir un semi en moins de 1h45', '1h45', 'temps')
  await expect(alice.getByText('Bob trouve ton objectif trop facile')).toBeHidden()

  // Chacun valide l'objectif de l'autre : le défi est lancé.
  await memberCard(alice, 'Bob').getByRole('button', { name: 'Valider' }).click()
  await expect(alice.getByText('En attente : 1 à valider.')).toBeVisible()

  await bob.reload()
  await memberCard(bob, 'Alice').getByRole('button', { name: 'Valider' }).click()
  await expect(bob.getByText('Tous les objectifs sont validés : le défi est lancé !')).toBeVisible()

  await alice.reload()
  await expect(alice.getByText('Tous les objectifs sont validés : le défi est lancé !')).toBeVisible()
  // Une fois le défi lancé, la page s'ouvre sur la semaine : les objectifs sont dans leur onglet.
  await alice.getByRole('tab', { name: 'Objectifs' }).click()
  await expect(memberCard(alice, 'Bob').getByText('Validé par toute la bande')).toBeVisible()

  // Le défi apparaît dans la liste de Bob.
  await bob.goto('/')
  await expect(bob.getByRole('link', { name: new RegExp(name) })).toBeVisible()
})
