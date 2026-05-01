/** Schriftgrößen aus den Layout-Einstellungen */
export interface FontSizes {
  header: number  // Titel-Banner ("PLU-Liste", "PLU-Liste Stück")
  column: number  // Gruppen-Header (— A —, Obst, etc.) + Spaltenköpfe
  product: number // PLU + Artikelname
}

export const DEFAULT_FONT_SIZES: FontSizes = { header: 24, column: 16, product: 12 }
