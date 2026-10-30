import { expect, test } from '@playwright/test'
import { ALICE, fillLogin, login } from './helpers'

test('un mauvais mot de passe est refusé', async ({ page }) => {
  await page.goto('/')
  await fillLogin(page, ALICE.email, 'pas-le-bon-mot-de-passe')
  await expect(page.getByRole('alert')).toHaveText('Email ou mot de passe incorrect.')
})

test('connexion, session conservée, puis déconnexion', async ({ page }) => {
  await login(page, ALICE)
  await expect(page.getByText('Salut Alice')).toBeVisible()

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Tes défis' })).toBeVisible()

  // La déconnexion est dans l'onglet Profil.
  const nav = page.getByRole('navigation', { name: 'Navigation principale' })
  await nav.getByRole('link', { name: 'Profil' }).click()
  await expect(page.getByRole('heading', { name: 'Profil' })).toBeVisible()
  await expect(page.getByText('alice@labande.test')).toBeVisible()
  await nav.getByRole('link', { name: 'Historique' }).click()
  await expect(page.getByRole('heading', { name: 'Tes stats' })).toBeVisible()
  await nav.getByRole('link', { name: 'Profil' }).click()
  await page.getByRole('button', { name: 'Se déconnecter' }).click()
  await expect(page.getByRole('tab', { name: 'Se connecter' })).toBeVisible()
})

test('le profil change le pseudo et mène au mot de passe', async ({ page }) => {
  await login(page, ALICE)
  await page.goto('/profil')
  await page.getByRole('button', { name: 'Changer mon pseudo' }).click()
  await page.getByLabel('Ton prénom ou pseudo').fill('Alice B')
  await page.getByRole('button', { name: 'Enregistrer' }).click()
  await expect(page.getByText('Alice B', { exact: true })).toBeVisible()
  // On remet le pseudo d'origine pour les autres tests.
  await page.getByRole('button', { name: 'Changer mon pseudo' }).click()
  await page.getByLabel('Ton prénom ou pseudo').fill('Alice')
  await page.getByRole('button', { name: 'Enregistrer' }).click()
  await expect(page.getByText('Alice', { exact: true })).toBeVisible()

  await page.getByRole('link', { name: 'Mot de passe' }).click()
  await expect(page.getByRole('heading', { name: 'Changer de mot de passe' })).toBeVisible()
})

test('l’inscription refuse deux mots de passe différents', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: 'Créer un compte' }).click()
  await page.getByLabel('Prénom ou pseudo').fill('Test')
  await page.getByLabel('Email').fill('nouveau@labande.test')
  await page.getByLabel('Mot de passe', { exact: true }).fill('Sprint2026Fort')
  await page.getByLabel('Confirme le mot de passe').fill('Sprint2026Faux')
  await page.getByRole('button', { name: 'Créer mon compte' }).click()
  await expect(page.getByRole('alert')).toHaveText('Les deux mots de passe ne sont pas identiques.')
})

test('un lien d’invitation sans être connecté demande de se connecter', async ({ page }) => {
  await page.goto('/rejoindre/code-inconnu')
  await expect(page.getByText('Un ami t’invite à un défi. Connecte-toi pour le rejoindre.')).toBeVisible()
})
