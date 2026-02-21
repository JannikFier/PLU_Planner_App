// Layout-Engine: Baut aus allen Datenquellen die finale gemeinsame PLU-Liste
//
// Datenfluss:
//   master_plu_items + custom_products - hidden_items + bezeichnungsregeln = finale Liste

// CustomProduct Typ wird via LayoutEngineInput referenziert
import type { DisplayItem, LayoutEngineInput, LayoutEngineOutput, PLUStatus } from '@/types/plu'
import type { BackshopMasterPLUItem } from '@/types/database'
import type { Block } from '@/types/database'
import { nameContainsKeyword, normalizeKeywordInName } from '@/lib/keyword-rules'
import { getKWAndYearFromDate } from '@/lib/date-kw-utils'

/**
 * Baut die finale Anzeigeliste für alle Rollen.
 *
 * Schritte:
 * 1. Master-Items als Basis übernehmen
 * 2. Custom Products hinzufügen (nur wenn PLU nicht in Master – Master hat Vorrang)
 * 3. Ausgeblendete Items herausfiltern
 * 4. Bezeichnungsregeln anwenden (is_manually_renamed = true → überspringen!)
 * 5. Block-Namen zuweisen
 * 6. Sortieren
 * 7. Statistiken berechnen
 */
export function buildDisplayList(input: LayoutEngineInput): LayoutEngineOutput {
  const {
    masterItems,
    customProducts,
    hiddenPLUs,
    bezeichnungsregeln,
    blocks,
    sortMode,
    markYellowKwCount,
    versionKwNummer,
    versionJahr,
    currentKwNummer,
    currentJahr,
  } = input

  // Wochen-Differenz: wie viele KW seit der Version vergangen sind (für „neu“-Dauer)
  const weeksSinceVersion =
    (currentJahr - versionJahr) * 52 + (currentKwNummer - versionKwNummer)

  // SCHRITT 1: Master-Items als Basis („Neu“ nur markYellowKwCount KW anzeigen)
  // Master-Items können optional image_url haben (Backshop); Obst/Gemüse hat keins
  const masterWithImage = masterItems as Array<{ image_url?: string | null } & (typeof masterItems)[number]>
  let items: DisplayItem[] = masterItems.map((item, idx) => {
    let status = item.status as PLUStatus
    if (
      status === 'NEW_PRODUCT_YELLOW' &&
      weeksSinceVersion >= markYellowKwCount
    ) {
      status = 'UNCHANGED'
    }
    return {
      id: item.id,
      plu: item.plu,
      system_name: item.system_name,
      display_name: item.display_name ?? item.system_name,
      item_type: item.item_type,
      status,
      old_plu: item.old_plu,
      warengruppe: item.warengruppe,
      block_id: item.block_id,
      block_name: null, // Wird in Schritt 5 gesetzt
      preis: item.preis,
      is_custom: false,
      is_manually_renamed: item.is_manually_renamed ?? false,
      image_url: masterWithImage[idx]?.image_url ?? undefined,
    }
  })

  // SCHRITT 2: Custom Products hinzufügen
  // NUR wenn PLU NICHT in Master existiert (Master hat Vorrang = implizite Pause)
  const masterPLUs = new Set(masterItems.map((i) => i.plu))

  // Custom Products können optional image_url haben (Backshop); Obst/Gemüse hat keins
  const customWithImage = customProducts as Array<{ image_url?: string | null } & (typeof customProducts)[number]>
  customProducts.forEach((cp, idx) => {
    if (!masterPLUs.has(cp.plu)) {
      // Status kalenderwochenbasiert (wie Master): Hinzugefüge-KW aus created_at, dann wie viele KW vergangen
      const createdDate = new Date(cp.created_at)
      const { kw: addedKw, year: addedYear } = getKWAndYearFromDate(createdDate)
      const weeksSinceAdded =
        (currentJahr - addedYear) * 52 + (currentKwNummer - addedKw)
      const status: PLUStatus =
        weeksSinceAdded < markYellowKwCount ? 'NEW_PRODUCT_YELLOW' : 'UNCHANGED'

      items.push({
        id: cp.id,
        plu: cp.plu,
        system_name: cp.name,
        display_name: cp.name,
        item_type: cp.item_type,
        status,
        old_plu: null,
        warengruppe: null,
        block_id: cp.block_id,
        block_name: null,
        preis: cp.preis,
        is_custom: true,
        is_manually_renamed: false,
        created_by: cp.created_by,
        image_url: customWithImage[idx]?.image_url ?? undefined,
      })
    }
  })

  // SCHRITT 3: Ausgeblendete Items herausfiltern (NICHT löschen, nur nicht anzeigen)
  items = items.filter((item) => !hiddenPLUs.has(item.plu))

  // SCHRITT 4: Bezeichnungsregeln anwenden
  // WICHTIG: Prüfung NUR über das Flag is_manually_renamed!
  // NICHT über display_name !== system_name prüfen, weil auch
  // Bezeichnungsregeln selbst den display_name ändern.
  // Das Flag is_manually_renamed unterscheidet die beiden Fälle sauber.
  for (const regel of bezeichnungsregeln) {
    items = items.map((item) => {
      // RICHTIG: Flag prüfen
      if (item.is_manually_renamed) return item
      // FALSCH wäre: if (item.display_name !== item.system_name) return item

      if (nameContainsKeyword(item.display_name, regel.keyword)) {
        return {
          ...item,
          display_name: normalizeKeywordInName(
            item.display_name,
            regel.keyword,
            regel.position,
          ),
        }
      }
      return item
    })
  }

  // SCHRITT 5: Block-Namen zuweisen
  const blockMap = new Map(blocks.map((b) => [b.id, b.name]))
  items = items.map((item) => ({
    ...item,
    block_name: item.block_id ? blockMap.get(item.block_id) ?? null : null,
  }))

  // SCHRITT 6: Sortieren
  if (sortMode === 'ALPHABETICAL') {
    items.sort((a, b) => a.display_name.localeCompare(b.display_name, 'de'))
  } else if (sortMode === 'BY_BLOCK') {
    // Block-Reihenfolge nach order_index
    const blockOrder = new Map(
      [...blocks]
        .sort((a, b) => a.order_index - b.order_index)
        .map((b, i) => [b.id, i]),
    )

    items.sort((a, b) => {
      const aOrder = a.block_id ? (blockOrder.get(a.block_id) ?? 999) : 999
      const bOrder = b.block_id ? (blockOrder.get(b.block_id) ?? 999) : 999
      if (aOrder !== bOrder) return aOrder - bOrder
      return a.display_name.localeCompare(b.display_name, 'de')
    })
  }

  // SCHRITT 7: Statistiken berechnen
  const stats = {
    total: items.length,
    hidden: hiddenPLUs.size,
    newCount: items.filter((i) => i.status === 'NEW_PRODUCT_YELLOW').length,
    changedCount: items.filter((i) => i.status === 'PLU_CHANGED_RED').length,
    customCount: items.filter((i) => i.is_custom).length,
  }

  return { items, stats }
}

