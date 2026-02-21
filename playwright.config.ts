import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, devices } from '@playwright/test'

// Optionale .env.e2e laden (Test-Accounts), siehe .env.e2e.example
const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = join(__dirname, '.env.e2e')
if (existsSync(envPath)) {
  const content = readFileSync(envPath, 'utf8')
  for (const line of content.split('\n')) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim()
  }
}

/**
 * Playwright-Konfiguration für E2E-Tests (User-Journeys).
 * Dev-Server wird automatisch gestartet (oder wiederverwendet).
 * Test-Accounts optional über .env.e2e (siehe .env.e2e.example).
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
})
