import { expect, test } from '@playwright/test'
import { ALICE, fillLogin, login } from './helpers'

test('un mauvais mot de passe est refusé', async ({ page }) => {
  await page.goto('/')
  await fillLogin(page, ALICE.email, 'pas-le-bon-mot-de-passe')
  await expect(page.getByRole('alert')).toHaveText('Email ou mot de passe incorrect.')
})

test('connexion, session conservée, puis déconnexion', async ({ page }) => {
  await login(page, ALICE)
  await expect(page.getByText('Tu apparais comme')).toContainText('Alice')

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Tes défis' })).toBeVisible()

  await page.getByRole('button', { name: 'Se déconnecter' }).click()
  await expect(page.getByRole('tab', { name: 'Se connecter' })).toBeVisible()
})

test('l’inscription refuse deux mots de passe différents', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: 'Créer un compte' }).click()
  await page.getByLabel('Prénom ou pseudo').fill('Test')
  await page.getByLabel('Email').fill('nouveau@labande.test')
  await page.getByLabel('Mot de passe', { exact: true }).fill('motdepasse1')
  await page.getByLabel('Confirme le mot de passe').fill('motdepasse2')
  await page.getByRole('button', { name: 'Créer mon compte' }).click()
  await expect(page.getByRole('alert')).toHaveText('Les deux mots de passe ne sont pas identiques.')
})

test('un lien d’invitation sans être connecté demande de se connecter', async ({ page }) => {
  await page.goto('/rejoindre/code-inconnu')
  await expect(page.getByText('Un ami t’invite à un défi. Connecte-toi pour le rejoindre.')).toBeVisible()
})
