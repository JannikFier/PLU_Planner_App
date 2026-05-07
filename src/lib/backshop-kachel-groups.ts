import type { DisplayItem } from '@/types/plu'

const FALLBACK_WG = 'Ohne Warengruppe'

/** Anzeige-Label wie in der PLU-Liste: DB-Warengruppe, sonst Blockname aus Layout. */
function kachelWarengruppeLabel(item: DisplayItem): string {
  const wg = item.warengruppe?.trim()
  if (wg) return wg
  const block = item.block_name?.trim()
  if (block) return block
  return FALLBACK_WG
}

export interface BackshopKachelWarengruppeBlock {
  label: string
  items: DisplayItem[]
}

/**
 * Filtert optional Angebotszeilen und gruppiert nach Warengruppe;
 * Reihenfolge der Gruppen = erstes Vorkommen in der Eingabeliste.
 */
export function buildBackshopKachelWarengruppeBlocks(
  displayItems: DisplayItem[],
  options: { excludeOffers: boolean },
): BackshopKachelWarengruppeBlock[] {
  const list = options.excludeOffers ? displayItems.filter((i) => !i.is_offer) : displayItems
  const blocks: BackshopKachelWarengruppeBlock[] = []
  const labelToIndex = new Map<string, number>()
  for (const item of list) {
    const label = kachelWarengruppeLabel(item)
    let idx = labelToIndex.get(label)
    if (idx === undefined) {
      idx = blocks.length
      labelToIndex.set(label, idx)
      blocks.push({ label, items: [] })
    }
    blocks[idx].items.push(item)
  }
  return blocks
}

/** Basisliste für Kachel-Katalog und PDF: ohne Werbungs-/Angebotszeilen. */
export function filterBackshopKachelCatalogSourceItems(displayItems: DisplayItem[]): DisplayItem[] {
  return displayItems.filter((i) => !i.is_offer)
}

/**
 * Echtzeit-Filter für die Kachel-Ansicht: PLU oder Anzeigename (Groß-/Kleinschreibung egal).
 * Leerer Query → unveränderte Eingabeliste.
 */
export function filterDisplayItemsForKachelSearch(
  displayItems: DisplayItem[],
  rawQuery: string,
): DisplayItem[] {
  const q = rawQuery.trim().toLowerCase()
  if (!q) return displayItems
  return displayItems.filter((item) => {
    const plu = item.plu.toLowerCase()
    const name = (item.display_name ?? '').toLowerCase()
    return plu.includes(q) || name.includes(q)
  })
}
