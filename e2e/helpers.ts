import { expect, type Page } from '@playwright/test'

export const ALICE = { name: 'Alice', email: 'alice@labande.test' }
export const BOB = { name: 'Bob', email: 'bob@labande.test' }

export function password(): string {
  const pw = process.env.E2E_PASSWORD
  if (!pw) throw new Error('E2E_PASSWORD manquant : voir .env.test.local et le README.')
  return pw
}

export async function fillLogin(page: Page, email: string, pw = password()) {
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Mot de passe').fill(pw)
  await page.getByRole('button', { name: 'Se connecter' }).click()
}

export async function login(page: Page, user: { email: string }) {
  await page.goto('/')
  await fillLogin(page, user.email)
  await expect(page.getByRole('heading', { name: 'Tes défis' })).toBeVisible()
}

export async function writeGoal(page: Page, title: string, target = '', unit = '') {
  const card = page.locator('section', { has: page.getByRole('heading', { name: 'Ton objectif' }) })
  await card.getByLabel('Objectif').fill(title)
  if (target) await card.getByLabel('Valeur cible').fill(target)
  if (unit) await card.getByLabel('Unité').fill(unit)
  await card.getByRole('button', { name: /Enregistrer mon objectif|Proposer cette version/ }).click()
  await expect(card.getByText(title)).toBeVisible()
}

// La carte de l'objectif d'un autre membre.
export function memberCard(page: Page, name: string) {
  return page.locator('article', { has: page.getByText(name, { exact: true }) })
}

export function inDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toLocaleDateString('sv-SE')
}

// Alice crée un défi, Bob le rejoint ; renvoie l'adresse du défi.
export async function createAndJoin(alice: Page, bob: Page, name: string, endDate: string): Promise<string> {
  await alice.getByRole('link', { name: 'Créer un défi' }).click()
  await alice.getByLabel('Nom du défi').fill(name)
  await alice.getByLabel('Date de fin').fill(endDate)
  await alice.getByRole('button', { name: 'Créer le défi' }).click()
  await expect(alice.getByRole('heading', { name })).toBeVisible()
  const url = alice.url()
  const invite = (await alice.locator('.invite-url').textContent())!.trim()
  await bob.goto(invite)
  await bob.getByRole('button', { name: 'Rejoindre la bande' }).click()
  await expect(bob).toHaveURL(url)
  await expect(bob.getByText('2 dans la bande')).toBeVisible()
  return url
}
