/**
 * Mapping von Situations-Keys (Design: Externe/Figur/mascot-library.jsx, SITUATIONS.md) auf
 * FierMascot-Posen. Dedupliziert in Phase 3: jede Situation mappt auf die semantisch passende
 * Pose, nicht pauschal auf `hero`.
 */
import type { FierPose } from '@/components/tutorial/FierMascot'

const KEY_TO_POSE: Record<string, FierPose> = {
  welcome: 'welcome',
  greet: 'welcome',
  hero: 'hero',
  unlock: 'cheer',
  cheer: 'cheer',
  success: 'cheer',
  save: 'thumbs',
  thumbs: 'thumbs',
  heart: 'cheer',

  intro: 'point-right',
  pup: 'point-up',
  pright: 'point-right',
  pdown: 'point-down',
  deliver: 'point-right',
  goal: 'goal',
  task: 'point-right',

  explain: 'think',
  tip: 'think',
  think: 'think',
  idea: 'idea',
  question: 'confused',
  analyze: 'think',
  focus: 'focus',
  empty: 'confused',
  confused: 'confused',

  alert: 'alert',
  oops: 'oops',
  wow: 'alert',

  data: 'stand',
  calm: 'stand',
  stand: 'stand',
  wait: 'stand',
  sleep: 'stand',

  working: 'walk',
  loading: 'walk',
  walk: 'walk',
  break: 'stand',

  wink: 'welcome',
  silly: 'cheer',
}

export function fierLibraryKeyToPose(key: string | undefined): FierPose {
  if (!key) return 'stand'
  return KEY_TO_POSE[key] ?? 'stand'
}
