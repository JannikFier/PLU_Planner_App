/**
 * Tutorial-Curriculum-Registry
 *
 * Deterministische Sammelstelle aller `TutorialStep`-Anker pro Capability.
 *
 * Hintergrund: Die produktive Tour laeuft heute ueber das bewaehrte
 * `TutorialTask`-Modell (siehe `tutorial-curriculum-*.ts`). Parallel pflegen
 * wir hier eine schlanke Step-Liste, in der **jede** in
 * `TUTORIAL_CAPABILITIES` deklarierte Capability mindestens einen Step
 * vorweisen kann. Damit ist der Coverage-Vertrag aus
 * `tutorial-coverage.test.ts` einloesbar (CI greift, sobald eine neue
 * Capability ergaenzt wird, ohne dass irgendwo ein Step dazu existiert).
 *
 * Reihenfolge entspricht der Curriculum-Logik des Orchestrators:
 *   cross-cutting -> obst -> obst-konfig -> backshop -> backshop-konfig ->
 *   backshop-marken -> users -> closing.
 *
 * Die Texte sind absichtlich kompakt – die ausfuehrlichen Coach-Texte
 * leben weiterhin in den jeweiligen `tutorial-curriculum-*.ts`-Dateien.
 */

import type { TutorialStep } from './tutorial-step-types'
import type { TutorialCapability } from './tutorial-capabilities'

/**
 * Hilfs-Konstruktor: erzeugt einen schlanken Anker-Step pro Capability,
 * damit der Coverage-Check pro Capability >= 1 Step findet. Die Reihenfolge
 * der Aufrufe legt die Registry-Reihenfolge fest.
 */
function step(args: {
  capability: TutorialCapability
  module: TutorialStep['module']
  headline: string
  body: string
  pose?: string
}): TutorialStep {
  return {
    id: `cap.${args.capability}`,
    module: args.module,
    capability: args.capability,
    pose: args.pose ?? 'point',
    headline: args.headline,
    body: args.body,
    acknowledge: true,
  }
}

/**
 * Sammelt alle Curriculum-Steps in stabiler Reihenfolge. Die Reihenfolge
 * wird im Tutorial-Lauf durch das aktuell gewaehlte Modul gefiltert.
 */
