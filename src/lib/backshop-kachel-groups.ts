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
