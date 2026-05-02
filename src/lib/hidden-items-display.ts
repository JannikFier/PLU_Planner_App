/**
 * Anzeige-Aufbereitung für HiddenItems (Obst: ausgeblendete Zeilen).
 */

import type { HiddenProductDisplayRow } from '@/components/plu/HiddenProductsResponsiveList'
import type { CustomProduct, HiddenItem, MasterPLUItem } from '@/types/database'
import { getDisplayPlu } from '@/lib/plu-helpers'

export interface HiddenProductInfo {
  plu: string
  name: string
  itemType: 'PIECE' | 'WEIGHT' | null
  source: 'master' | 'custom' | 'unknown'
  hidden_by: string
  hiddenByName: string
  hiddenAt: string
}

export function buildHiddenProductInfos(
  hiddenItems: HiddenItem[],
  masterItems: MasterPLUItem[],
  customProducts: CustomProduct[],
  profileMap: Map<string, string>,
): HiddenProductInfo[] {
  return hiddenItems.map((hidden) => {
    const masterItem = masterItems.find((m) => m.plu === hidden.plu)
    if (masterItem) {
      return {
        plu: hidden.plu,
        name: masterItem.display_name ?? masterItem.system_name,
        itemType: masterItem.item_type,
        source: 'master' as const,
        hidden_by: hidden.hidden_by,
        hiddenByName: profileMap.get(hidden.hidden_by) ?? 'Unbekannt',
        hiddenAt: hidden.created_at,
      }
    }

    const customItem = customProducts.find((c) => c.plu === hidden.plu)
    if (customItem) {
      return {
        plu: hidden.plu,
        name: customItem.name,
        itemType: customItem.item_type,
        source: 'custom' as const,
        hidden_by: hidden.hidden_by,
        hiddenByName: profileMap.get(hidden.hidden_by) ?? 'Unbekannt',
        hiddenAt: hidden.created_at,
      }
    }

    return {
      plu: hidden.plu,
      name: `PLU ${getDisplayPlu(hidden.plu)} (nicht mehr vorhanden)`,
      itemType: null,
      source: 'unknown' as const,
      hidden_by: hidden.hidden_by,
      hiddenByName: profileMap.get(hidden.hidden_by) ?? 'Unbekannt',
      hiddenAt: hidden.created_at,
    }
  })
}

export function buildHiddenItemsDisplayRows(
  hiddenProductInfos: HiddenProductInfo[],
  currentUserId: string | null,
  centralCampaignPluSet: Set<string>,
): HiddenProductDisplayRow[] {
  return hiddenProductInfos.map((info) => ({
    plu: info.plu,
    name: info.name,
    hiddenByName: info.hiddenByName,
    hidden_by: info.hidden_by,
    showVonMirBadge: !!(currentUserId && info.hidden_by === currentUserId),
    source: info.source,
    showCentralCampaignBadge: centralCampaignPluSet.has(info.plu),
    typLabel:
      info.itemType === 'PIECE' ? 'Stück' : info.itemType === 'WEIGHT' ? 'Gewicht' : null,
    thumbUrl: null,
  }))
}
