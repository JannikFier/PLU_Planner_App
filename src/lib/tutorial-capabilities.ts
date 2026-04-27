/**
 * Tutorial-Capabilities (Datenmodell + reine Ableitungslogik)
 *
 * Eine Capability beschreibt eine konkrete Funktion der App, die im Tutorial
 * erklaert werden kann (z. B. „Ausblenden im Backshop"). Jeder Curriculum-Step
 * deklariert eine Capability; der Engine filtert beim Lauf alle Steps anhand
 * der Capabilities, die der aktuelle User tatsaechlich nutzen darf.
 *
 * React-Hook `useTutorialCapabilities()` lebt in `tutorial-capabilities-hook.ts`
 * (getrennt, damit dieses Modul ohne `window` testbar bleibt).
 */

/**
 * Vollstaendige Liste aller Capabilities, die das Tutorial kennt.
 * Reihenfolge entspricht der Curriculum-Struktur (Cross-Cutting -> Obst ->
 * Backshop -> Users). Eine neue Capability MUSS hier ergaenzt UND in
 * mindestens einem Step verwendet werden (sonst CI-Fail in
 * `tutorial-coverage.test.ts`).
 */
export const TUTORIAL_CAPABILITIES = [
  // Cross-cutting
  'login',
  'firstLogin',
  'cross.testmode',
  'cross.market.switch',
  'notifications.read',
  'notifications.carryover.write',
  'notifications.transfer.start',

  // Obst & Gemuese
  'obst.list.read',
  'obst.custom.write',
  'obst.hidden.write',
  'obst.werbung.read',
  'obst.werbung.write',
  'obst.rename.write',
  'obst.layout',
  'obst.rules',

  // Backshop
  'backshop.list.read',
  'backshop.custom.write',
  'backshop.hidden.write',
  'backshop.werbung.read',
  'backshop.werbung.write',
  'backshop.marken.write',
  'backshop.rename.write',
  'backshop.layout',
  'backshop.rules',
  'backshop.gruppenregeln',

  // Benutzerverwaltung (Admin)
  'users.read',
  'users.create',
  'users.update',
  'users.delete',
  'users.password.reset',
  'users.assign.markets',
  'users.assign.areas',
] as const

export type TutorialCapability = (typeof TUTORIAL_CAPABILITIES)[number]

export type TutorialCapabilitySet = ReadonlySet<TutorialCapability>

/**
 * Eingaben, aus denen Capabilities abgeleitet werden. Ausgelagert,
 * damit die Logik losgeloest von React-Hooks getestet werden kann.
 */
export interface TutorialCapabilityInputs {
  role: 'viewer' | 'user' | 'admin' | 'super_admin' | null
  hasStore: boolean
  obstVisible: boolean
  backshopVisible: boolean
  obstFeatures: {
    customProducts: boolean
    hiddenItems: boolean
    keywordRules: boolean
  }
  backshopFeatures: {
    customProducts: boolean
    hiddenItems: boolean
    keywordRules: boolean
  }
  /** Zahl der zugewiesenen, aktiven Maerkte (mind. 0). */
  accessibleStoreCount: number
  /** Beim Erst-Login (must_change_password = true) starten wir auf einer
   *  Spezial-Route, dafuer gibt es einen eigenen Tutorial-Step. */
  mustChangePassword: boolean
}

/**
 * Reine Funktion: leitet das Capability-Set aus den Eingaben ab.
 * Wird vom Hook und in Tests verwendet.
 */
export function deriveTutorialCapabilities(
  inputs: TutorialCapabilityInputs,
): TutorialCapabilitySet {
  const out = new Set<TutorialCapability>()

  out.add('login')
  if (inputs.mustChangePassword) out.add('firstLogin')

  const role = inputs.role
  const isViewer = role === 'viewer'
  const isAdmin = role === 'admin' || role === 'super_admin'
  const isWriter = role === 'user' || role === 'admin' || role === 'super_admin'
  const carryoverWrite = isWriter && inputs.hasStore

  // Cross-cutting
  if (!isViewer && role != null) out.add('cross.testmode')
  if (inputs.accessibleStoreCount > 1) out.add('cross.market.switch')
  out.add('notifications.read')
  if (carryoverWrite) {
    out.add('notifications.carryover.write')
    out.add('notifications.transfer.start')
  }

  // Obst
  if (inputs.obstVisible) {
    out.add('obst.list.read')
    out.add('obst.werbung.read')
    if (isWriter) {
      if (inputs.obstFeatures.customProducts) out.add('obst.custom.write')
      if (inputs.obstFeatures.hiddenItems) out.add('obst.hidden.write')
      out.add('obst.werbung.write')
      out.add('obst.rename.write')
    }
    if (isAdmin) {
      out.add('obst.layout')
      if (inputs.obstFeatures.keywordRules) out.add('obst.rules')
    }
  }

  // Backshop
  if (inputs.backshopVisible) {
    out.add('backshop.list.read')
    out.add('backshop.werbung.read')
    if (isWriter) {
      if (inputs.backshopFeatures.customProducts) out.add('backshop.custom.write')
      if (inputs.backshopFeatures.hiddenItems) out.add('backshop.hidden.write')
      out.add('backshop.werbung.write')
      out.add('backshop.rename.write')
      out.add('backshop.marken.write')
    }
    if (isAdmin) {
      out.add('backshop.layout')
      if (inputs.backshopFeatures.keywordRules) out.add('backshop.rules')
      out.add('backshop.gruppenregeln')
    }
  }

  // Users (nur Admin / Super-Admin)
  if (isAdmin) {
    out.add('users.read')
    out.add('users.create')
    out.add('users.update')
    out.add('users.delete')
    out.add('users.password.reset')
    out.add('users.assign.markets')
    out.add('users.assign.areas')
  }

  return out
}

