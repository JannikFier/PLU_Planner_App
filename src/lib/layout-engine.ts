// Layout-Engine: Baut aus allen Datenquellen die finale gemeinsame PLU-Liste
//
// Datenfluss:
//   master_plu_items + custom_products - hidden_items → Bezeichnungsregeln (auch nach manueller Umbenennung, wenn Keyword als ganzes Wort vorkommt) → finale Liste

// CustomProduct Typ wird via LayoutEngineInput referenziert
import type { DisplayItem, LayoutEngineInput, LayoutEngineOutput, PLUStatus } from '@/types/plu'
import type { OfferDisplayInfo } from '@/lib/offer-display'
import type { BackshopMasterPLUItem } from '@/types/database'
import type { Block } from '@/types/database'
import { nameContainsKeyword, normalizeKeywordInName } from '@/lib/keyword-rules'
import { getKWAndYearFromDate, weeksBetweenIsoWeeks } from '@/lib/date-kw-utils'
import {
  blockOrderPositionMapFromSorted,
  effectiveBlockIdForStoreOverride,
  sortBlocksWithStoreOrder,
} from '@/lib/block-override-utils'

/**
 * Baut die finale Anzeigeliste für alle Rollen.
 *
 * Schritte:
 * 1. Master-Items als Basis übernehmen
 * 2. Custom Products hinzufügen (nur wenn PLU nicht in Master – Master hat Vorrang)
 * 3. Ausgeblendete Items herausfiltern
 * 4. Bezeichnungsregeln anwenden (bei Treffer als ganzes Wort; auch nach manueller Umbenennung)
 * 5. Block-Namen zuweisen
 * 6. Sortieren
 * 7. Statistiken berechnen
 */
