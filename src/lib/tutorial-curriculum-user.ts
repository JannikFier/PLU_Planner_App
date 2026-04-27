import type { TutorialTask } from '@/lib/tutorial-interactive-engine'
import { buildBackshopDeepTasks } from '@/lib/tutorial-curriculum-backshop-deep'
import { buildObstDeepTasks } from '@/lib/tutorial-curriculum-obst-deep'

/** Kurze Bestätigung nach der Obst-Tour: vertiefte Toolbar-Unterseiten (User/Admin). */
export function buildUserPostBackshopTasks(getPathname: () => string): TutorialTask[] {
  return buildBackshopDeepTasks(getPathname)
}

/** Vertiefung Masterliste Obst. */
export function buildUserPostObstTasks(getPathname: () => string): TutorialTask[] {
  return buildObstDeepTasks(getPathname)
}
