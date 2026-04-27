import type { TutorialTask } from '@/lib/tutorial-interactive-engine'
import { ackStep } from '@/lib/tutorial-curriculum-style'

/**
 * Backshop-Upload-Wizard (PR 3.0 B6): geht den 4-stufigen Wizard durch.
 *
 * Reihenfolge: Wizard-Layout / Stepper -> Upload-Step (Dropzone) ->
 * Analyse-Step (Header-Erkennung) -> Mapping-Dialog -> Group-Assignment ->
 * Preview/Publish.
 *
 * Reine Ack-Steps: der echte Upload-Flow soll nicht ohne User-Datei
 * ausgeloest werden – der Coach erklaert die Stationen, wenn der User durch
 * den Wizard navigiert.
 */
export function buildBackshopUploadTasks(getPathname: () => string): TutorialTask[] {
  // getPathname is currently unused but kept in the signature for parity with
  // other Curriculum-Builder, sodass der Orchestrator sie generisch aufrufen kann.
  void getPathname
  return [
    ackStep({
      id: 'backshop-upload-wizard',
      headline: 'Upload-Wizard',
      body: 'Hier spielst du eine neue Backshop-Liste ein. Der Wizard begleitet dich in vier Schritten.',
      fierKey: 'pdown',
      nearSelector: '[data-tour="backshop-upload-wizard"]',
    }),
    ackStep({
      id: 'backshop-upload-stepper',
      headline: 'Schritte',
      body: 'Im Stepper oben siehst du, wo du gerade bist. Du kannst innerhalb des Wizards jederzeit zurück gehen.',
      fierKey: 'data',
      nearSelector: '[data-tour="backshop-upload-wizard-stepper"]',
    }),
    ackStep({
      id: 'backshop-upload-step-upload',
      headline: 'Datei wählen',
      body: 'Im ersten Schritt ziehst du eine Excel-Datei in die Dropzone oder wählst sie über den Datei-Dialog.',
      fierKey: 'point',
      nearSelector: '[data-tour="backshop-upload-step-upload"]',
    }),
    ackStep({
      id: 'backshop-upload-dropzone',
      headline: 'Dropzone',
      body: 'Die Dropzone akzeptiert .xlsx und .xls. Mehrere Dateien hintereinander einspielen ist möglich.',
      fierKey: 'point',
      nearSelector: '[data-tour="backshop-upload-dropzone"]',
    }),
    ackStep({
      id: 'backshop-upload-analyze',
      headline: 'Analyse',
      body: 'Im Analyse-Schritt erkennt Fier Spalten und meldet, wenn etwas fehlt – z. B. PLU oder Bezeichnung.',
      fierKey: 'data',
      nearSelector: '[data-tour="backshop-upload-step-analyze"]',
    }),
    ackStep({
      id: 'backshop-upload-analyze-card',
      headline: 'Analyse-Karte',
      body: 'Hier siehst du eine Vorschau der erkannten Spalten und ggf. Hinweise auf fehlende Pflichtfelder.',
      fierKey: 'data',
      nearSelector: '[data-tour="backshop-upload-analyze-card"]',
    }),
    ackStep({
      id: 'backshop-upload-mapping',
      headline: 'Mapping',
      body: 'Stimmt die Erkennung nicht, kannst du Spalten manuell zuordnen. Der Mapping-Dialog blockiert „Übernehmen“ bis alle Pflichtfelder gesetzt sind.',
      fierKey: 'point',
      nearSelector: '[data-tour="backshop-upload-mapping-dialog"]',
    }),
    ackStep({
      id: 'backshop-upload-groups',
      headline: 'Gruppen-Zuweisung',
      body: 'Im dritten Schritt ordnest du Artikel deinen Warengruppen zu. Vorschläge auf Basis der Master sind voreingestellt.',
      fierKey: 'data',
      nearSelector: '[data-tour="backshop-upload-step-groups"]',
    }),
    ackStep({
      id: 'backshop-upload-review',
      headline: 'Vorschau',
      body: 'Die Vorschau zeigt, wie deine neue Liste aussehen wird – inklusive Quellen-Mix und Mengenangaben.',
      fierKey: 'data',
      nearSelector: '[data-tour="backshop-upload-step-review"]',
    }),
    ackStep({
      id: 'backshop-upload-publish',
      headline: 'Veröffentlichen',
      body: 'Mit „Veröffentlichen“ setzt du die Liste live. Sie wird ab sofort als aktive Backshop-Version genutzt.',
      fierKey: 'success',
      nearSelector: '[data-tour="backshop-upload-publish-button"]',
    }),
  ]
}
