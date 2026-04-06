/**
 * Labels und px-Clamp für Layout-Einstellungen (Obst/Gemüse + Backshop).
 * Gemeinsamer Körper-Bereich bei Spaltenweise: Schnitt aus Spalten- und Produkt-Limits (8–24 px).
 */

/** UI-Labels für Schriftgrößen (deutsch) */
export const LAYOUT_FONT_LABELS = {
  listenHeader: 'Listen-Überschrift (px)',
  columnAndGroups: 'Spaltenköpfe & Gruppen (px)',
  productRows: 'Produktname & Zeilen (px)',
  /** Ein Feld steuert font_column_px und font_product_px gleichzeitig (Spaltenweise) */
  unifiedBody: 'Spaltenköpfe, Gruppen & Produktzeilen (px)',
} as const

/** Min/Max für gemeinsame Körper-Schrift (Schnitt Spalte 8–48 + Produkt 6–24 bzw. Backshop max 24) */
export const LAYOUT_UNIFIED_BODY_MIN_PX = 8
export const LAYOUT_UNIFIED_BODY_MAX_PX = 24

/** Clamp für ein Feld, das Spalten- und Produkt-Schrift gemeinsam setzt */
export function clampUnifiedBodyPx(px: number): number {
  return Math.max(
    LAYOUT_UNIFIED_BODY_MIN_PX,
    Math.min(LAYOUT_UNIFIED_BODY_MAX_PX, Math.round(px)),
  )
}
