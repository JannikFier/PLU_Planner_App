/**
 * Einheitliche Texte für Super-Admin: zentrale Obst-/Backshop-Werbung löschen.
 */

export const CENTRAL_OFFER_ADMIN_DELETE_DIALOG_TITLE = 'Werbung löschen?'

/** Bestätigungstext – gleicher Wortlaut für Obst (Woche/3-Tage) und Backshop. */
export function centralOfferAdminDeleteDialogDescription(campaignLabel: string): string {
  return `${campaignLabel} wirklich löschen? Alle zugehörigen Artikel-Zeilen werden entfernt. In Marktlisten und PDFs entfällt die zentrale Markierung für diese Werbung.`
}