// ============================================================
// Backshop: Anzeigeliste ohne Custom/Bezeichnungsregeln (Phase 3)
// ============================================================

/** Custom-Product-Eintrag für Backshop (id, plu, name, image_url, block_id) */
export type BackshopCustomProductInput = {
  id: string
  plu: string
  name: string
  image_url: string
  block_id?: string | null
}

/** Minimale Regel für Anzeige (keyword, position, is_active) */
export type BackshopBezeichnungsregelInput = {
  keyword: string
  position: 'PREFIX' | 'SUFFIX'
  is_active: boolean
}

export interface BackshopDisplayListInput {
  masterItems: BackshopMasterPLUItem[]
  hiddenPLUs?: Set<string>
  sortMode: 'ALPHABETICAL' | 'BY_BLOCK'
  blocks?: Block[]
  /** Eigene Backshop-Produkte; werden nur hinzugefügt, wenn PLU nicht in Master vorkommt */
  customProducts?: BackshopCustomProductInput[]
  /** Bezeichnungsregeln für Anzeige (nur aktive werden angewendet) */
  bezeichnungsregeln?: BackshopBezeichnungsregelInput[]
}

/**
 * Baut die Anzeigeliste für die Backshop-Liste: Master (gefiltert nach hidden) + Custom Products.
 * Custom Products werden nur hinzugefügt, wenn PLU nicht in Master vorkommt.
 * Gibt DisplayItem[] mit item_type 'PIECE' und image_url zurück.
 */
