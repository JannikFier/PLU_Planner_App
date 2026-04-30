import { test, expect } from '@playwright/test'

/**
 * Kassenmodus: öffentliche Einstiegsseite ohne Login.
 * @extended — läuft mit `npm run test:e2e:full`; braucht erreichbare Supabase (RPC liefert leere Liste → Hinweistext).
 */
test.describe('Kassenmodus Einstieg @extended', () => {
  test('Ungültiger oder unbekannter Token zeigt Hinweis', async ({ page }) => {
    await page.goto('/kasse/ungueltiger-test-token-xxxxxxxxxxxxxxxxxxxxxxxx')
    await expect(
      page.getByText(/Keine aktiven Kassen|Kassen konnten nicht|Einstiegs-Link/i),
    ).toBeVisible({ timeout: 25_000 })
  })
})
