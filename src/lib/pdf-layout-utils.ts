// Layout-Helfer für PDF: Zeilen- und Bannerhöhen aus Schriftgröße ableiten
// Formel: Höhe = Schriftgröße_pt × 0,353 + 2 × Padding_mm (1 pt ≈ 0,353 mm)

/** 1 pt = 25.4/72 mm */
const PT_TO_MM = 25.4 / 72

/** Zeilenhöhe für Produktzeilen (mm) – Schrift + Mindestabstand oben/unten */
export function computeRowHeightMm(fontProductPt: number): number {
  const paddingMm = 1.5
  return Math.max(3, fontProductPt * PT_TO_MM + 2 * paddingMm)
}

/** Header-Banner-Höhe (mm) – z.B. "KW12/2026 – Stück" */
export function computeHeaderHeightMm(fontHeaderPt: number): number {
  const paddingMm = 2
  return Math.max(4, fontHeaderPt * PT_TO_MM + 2 * paddingMm)
}

/** Spaltenköpfe-Höhe (mm) – "PLU", "Artikel" */
export function computeColumnHeaderHeightMm(fontColumnPt: number): number {
  const paddingMm = 1
  return Math.max(3, fontColumnPt * PT_TO_MM + 2 * paddingMm)
}

/** Gruppen-Header-Höhe (mm) – z.B. "— A —", "Brot" */
export function computeGroupHeaderHeightMm(fontGroupPt: number): number {
  const paddingMm = 1.5
  return Math.max(4, fontGroupPt * PT_TO_MM + 2 * paddingMm)
}
