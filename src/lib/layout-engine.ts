// Layout-Engine: Baut aus allen Datenquellen die finale gemeinsame PLU-Liste
//
// Datenfluss:
//   master_plu_items + custom_products - hidden_items → Bezeichnungsregeln (auch nach manueller Umbenennung, wenn Keyword als ganzes Wort vorkommt) → finale Liste

// CustomProduct Typ wird via LayoutEngineInput referenziert
import type { DisplayItem, LayoutEngineInput, LayoutEngineOutput, PLUStatus } from '@/types/plu'
import type { BackshopSource } from '@/types/database'
import type { OfferDisplayInfo } from '@/lib/offer-display'
import type { BackshopMasterPLUItem } from '@/types/database'
import type { Block } from '@/types/database'
import { nameContainsKeyword, normalizeKeywordInName } from '@/lib/keyword-rules'
import { getKWAndYearFromDate, weeksBetweenIsoWeeks } from '@/lib/date-kw-utils'
import {
  blockOrderPositionMapFromSorted,
  effectiveBlockIdForStoreOverride,
  sanitizeEffectiveBlockId,
  sortBlocksWithStoreOrder,
} from '@/lib/block-override-utils'
import { backshopMasterDisplayStatus, obstMasterDisplayStatus } from '@/lib/notification-neu-tab-merge'
import { resolveEffectiveChosenSourcesForGroupFilter } from '@/lib/backshop-group-effective-chosen'

