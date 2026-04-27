/**
 * Tutorial: Lokal (`npm run dev`) immer sichtbar und aktiv – kein Extra-Env nötig.
 * Production-Build: standardmäßig aus (keine Symbole, kein Auto-Start); zum
 * Wieder-Einschalten `VITE_TUTORIAL_ENABLED=true` setzen (z. B. Vercel) und neu deployen.
 */
export function isTutorialUiEnabled(): boolean {
  if (import.meta.env.DEV) return true
  return import.meta.env.VITE_TUTORIAL_ENABLED === 'true'
}
