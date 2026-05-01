import { readFileSync, existsSync } from 'node:fs'
import { availableParallelism } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, devices } from '@playwright/test'

/**
 * Lokal: begrenzte Worker-Zahl → weniger gleichzeitige Supabase-Logins (Rate-Limits).
 * Überschreiben: PLAYWRIGHT_WORKERS=<positive Zahl>. CI: immer 1.
 */
function resolvePlaywrightWorkers(): number {
  if (process.env.CI) return 1
  const raw = process.env.PLAYWRIGHT_WORKERS
  if (raw !== undefined && raw.trim() !== '') {
    const n = Number.parseInt(raw, 10)
    if (Number.isFinite(n) && n > 0) return n
  }
  const cores = availableParallelism()
  return Math.min(3, Math.max(1, cores))
}

// Optionale .env.e2e laden (Test-Accounts), siehe .env.e2e.example
const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = join(__dirname, '.env.e2e')
if (existsSync(envPath)) {
  // UTF-8-BOM entfernen (sonst scheitert die erste Zeile beim Regex).
  const content = readFileSync(envPath, 'utf8').replace(/^\uFEFF/, '')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const m = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (!m) continue
    let value = m[2].trim()
    const quoted = /^["']/.test(value)
    value = value.replace(/^["']|["']$/g, '').trim()
    // Wie dotenv: Nur unquoted: trailing ` # Kommentar` abschneiden (nicht `foo#bar` ohne Leerzeichen).
    if (!quoted) {
      const commentIdx = value.search(/\s+#/)
      if (commentIdx !== -1) value = value.slice(0, commentIdx).trim()
    }
    process.env[m[1]] = value
  }
}

/**
 * Playwright-Konfiguration für E2E-Tests.
 * - Standard (npm run test:e2e): Nur @smoke – schnell, ohne .env.e2e
 * - Vollständig (npm run test:e2e:full): Alle Tests inkl. mobile-layout (Handy + Tablet) – vor Publish, braucht .env.e2e
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: resolvePlaywrightWorkers(),
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
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: /mobile-layout\.spec\.ts/,
    },
    {
      name: 'mobile-chromium',
      use: { ...devices['iPhone 13'] },
      testMatch: /mobile-layout\.spec\.ts/,
    },
    {
      name: 'tablet-chromium',
      use: { ...devices['iPad Pro 11'] },
      testMatch: /mobile-layout\.spec\.ts/,
    },
  ],
})