export function buildBackshopDisplayList(input: BackshopDisplayListInput): LayoutEngineOutput {
  const {
    masterItems,
    hiddenPLUs = new Set(),
    sortMode,
    blocks = [],
    customProducts = [],
    bezeichnungsregeln = [],
  } = input

  const masterFiltered = masterItems.filter((item) => !hiddenPLUs.has(item.plu))
  const masterPLUs = new Set(masterFiltered.map((i) => i.plu))

  let items: DisplayItem[] = masterFiltered.map((item) => ({
    id: item.id,
    plu: item.plu,
    system_name: item.system_name,
    display_name: item.display_name ?? item.system_name,
    item_type: 'PIECE' as const,
    status: item.status as import('@/types/plu').PLUStatus,
    old_plu: item.old_plu,
    warengruppe: item.warengruppe,
    block_id: item.block_id,
    block_name: null as string | null,
    preis: null,
    is_custom: false,
    is_manually_renamed: item.is_manually_renamed ?? false,
    image_url: item.image_url ?? undefined,
  }))

  for (const cp of customProducts) {
    if (!masterPLUs.has(cp.plu)) {
      items.push({
        id: cp.id,
        plu: cp.plu,
        system_name: cp.name,
        display_name: cp.name,
        item_type: 'PIECE',
        status: 'UNCHANGED',
        old_plu: null,
        warengruppe: null,
        block_id: cp.block_id ?? null,
        block_name: null,
        preis: null,
        is_custom: true,
        is_manually_renamed: false,
        image_url: cp.image_url,
      })
    }
  }

  // Bezeichnungsregeln anwenden (nur aktive; manuell umbenannte überspringen)
  const activeRegeln = bezeichnungsregeln.filter((r) => r.is_active)
  for (const regel of activeRegeln) {
    items = items.map((item) => {
      if (item.is_manually_renamed) return item
      if (nameContainsKeyword(item.display_name, regel.keyword)) {
        return {
          ...item,
          display_name: normalizeKeywordInName(
            item.display_name,
            regel.keyword,
            regel.position,
          ),
        }
      }
      return item
    })
  }

  const blockMap = new Map(blocks.map((b) => [b.id, b.name]))
  items = items.map((item) => ({
    ...item,
    block_name: item.block_id ? blockMap.get(item.block_id) ?? null : null,
  }))

  if (sortMode === 'ALPHABETICAL') {
    items.sort((a, b) => a.display_name.localeCompare(b.display_name, 'de'))
  } else if (sortMode === 'BY_BLOCK') {
    const blockOrder = new Map(
      [...blocks]
        .sort((a, b) => a.order_index - b.order_index)
        .map((b, i) => [b.id, i]),
    )
    items.sort((a, b) => {
      const aOrder = a.block_id ? (blockOrder.get(a.block_id) ?? 999) : 999
      const bOrder = b.block_id ? (blockOrder.get(b.block_id) ?? 999) : 999
      if (aOrder !== bOrder) return aOrder - bOrder
      return a.display_name.localeCompare(b.display_name, 'de')
    })
  }

  const customCount = items.filter((i) => i.is_custom).length
  const stats = {
    total: items.length,
    hidden: hiddenPLUs.size,
    newCount: items.filter((i) => i.status === 'NEW_PRODUCT_YELLOW').length,
    changedCount: items.filter((i) => i.status === 'PLU_CHANGED_RED').length,
    customCount,
  }

  return { items, stats }
}