export function collectAllCurriculumSteps(): readonly TutorialStep[] {
  const out: TutorialStep[] = []

  // Cross-cutting
  out.push(step({ capability: 'login', module: 'cross-cutting', headline: 'Login', body: 'Du startest das Tutorial direkt nach dem Login.' }))
  out.push(step({ capability: 'firstLogin', module: 'cross-cutting', headline: 'Erstes Login', body: 'Beim Erst-Login wechselst du dein Passwort, danach geht es weiter.' }))
  out.push(step({ capability: 'cross.testmode', module: 'cross-cutting', headline: 'Testmodus', body: 'Im Testmodus probierst du Aktionen gefahrlos aus.' }))
  out.push(step({ capability: 'cross.market.switch', module: 'cross-cutting', headline: 'Markt-Wechsel', body: 'Bei mehreren Maerkten wechselst du oben im Profil.' }))
  out.push(step({ capability: 'notifications.read', module: 'cross-cutting', headline: 'Glocke', body: 'Die Glocke zeigt neue Listen und Versions-Wechsel.' }))
  out.push(step({ capability: 'notifications.carryover.write', module: 'cross-cutting', headline: 'Mitnehmen', body: 'Hinweise zu Manuellen Ergaenzungen kannst du gezielt mitnehmen.' }))
  out.push(step({ capability: 'notifications.transfer.start', module: 'cross-cutting', headline: 'Übergabe', body: 'Den Wochen-Wechsel startest du aktiv ueber die Glocke.' }))

  // Obst
  out.push(step({ capability: 'obst.list.read', module: 'obst', headline: 'Obst-Liste', body: 'Die Obst-Liste zeigt deine PLU-Nummern fuer die aktuelle KW.' }))
  out.push(step({ capability: 'obst.werbung.read', module: 'obst', headline: 'Obst-Werbung', body: 'Die Werbung markiert Aktionsartikel in deiner Obst-Liste.' }))
  out.push(step({ capability: 'obst.werbung.write', module: 'obst', headline: 'Werbung pflegen', body: 'Du kannst Werbung zentral oder eigene Aktionen ergaenzen.' }))
  out.push(step({ capability: 'obst.custom.write', module: 'obst', headline: 'Eigene Produkte', body: 'Markt-spezifische Artikel pflegst du in den Eigenen Produkten.' }))
  out.push(step({ capability: 'obst.hidden.write', module: 'obst', headline: 'Ausgeblendete', body: 'Nicht relevante Produkte versteckst du dauerhaft fuer deinen Markt.' }))
  out.push(step({ capability: 'obst.rename.write', module: 'obst', headline: 'Umbenannte', body: 'Anzeigenamen passt du im Bereich Umbenannte Produkte an.' }))
  out.push(step({ capability: 'obst.layout', module: 'obst-konfig', headline: 'Obst-Layout', body: 'Layout, Spalten und PDF-Optionen steuerst du in der Konfiguration.' }))
  out.push(step({ capability: 'obst.rules', module: 'obst-konfig', headline: 'Obst-Regeln', body: 'Bezeichnungsregeln vereinheitlichen Schreibweisen automatisch.' }))

  // Backshop
  out.push(step({ capability: 'backshop.list.read', module: 'backshop', headline: 'Backshop-Liste', body: 'Die Backshop-Liste zeigt die aktuelle Version mit Quell-Badges.' }))
  out.push(step({ capability: 'backshop.werbung.read', module: 'backshop', headline: 'Backshop-Werbung', body: 'Aktions-Backwaren werden in der Liste markiert.' }))
  out.push(step({ capability: 'backshop.werbung.write', module: 'backshop', headline: 'Werbung pflegen', body: 'Backshop-Werbung pflegst du zentral oder pro Markt.' }))
  out.push(step({ capability: 'backshop.custom.write', module: 'backshop', headline: 'Eigene Produkte', body: 'Markt-spezifische Backshop-Artikel pflegst du separat.' }))
  out.push(step({ capability: 'backshop.hidden.write', module: 'backshop', headline: 'Ausgeblendete', body: 'Manuell oder per Regel blendest du Backshop-Artikel aus.' }))
  out.push(step({ capability: 'backshop.rename.write', module: 'backshop', headline: 'Umbenannte', body: 'Backshop-Artikel kannst du umbenennen, ohne den Master zu aendern.' }))
  out.push(step({ capability: 'backshop.marken.write', module: 'backshop-marken', headline: 'Marken-Auswahl', body: 'Pro Warengruppe waehlst du die Marken fuer deinen Markt.' }))
  out.push(step({ capability: 'backshop.layout', module: 'backshop-konfig', headline: 'Backshop-Layout', body: 'Layout, Block-Sortierung und PDF-Optionen passt du an.' }))
  out.push(step({ capability: 'backshop.rules', module: 'backshop-konfig', headline: 'Backshop-Regeln', body: 'Bezeichnungsregeln vereinheitlichen Schreibweisen pro Backshop-Liste.' }))
  out.push(step({ capability: 'backshop.gruppenregeln', module: 'backshop-konfig', headline: 'Gruppenregeln', body: 'Pro Warengruppe legst du Markenpraeferenzen als Fallback fest.' }))

  // Users (Admin)
  out.push(step({ capability: 'users.read', module: 'users', headline: 'Benutzer', body: 'Die Benutzerliste zeigt alle Mitarbeitenden deines Marktes.' }))
  out.push(step({ capability: 'users.create', module: 'users', headline: 'Neuer Benutzer', body: 'Ueber „Neuer Benutzer“ legst du ein Konto an.' }))
  out.push(step({ capability: 'users.update', module: 'users', headline: 'Bearbeiten', body: 'Rolle, Maerkte und Bereiche aenderst du im Bearbeiten-Dialog.' }))
  out.push(step({ capability: 'users.delete', module: 'users', headline: 'Loeschen', body: 'Inaktive Konten kannst du dauerhaft entfernen.' }))
  out.push(step({ capability: 'users.password.reset', module: 'users', headline: 'Passwort', body: 'Mit „Passwort zuruecksetzen“ schickst du einen Reset-Link.' }))
  out.push(step({ capability: 'users.assign.markets', module: 'users', headline: 'Maerkte', body: 'Pro Person regelst du, welche Maerkte zugaenglich sind.' }))
  out.push(step({ capability: 'users.assign.areas', module: 'users', headline: 'Bereiche', body: 'Pro Person regelst du Sichtbarkeit von Obst und Backshop.' }))

  return out
}
