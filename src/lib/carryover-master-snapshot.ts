// Carryover-Zeile → synthetische Master-Zeilen für die Layout-Engine (Zentral-Master bleibt unverändert).

import { formatProductWordsForDisplay } from '@/lib/plu-helpers'
import type {
  BackshopMasterPLUItem,
  BackshopSource,
  Database,
  MasterPLUItem,
  StoreListCarryover,
} from '@/types/database'

type StoreListCarryoverInsert = Database['public']['Tables']['store_list_carryover']['Insert']

export function carryoverObstRowToMasterItem(row: StoreListCarryover, activeVersionId: string): MasterPLUItem {
  const rawDisplay = (row.display_name ?? '').trim() || row.system_name
  const displayName = formatProductWordsForDisplay(rawDisplay)
  return {
    id: `carryover-${row.id}`,
    version_id: activeVersionId,
    plu: row.plu,
    system_name: row.system_name,
    display_name: displayName,
    item_type: row.item_type,
    status: 'UNCHANGED',
    old_plu: row.old_plu,
    warengruppe: row.warengruppe,
    block_id: row.block_id,
    is_admin_eigen: false,
    is_manually_renamed: false,
    is_manual_supplement: false,
    preis: row.preis,
    created_at: row.updated_at,
  }
}

export function carryoverBackshopRowToMasterItem(
  row: StoreListCarryover,
  activeVersionId: string,
): BackshopMasterPLUItem {
  const src = (row.source ?? 'edeka') as BackshopSource
  const rawDisplay = (row.display_name ?? '').trim() || row.system_name
  const displayName = formatProductWordsForDisplay(rawDisplay)
  return {
    id: `carryover-${row.id}`,
    version_id: activeVersionId,
    plu: row.plu,
    system_name: row.system_name,
    display_name: displayName,
    status: 'UNCHANGED',
    old_plu: row.old_plu,
    warengruppe: row.warengruppe,
    block_id: row.block_id,
    is_manually_renamed: false,
    is_manual_supplement: false,
    image_url: row.image_url,
    source: src,
    created_at: row.updated_at,
  }
}

export function removedObstMasterToCarryoverInsert(
  storeId: string,
  forVersionId: string,
  fromVersionId: string,
  item: MasterPLUItem,
): StoreListCarryoverInsert {
  return {
    store_id: storeId,
    list_type: 'obst',
    for_version_id: forVersionId,
    from_version_id: fromVersionId,
    plu: item.plu,
    system_name: item.system_name,
    display_name: item.display_name,
    item_type: item.item_type,
    preis: item.preis,
    block_id: item.block_id,
    warengruppe: item.warengruppe,
    old_plu: item.old_plu,
    image_url: null,
    source: null,
    market_include: false,
  }
}

export function removedBackshopMasterToCarryoverInsert(
  storeId: string,
  forVersionId: string,
  fromVersionId: string,
  item: BackshopMasterPLUItem,
): StoreListCarryoverInsert {
  return {
    store_id: storeId,
    list_type: 'backshop',
    for_version_id: forVersionId,
    from_version_id: fromVersionId,
    plu: item.plu,
    system_name: item.system_name,
    display_name: item.display_name,
    item_type: 'PIECE',
    preis: null,
    block_id: item.block_id,
    warengruppe: item.warengruppe,
    old_plu: item.old_plu,
    image_url: item.image_url,
    source: item.source,
    market_include: false,
  }
}
