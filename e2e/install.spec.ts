import { expect, test } from '@playwright/test'
import { ALICE, login } from './helpers'

test.use({
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1',
})

test("sur iPhone, l'accueil explique comment installer l'app, « Plus tard » la range dans le profil", async ({ page }) => {
  await login(page, ALICE)
  const card = page.getByRole('region', { name: "Installer l'app" })
  await expect(card).toContainText("Sur l'écran d'accueil")
  await page.screenshot({ path: 'test-results/install-home.png' })

  await card.getByRole('button', { name: 'Plus tard' }).click()
  await expect(card).toBeHidden()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Tes défis' })).toBeVisible()
  await expect(card).toBeHidden()

  await page.getByRole('link', { name: 'Profil' }).click()
  await expect(page.getByRole('region', { name: "Installer l'app" })).toBeVisible()
})
