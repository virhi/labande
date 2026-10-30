import { existsSync } from 'node:fs'
import { defineConfig, devices } from '@playwright/test'

// Mot de passe des comptes Alice et Bob du projet Supabase de test (voir README).
if (existsSync('.env.test.local')) process.loadEnvFile('.env.test.local')

const PORT = 5174

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [['list'], ['github']] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: 'fr-FR',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'mobile', use: { ...devices['Pixel 7'] } }],
  webServer: {
    // --mode test : l'appli parle au projet Supabase de test (.env.test), jamais à la vraie base.
    command: `npx vite --mode test --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
  },
})