export function buildDisplayList(input: LayoutEngineInput): LayoutEngineOutput {
  const {
    masterItems,
    customProducts,
    hiddenPLUs,
    offerPLUs,
    offerDisplayByPlu,
    renamedItems = [],
    bezeichnungsregeln,
    blocks,
    sortMode,
    markYellowKwCount,
    currentKwNummer,
    currentJahr,
    nameBlockOverrides,
    storeBlockOrder = [],
  } = input

  const renamedByPlu = new Map(renamedItems.map((r) => [r.plu, r]))

  // SCHRITT 1: Master-Items als Basis („Neu“-Gelb: Dauer an Kalender-KW ab Einführung in Stammdaten
  // / created_at, nicht an der Versions-KW der Liste)
  // Master-Items können optional image_url haben (Backshop); Obst/Gemüse hat keins
  const masterWithImage = masterItems as Array<{ image_url?: string | null } & (typeof masterItems)[number]>
  let items: DisplayItem[] = masterItems.map((item, idx) => {
    const renamed = renamedByPlu.get(item.plu)
    let status = item.status as PLUStatus
    if (status === 'NEW_PRODUCT_YELLOW') {
      const { kw: introKw, year: introYear } = getKWAndYearFromDate(new Date(item.created_at))
      const weeksSinceIntro = weeksBetweenIsoWeeks(
        currentKwNummer,
        currentJahr,
        introKw,
        introYear,
      )
      if (weeksSinceIntro >= markYellowKwCount) {
        status = 'UNCHANGED'
      }
    }
    return {
      id: item.id,
      plu: item.plu,
      system_name: item.system_name,
      display_name: renamed?.display_name ?? item.display_name ?? item.system_name,
      item_type: item.item_type,
      status,
      old_plu: item.old_plu,
      warengruppe: item.warengruppe,
      block_id: item.block_id,
      block_name: null, // Wird in Schritt 5 gesetzt
      preis: item.preis,
      is_custom: false,
      is_manually_renamed: renamed?.is_manually_renamed ?? item.is_manually_renamed ?? false,
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
      const weeksSinceAdded = weeksBetweenIsoWeeks(
        currentKwNummer,
        currentJahr,
        addedKw,
        addedYear,
      )
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

  // Angebot/Werbung: is_offer + Aktionspreis/Quelle
  items = items.map((item) => {
    if (offerDisplayByPlu) {
      const o = offerDisplayByPlu.get(item.plu)
      return {
        ...item,
        is_offer: o != null,
        offer_promo_price: o?.promoPrice ?? null,
        offer_source_kind: o?.source,
        offer_central_reference_price:
          o?.source === 'central' ? (o.centralReferencePrice ?? null) : undefined,
        offer_name_highlight_kind: o?.source === 'central' ? o.centralCampaignKind : undefined,
      }
    }
    const on = offerPLUs?.has(item.plu) ?? false
    return {
      ...item,
      is_offer: on,
      offer_promo_price: null,
      offer_source_kind: on ? ('manual' as const) : undefined,
      offer_name_highlight_kind: undefined,
    }
  })

  // SCHRITT 4: Bezeichnungsregeln anwenden (effektiver display_name inkl. marktspezifischer Umbenennung)
  for (const regel of bezeichnungsregeln) {
    items = items.map((item) => {
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

  // Markt: effektive Warengruppe (Name-Override vor Master-block_id)
  items = items.map((item) => ({
    ...item,
    block_id: effectiveBlockIdForStoreOverride(
      item.system_name,
      item.block_id,
      nameBlockOverrides,
    ),
  }))

  const sortedBlocksForDisplay = sortBlocksWithStoreOrder(blocks, storeBlockOrder)

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
    const blockOrder = blockOrderPositionMapFromSorted(sortedBlocksForDisplay)

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
// Backshop: Anzeigeliste (Master + Custom + Bezeichnungsregeln)
// ============================================================

/** Custom-Product-Eintrag für Backshop (id, plu, name, image_url, block_id) */
export type BackshopCustomProductInput = {
  id: string
  plu: string
  name: string
  image_url: string
  block_id?: string | null
  created_at?: string
}

/** Minimale Regel für Anzeige (keyword, position, is_active) */
export type BackshopBezeichnungsregelInput = {
  keyword: string
  position: 'PREFIX' | 'SUFFIX'
  is_active: boolean
}

/** Globale Umbenennung pro PLU (display_name, is_manually_renamed, image_url) */
export type BackshopRenamedItemInput = {
  plu: string
  display_name: string
  is_manually_renamed: boolean
  image_url?: string | null
}

export interface BackshopDisplayListInput {
  masterItems: BackshopMasterPLUItem[]
  hiddenPLUs?: Set<string>
  /** PLUs die aktuell als Angebot/Werbung gelten (für is_offer auf DisplayItem) */
  offerPLUs?: Set<string>
  offerDisplayByPlu?: Map<string, OfferDisplayInfo>
  sortMode: 'ALPHABETICAL' | 'BY_BLOCK'
  blocks?: Block[]
  /** Eigene Backshop-Produkte; werden nur hinzugefügt, wenn PLU nicht in Master vorkommt */
  customProducts?: BackshopCustomProductInput[]
  /** Bezeichnungsregeln für Anzeige (nur aktive werden angewendet) */
  bezeichnungsregeln?: BackshopBezeichnungsregelInput[]
  /** Globale Umbenennungen (überschreiben display_name, is_manually_renamed, image_url aus Master) */
  renamedItems?: BackshopRenamedItemInput[]
  /** „Neu“-Gelb: Dauer an Kalender-KW ab created_at (Master + Eigene) */
  markYellowKwCount: number
  currentKwNummer: number
  currentJahr: number
  /** Markt: normalisierter system_name → block_id */
  nameBlockOverrides?: Map<string, string>
  /** Markt: optionale Block-Reihenfolge */
  storeBlockOrder?: { block_id: string; order_index: number }[]
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
    offerPLUs,
    offerDisplayByPlu,
    sortMode,
    blocks = [],
    customProducts = [],
    bezeichnungsregeln = [],
    renamedItems = [],
    markYellowKwCount,
    currentKwNummer,
    currentJahr,
    nameBlockOverrides,
    storeBlockOrder = [],
  } = input

  const renamedByPlu = new Map(renamedItems.map((r) => [r.plu, r]))

  const masterFiltered = masterItems.filter((item) => !hiddenPLUs.has(item.plu))
  const masterPLUs = new Set(masterFiltered.map((i) => i.plu))

  const resolveBackshopOffer = (plu: string) => {
    if (offerDisplayByPlu) {
      const o = offerDisplayByPlu.get(plu)
      return {
        is_offer: o != null,
        offer_promo_price: o?.promoPrice ?? null,
        offer_source_kind: o?.source,
        offer_central_reference_price:
          o?.source === 'central' ? (o.centralReferencePrice ?? null) : undefined,
      }
    }
    const on = offerPLUs?.has(plu) ?? false
    return {
      is_offer: on,
      offer_promo_price: null as number | null,
      offer_source_kind: on ? ('manual' as const) : undefined,
      offer_central_reference_price: undefined as number | null | undefined,
    }
  }

  let items: DisplayItem[] = masterFiltered.map((item) => {
    const renamed = renamedByPlu.get(item.plu)
    const off = resolveBackshopOffer(item.plu)
    let status = item.status as import('@/types/plu').PLUStatus
    if (status === 'NEW_PRODUCT_YELLOW') {
      const { kw: introKw, year: introYear } = getKWAndYearFromDate(new Date(item.created_at))
      const w = weeksBetweenIsoWeeks(currentKwNummer, currentJahr, introKw, introYear)
      if (w >= markYellowKwCount) status = 'UNCHANGED'
    }
    return {
      id: item.id,
      plu: item.plu,
      system_name: item.system_name,
      display_name: renamed?.display_name ?? item.display_name ?? item.system_name,
      item_type: 'PIECE' as const,
      status,
      old_plu: item.old_plu,
      warengruppe: item.warengruppe,
      block_id: item.block_id,
      block_name: null as string | null,
      preis: null,
      is_custom: false,
      is_manually_renamed: renamed?.is_manually_renamed ?? item.is_manually_renamed ?? false,
      image_url: (renamed?.image_url ?? item.image_url) ?? undefined,
      is_offer: off.is_offer,
      offer_promo_price: off.offer_promo_price,
      offer_source_kind: off.offer_source_kind,
      offer_central_reference_price: off.offer_central_reference_price,
    }
  })

  for (const cp of customProducts) {
    if (!masterPLUs.has(cp.plu)) {
      const off = resolveBackshopOffer(cp.plu)
      const createdDate = cp.created_at ? new Date(cp.created_at) : new Date()
      const { kw: addedKw, year: addedYear } = getKWAndYearFromDate(createdDate)
      const w = weeksBetweenIsoWeeks(currentKwNummer, currentJahr, addedKw, addedYear)
      const status: import('@/types/plu').PLUStatus =
        w < markYellowKwCount ? 'NEW_PRODUCT_YELLOW' : 'UNCHANGED'
      items.push({
        id: cp.id,
        plu: cp.plu,
        system_name: cp.name,
        display_name: cp.name,
        item_type: 'PIECE',
        status,
        old_plu: null,
        warengruppe: null,
        block_id: cp.block_id ?? null,
        block_name: null,
        preis: null,
        is_custom: true,
        is_manually_renamed: false,
        image_url: cp.image_url,
        is_offer: off.is_offer,
        offer_promo_price: off.offer_promo_price,
        offer_source_kind: off.offer_source_kind,
        offer_central_reference_price: off.offer_central_reference_price,
      })
    }
  }

  // Bezeichnungsregeln anwenden (nur aktive; auch nach manueller Umbenennung bei Keyword-Treffer)
  const activeRegeln = bezeichnungsregeln.filter((r) => r.is_active)
  for (const regel of activeRegeln) {
    items = items.map((item) => {
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

  items = items.map((item) => ({
    ...item,
    block_id: effectiveBlockIdForStoreOverride(
      item.system_name,
      item.block_id,
      nameBlockOverrides,
    ),
  }))

  const sortedBlocksForDisplay = sortBlocksWithStoreOrder(blocks, storeBlockOrder)

  const blockMap = new Map(blocks.map((b) => [b.id, b.name]))
  items = items.map((item) => ({
    ...item,
    block_name: item.block_id ? blockMap.get(item.block_id) ?? null : null,
  }))

  if (sortMode === 'ALPHABETICAL') {
    items.sort((a, b) => a.display_name.localeCompare(b.display_name, 'de'))
  } else if (sortMode === 'BY_BLOCK') {
    const blockOrder = blockOrderPositionMapFromSorted(sortedBlocksForDisplay)
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
