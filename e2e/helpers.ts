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