/** Markt-Carryover (`carryover-*`): Namen nicht per Bezeichnungsregeln umbauen — entspricht dem Dialog „Raus“. */
function isCarryoverLayoutItem(item: { id: string }): boolean {
  return item.id.startsWith('carryover-')
}

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
    masterItems: masterItemsRaw,
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
    carryoverMasterItems = [],
    obstPrevManualPluSet,
  } = input

  const masterPluSet = new Set(masterItemsRaw.map((i) => i.plu))
  const carryoverOnly = (carryoverMasterItems ?? []).filter((c) => !masterPluSet.has(c.plu))
  const masterItems = [...masterItemsRaw, ...carryoverOnly]

  const renamedByPlu = new Map(renamedItems.map((r) => [r.plu, r]))

  // SCHRITT 1: Master-Items als Basis — „Neu“-Gelb: DB-Status + optional direkte manuelle Nachbesserungen
  // (analog Glocke Tab „Neu“, siehe obstPrevManualPluSet).
  // Kein zeitliches Ausblenden für Master; mark_yellow_kw_count gilt für eigene Produkte (Custom) unten.
  // Master-Items können optional image_url haben (Backshop); Obst/Gemüse hat keins
  const masterWithImage = masterItems as Array<{ image_url?: string | null } & (typeof masterItems)[number]>
  let items: DisplayItem[] = masterItems.map((item, idx) => {
    const renamed = renamedByPlu.get(item.plu)
    const status = obstMasterDisplayStatus(item, obstPrevManualPluSet)
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
      if (isCarryoverLayoutItem(item)) return item
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

  // Markt: effektive Warengruppe (Name-Override vor Master-block_id); tote UUIDs → „Ohne“
  const validObstBlockIds = new Set(blocks.map((b) => b.id))
  items = items.map((item) => ({
    ...item,
    block_id: sanitizeEffectiveBlockId(
      effectiveBlockIdForStoreOverride(item.system_name, item.block_id, nameBlockOverrides),
      validObstBlockIds,
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
  /**
   * Multi-Source: Map von `${plu}|${source}` → groupId.
   * Items, die zu einer Gruppe gehören, werden nach Marken-Wahl gefiltert.
   */
  productGroupByPluSource?: Map<string, string>
  /**
   * Multi-Source: pro Gruppe die vorkommenden Quellen (Members).
   * Optional: wird aus `productGroupByPluSource` abgeleitet, wenn nicht gesetzt.
   */
  memberSourcesByGroup?: Map<string, Set<BackshopSource>>
  /** Multi-Source: groupId → ausgewählte Quellen (leer = alle Member anzeigen). */
  chosenSourcesByGroup?: Map<string, BackshopSource[]>
  /** Multi-Source: groupId → Display-Name (für Sammelzeile „Mehrere Marken“). */
  productGroupNames?: Map<string, string>
  /**
   * Pro Markt: bevorzugte Quelle pro Warengruppe (Block) aus `backshop_source_rules_per_store`.
   * Gilt für Master-Zeilen **ohne** Treffer in `productGroupByPluSource` (keine Multi-Source-Gruppe).
   */
  blockPreferredSourceByBlockId?: Map<string, BackshopSource>
  /** Multi-Source: groupId → `block_id` der Produktgruppe (für Fallback der Grundregel bei leerer Markenwahl). */
  groupBlockIdByGroupId?: Map<string, string | null>
  /**
   * Markt: Master-Zeilen (`plu|source`) trotz Block-/Gruppenfilter in die Liste zwingen.
   * Wird angewendet nach der normalen Filterlogik; `hiddenPLUs` hat Vorrang (keine Einblendung manuell ausgeblendeter PLUs).
   */
  lineForceShowKeys?: Set<string>
  /** Markt: Master-Zeilen (`plu|source`) gezielt aus der Liste nehmen (nach dem normalen Filter). */
  lineForceHideKeys?: Set<string>
  /** Markt-Carryover: synthetische Master-Zeilen (PLU fehlt in Zentral-Backshop-Master) */
  carryoverMasterItems?: BackshopMasterPLUItem[]
  /**
   * PLUs mit `source = manual` in der Vorversion (Carryover-Quelle).
   * `null` = keine Vorversion; `undefined` = Overlay aus.
   */
  backshopPrevManualPluSet?: Set<string> | null
}

/** Leitet Member-Quellen pro Gruppe aus der PLU|source → groupId-Map ab. */
export function deriveMemberSourcesByGroup(
  productGroupByPluSource: Map<string, string> | undefined,
): Map<string, Set<BackshopSource>> {
  const out = new Map<string, Set<BackshopSource>>()
  if (!productGroupByPluSource) return out
  for (const [key, gId] of productGroupByPluSource) {
    const idx = key.lastIndexOf('|')
    if (idx < 0) continue
    const source = key.slice(idx + 1) as BackshopSource
    let s = out.get(gId)
    if (!s) {
      s = new Set<BackshopSource>()
      out.set(gId, s)
    }
    s.add(source)
  }
  return out
}

type BackshopGroupFilterMeta = {
  state: 'show_all' | 'full' | 'partial'
  vset: Set<BackshopSource>
  memberSet: Set<BackshopSource>
  unchosenSourceCount: number
}

function computeBackshopGroupFilterMeta(
  memberSet: Set<BackshopSource>,
  rawChosen: BackshopSource[] | undefined,
): BackshopGroupFilterMeta {
  const valid = [...new Set((rawChosen ?? []).filter((s) => memberSet.has(s)))]
  if (valid.length === 0) {
    return { state: 'show_all', vset: new Set(), memberSet, unchosenSourceCount: 0 }
  }
  const vset = new Set(valid)
  if (
    memberSet.size > 0 &&
    vset.size === memberSet.size &&
    [...memberSet].every((s) => vset.has(s))
  ) {
    return { state: 'full', vset, memberSet, unchosenSourceCount: 0 }
  }
  let unchosenSourceCount = 0
  for (const s of memberSet) {
    if (!vset.has(s)) unchosenSourceCount++
  }
  return { state: 'partial', vset, memberSet, unchosenSourceCount }
}

/**
 * Baut die Anzeigeliste für die Backshop-Liste: Master (gefiltert nach hidden) + Custom Products.
 * Custom Products werden nur hinzugefügt, wenn PLU nicht in Master vorkommt.
 * Gibt DisplayItem[] mit item_type 'PIECE' und image_url zurück.
 */
export function buildBackshopDisplayList(input: BackshopDisplayListInput): LayoutEngineOutput {
  const {
    masterItems: masterItemsRaw,
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
    productGroupByPluSource,
    memberSourcesByGroup: memberSourcesByGroupInput,
    chosenSourcesByGroup,
    blockPreferredSourceByBlockId,
    groupBlockIdByGroupId,
    carryoverMasterItems = [],
    backshopPrevManualPluSet,
    lineForceShowKeys: lineForceShowKeysInput,
    lineForceHideKeys: lineForceHideKeysInput,
  } = input

  const lineForceShowKeys = lineForceShowKeysInput ?? new Set<string>()
  const lineForceHideKeys = lineForceHideKeysInput ?? new Set<string>()

  const masterPluSet = new Set(masterItemsRaw.map((i) => i.plu))
  const carryoverOnly = (carryoverMasterItems ?? []).filter((c) => !masterPluSet.has(c.plu))
  const masterItems = [...masterItemsRaw, ...carryoverOnly]

  const renamedByPlu = new Map(renamedItems.map((r) => [r.plu, r]))

  const memberSourcesByGroup =
    memberSourcesByGroupInput ?? deriveMemberSourcesByGroup(productGroupByPluSource)
  const groupFilterMetaById = new Map<string, BackshopGroupFilterMeta>()
  if (productGroupByPluSource) {
    for (const gId of new Set(productGroupByPluSource.values())) {
      const memberSet = memberSourcesByGroup.get(gId) ?? new Set<BackshopSource>()
      const effectiveChosen = resolveEffectiveChosenSourcesForGroupFilter(
        memberSet,
        chosenSourcesByGroup?.get(gId),
        groupBlockIdByGroupId?.get(gId) ?? undefined,
        blockPreferredSourceByBlockId,
      )
      let meta = computeBackshopGroupFilterMeta(memberSet, effectiveChosen)
      // Produktgruppe enthält die Grundregel-Marke nicht (z. B. nur Edeka, Regel Harry): nicht
      // "alle Quellen" — sonst bleiben Duplikat-Gruppen sichtbar. Wie Teilmenge ohne Treffer: nur Angebote.
      const gBlock = groupBlockIdByGroupId?.get(gId) ?? undefined
      const blockPref =
        gBlock && blockPreferredSourceByBlockId?.size
          ? blockPreferredSourceByBlockId.get(gBlock)
          : undefined
      if (
        meta.state === 'show_all' &&
        blockPref &&
        gBlock &&
        memberSet.size > 0 &&
        !memberSet.has(blockPref)
      ) {
        meta = {
          state: 'partial',
          vset: new Set<BackshopSource>(),
          memberSet,
          unchosenSourceCount: memberSet.size,
        }
      }
      groupFilterMetaById.set(gId, meta)
    }
  }

  // Multi-Source-Filter: leer = alle Quellen (oder Fallback Grundregel); volle Menge = alle; Teilmenge = filtern
  const masterFilteredHidden = masterItems.filter((item) => !hiddenPLUs.has(item.plu))
  const masterFiltered = productGroupByPluSource
    ? masterFilteredHidden.filter((item) => {
        const src = ((item as { source?: BackshopSource | null }).source ?? 'edeka') as BackshopSource
        const groupId = productGroupByPluSource.get(`${item.plu}|${src}`)
        if (!groupId) {
          // Keine Multi-Source-Gruppe: optionale Warengruppen-Regel (Block → bevorzugte Marke) am Markt
          const row = item as BackshopMasterPLUItem
          if (src === 'manual' || row.is_manual_supplement) return true
          if (!blockPreferredSourceByBlockId || blockPreferredSourceByBlockId.size === 0) {
            return true
          }
          const bid = row.block_id
          if (!bid) return true
          const pref = blockPreferredSourceByBlockId.get(bid)
          if (!pref) return true
          if (src === pref) return true
          const o = offerDisplayByPlu?.get(item.plu)
          if (o) return true
          return false
        }
        const meta =
          groupFilterMetaById.get(groupId) ?? computeBackshopGroupFilterMeta(new Set(), undefined)
        if (meta.state === 'show_all' || meta.state === 'full') {
          return true
        }
        if (meta.vset.has(src)) return true
        // Angebote der aktuellen KW (zentral + manuell in offerDisplayByPlu) bleiben
        // sichtbar, unabhängig von der Markenwahl.
        const o = offerDisplayByPlu?.get(item.plu)
        if (o) return true
        return false
      })
    : masterFilteredHidden

  const backshopLineKey = (item: { plu: string; source?: BackshopSource | null }) =>
    `${item.plu}|${((item as { source?: BackshopSource | null }).source ?? 'edeka') as BackshopSource}`

  let masterFilteredForDisplay = masterFiltered.filter(
    (item) => !lineForceHideKeys.has(backshopLineKey(item)),
  )
  const inDisplay = new Set(masterFilteredForDisplay.map((item) => backshopLineKey(item)))
  for (const item of masterItems) {
    const k = backshopLineKey(item)
    if (!lineForceShowKeys.has(k)) continue
    if (hiddenPLUs.has(item.plu)) continue
    if (inDisplay.has(k)) continue
    masterFilteredForDisplay = [...masterFilteredForDisplay, item]
    inDisplay.add(k)
  }

  const masterPLUs = new Set(masterFilteredForDisplay.map((i) => i.plu))

  const resolveBackshopOffer = (plu: string, itemSource: BackshopSource) => {
    if (offerDisplayByPlu) {
      const o = offerDisplayByPlu.get(plu)
      // Zentrale Edeka-Werbung darf nur Edeka-Produkte markieren.
      if (o && o.source === 'central' && itemSource !== 'edeka') {
        return {
          is_offer: false,
          offer_promo_price: null as number | null,
          offer_source_kind: undefined as 'manual' | 'central' | undefined,
          offer_central_reference_price: undefined as number | null | undefined,
        }
      }
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

  let items: DisplayItem[] = masterFilteredForDisplay.map((item) => {
    const renamed = renamedByPlu.get(item.plu)
    const itemSource = (((item as { source?: BackshopSource | null }).source ?? 'edeka') as BackshopSource)
    const off = resolveBackshopOffer(item.plu, itemSource)
    const status = backshopMasterDisplayStatus(item, backshopPrevManualPluSet)
    const gId = productGroupByPluSource?.get(`${item.plu}|${itemSource}`)
    const gMeta = gId ? groupFilterMetaById.get(gId) : undefined
    const partialHint =
      gId && gMeta?.state === 'partial'
        ? {
            backshop_tinder_group_id: gId,
            backshop_other_group_sources_count: gMeta.unchosenSourceCount,
          }
        : undefined
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
      backshop_source: (item as { source?: import('@/types/database').BackshopSource | null }).source ?? 'edeka',
      ...partialHint,
    }
  })

  for (const cp of customProducts) {
    if (!masterPLUs.has(cp.plu)) {
      // Eigene Produkte sind Markt-individuell und zählen für Angebots-Matching als 'edeka'.
      const off = resolveBackshopOffer(cp.plu, 'edeka')
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
      if (isCarryoverLayoutItem(item)) return item
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

  const validBackshopBlockIds = new Set(blocks.map((b) => b.id))
  items = items.map((item) => ({
    ...item,
    block_id: sanitizeEffectiveBlockId(
      effectiveBlockIdForStoreOverride(item.system_name, item.block_id, nameBlockOverrides),
      validBackshopBlockIds,
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
    /** Nicht mehr für PDF-Sperre: leere Marken-Wahl zeigt alle Produkte (kein „Konflikt“). */
    unresolvedGroupCount: 0,
  }

  return { items, stats }
}
