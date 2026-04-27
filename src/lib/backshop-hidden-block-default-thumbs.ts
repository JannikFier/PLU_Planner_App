/**
 * Feste Vorschaubilder für ausgewählte Warengruppen (Ausgeblendet-Kacheln).
 * PNGs unter public/warengruppen-vorschau/ — Dateinamen beibehalten oder Regeln anpassen.
 * Sonst (keine Warengruppe, eigene Gruppen, …): erstes Produktbild der Gruppe (previewThumbUrl).
 */

const BASE = '/warengruppen-vorschau'

type Rule = { pattern: RegExp; file: string }

/** Reihenfolge: spezifischere / kombinierte Namen zuerst. */
const RULES: Rule[] = [
  { pattern: /brot\s*(und|&|\+|,)?\s*br(ö|oe)tchen|brot\s*&\s*br(ö|oe)tchen/i, file: `${BASE}/brot.png` },
  { pattern: /br(ö|oe)tchen/i, file: `${BASE}/broetchen.png` },
  { pattern: /^brote?$/i, file: `${BASE}/brot.png` },
  { pattern: /croissant/i, file: `${BASE}/croissant.png` },
  { pattern: /baguette/i, file: `${BASE}/baguette.png` },
  /** Laugen- und Laubengebäck; Tippfehler „Laumgebäck“ */
  { pattern: /laugen|laubengeb(ä|ae)ck|laugengeb(ä|ae)ck|laumgeb/i, file: `${BASE}/laugenstange.png` },
  {
    pattern: /sü(ß|ss)e?s?|sue(ß|ss)e?s?|suess(es)?|süßware|suessware|zuckerw|konfekt/i,
    file: `${BASE}/berliner.png`,
  },
  { pattern: /snack|mozzarella|mozzera/i, file: `${BASE}/mozzarella.png` },
]

/**
 * URL für die Kachel: bekannte Warengruppe → festes Bild, sonst erstes Artikelbild.
 */
export function resolveBackshopHiddenBlockTileImage(
  blockLabel: string,
  previewThumbUrl: string | null | undefined,
): string | null {
  const label = blockLabel.trim()
  for (const { pattern, file } of RULES) {
    if (pattern.test(label)) return file
  }
  return previewThumbUrl ?? null
}
