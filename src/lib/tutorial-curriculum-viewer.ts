import type { TutorialTask } from '@/lib/tutorial-interactive-engine'

/** Viewer: nur Lesen, kein Testmodus — kurze Bestätigung auf der Masterliste. */
export function buildViewerPostBackshopTasks(getPathname: () => string): TutorialTask[] {
  return [
    {
      id: 'viewer-backshop-readonly',
      headline: 'Backshop nur lesen',
      body: 'Fier: Als Viewer siehst du die Backshop-Liste ohne Bearbeiten.',
      fierKey: 'data',
      pollIntervalMs: 300,
      validate: () => getPathname().includes('/backshop-list'),
    },
  ]
}

export function buildViewerPostObstTasks(getPathname: () => string): TutorialTask[] {
  return [
    {
      id: 'viewer-obst-readonly',
      headline: 'So siehst du die Daten',
      body: 'Fier: Als Viewer kannst du die Liste und das PDF nutzen. Änderungen nimmst du bitte über eine Kollegin oder einen Admin vor.',
      fierKey: 'data',
      pollIntervalMs: 300,
      validate: () => getPathname().includes('/masterlist'),
    },
  ]
}
