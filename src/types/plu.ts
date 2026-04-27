// PLU-spezifische Types für Business-Logik

import type { MasterPLUItem, Block, CustomProduct, BackshopSource } from './database'
import type { OfferDisplayInfo, ObstCentralCampaignKind } from '@/lib/offer-display'

/** Status eines PLU-Eintrags */
export type PLUStatus = 'UNCHANGED' | 'NEW_PRODUCT_YELLOW' | 'PLU_CHANGED_RED'

/** Typ eines PLU-Artikels */
export type ItemType = 'PIECE' | 'WEIGHT'

/** Anzeige-Item nach Layout-Engine (fertig für UI + PDF) */
export interface DisplayItem {
  id: string
  plu: string
  system_name: string
  display_name: string
  item_type: ItemType
  status: PLUStatus
  old_plu: string | null
  warengruppe: string | null
  block_id: string | null
  block_name: string | null
  preis: number | null
  is_custom: boolean
  is_manually_renamed: boolean
  created_by?: string
  /** Optional: Bild-URL (Backshop-Liste); bei Obst/Gemüse immer undefined */
  image_url?: string | null
  /** In der Werbung/Angebot (aktuell aktiv) */
  is_offer?: boolean
  /** Aktions-VK (zentral oder manuell); Anzeige in Preis-Spalte wenn gesetzt */
  offer_promo_price?: number | null
  /** Woher kommt die Werbung (Megafon vs. eigenes Angebot) */
  offer_source_kind?: 'central' | 'manual'
  /** Nur bei zentraler Werbung: Original-Kampagnenpreis (wenn eigener VK abweicht) */
  offer_central_reference_price?: number | null
  /**
   * Nur Obst/Gemüse, zentrale Werbung: Namenszelle hervorheben (nicht PLU-Spalte).
   * Neu/PLU geändert bleiben an der PLU-Zelle.
   */
  offer_name_highlight_kind?: ObstCentralCampaignKind
  /** Backshop: Quelle des Artikels (edeka | harry | aryzta). Nur digital, nicht im PDF anzeigen. */
  backshop_source?: BackshopSource | null
  /** Backshop: Wenn Gruppe mehrere Sources liefert, Sammelzeile „Mehrere Marken“ (deprecated; Platzhalter werden nicht mehr erzeugt). */
  backshop_is_multi_source_placeholder?: boolean
  /**
   * Backshop: Nur digital – wenn Markt nur eine **Teil**-Markenwahl (Teilmenge der Gruppe) hat:
   * Anzahl weiterer in der Gruppe vorkommender **Quellen**, die aktuell nicht mitgewählt sind.
   */
  backshop_other_group_sources_count?: number
  /** Backshop: Nur digital – `focusGroup` im Marken-Tinder verlinken. */
  backshop_tinder_group_id?: string
}

/** Geparste Zeile aus einer Excel-Datei */
export interface ParsedPLURow {
  plu: string
  systemName: string
  category: string | null
}

/** Ergebnis des Excel-Parsers */
export interface ExcelParseResult {
  rows: ParsedPLURow[]
  fileName: string
  itemType: ItemType
  kwNummer: number | null
  totalRows: number
  skippedRows: number
}

/** Geparste Zeile aus Excel für eigene Produkte (Spalte 1: PLU oder Preis, 2: Name, 3: Warengruppe und/oder Typ) */
export interface ParsedCustomProductRow {
  /** 4–5 Ziffern, oder null wenn Spalte 1 ein Preis ist */
  plu: string | null
  /** Dezimalzahl, oder null wenn Spalte 1 eine PLU ist */
  preis: number | null
  name: string
  /** Spalte 3: Block-Name oder „Stück“/„Gewicht“ (je nach Layout) */
  blockNameOrType: string | null
  /** Optional Spalte 4: Stück/Gewicht, wenn Spalte 3 die Warengruppe ist (Layout: getrennt + nach Blöcken) */
  typColumn?: string | null
}

/** Ergebnis des Excel-Parsers für eigene Produkte */
export interface CustomProductParseResult {
  rows: ParsedCustomProductRow[]
  fileName: string
  totalRows: number
  skippedRows: number
}

/** Geparste Zeile aus Excel für Werbung/Angebot (Spalte 1: PLU, 2: Name optional, 3: Wochen 1–4) */
export interface ParsedOfferItemRow {
  plu: string
  name?: string
  weeks: number
}

/** Ergebnis des Excel-Parsers für Werbung/Angebot */
export interface OfferItemsParseResult {
  rows: ParsedOfferItemRow[]
  fileName: string
  totalRows: number
  skippedRows: number
}

/** Zeile aus Exit-/Wochenwerbung-Excel (Zentrale) */
export interface ParsedExitWerbungRow {
  artNr: string
  artikel: string
  inhalt: string
  aktUvp: number | null
  rowIndex: number
}

export interface ExitWerbungParseResult {
  rows: ParsedExitWerbungRow[]
  fileName: string
  totalRows: number
  skippedRows: number
}

/** Geparste Zeile aus Backshop-Excel (PLU, Name, optional Bild-Referenz) */
export interface ParsedBackshopRow {
  plu: string
  systemName: string
  /** Spaltenindex der Abbildung (für spätere Bild-Extraktion); -1 wenn nicht erkannt */
  imageColumnIndex: number
  /** Rohdaten für Bild: z. B. Bild-URL aus Zelle oder Platzhalter; erst nach Upload in Storage gesetzt */
  imageUrl: string | null
  /** 0-basierte Zeile der Bildzelle (für Zuordnung bei Excel-Bild-Extraktion) */
  imageSheetRow0?: number
  /** 0-basierte Spalte der Bildzelle (für Zuordnung bei Excel-Bild-Extraktion) */
  imageSheetCol0?: number
  /** 1-basierte Zeile der PLU-Zelle (für Duplikat-/Übersichts-Anzeige) */
  pluSheetRow?: number
  /** 1-basierte Spalte der PLU-Zelle (für Duplikat-/Übersichts-Anzeige) */
  pluSheetCol?: number
}

/** Position in der Excel (1-basiert, wie in Excel angezeigt). */
export interface BackshopSkippedPosition {
  row: number
  col: number
  /** Rohinhalt der PLU-Zelle bei „ungültige PLU“ (gekürzt), zur Diagnose in der UI. */
  rawCell?: string
}

/** Doppelte PLU: Position des Duplikats + PLU + Position der ersten Vorkommens (zum klaren Nachschlagen). */
export interface BackshopDuplicateDetail {
  row: number
  col: number
  plu: string
  firstRow: number
  firstCol: number
  /**
   * 0-basiert: erwartete Bild-Zelle für diese zweite (übersprungene) PLU.
   * Wird für Diagnose genutzt (z. B. „Bild ohne Zeile“ = Duplikat in der Excel).
   */
  orphanImageSheetRow0?: number
  orphanImageSheetCol0?: number
}

/** Aufschlüsselung: warum Zeilen übersprungen wurden (pro Datei). */
export interface BackshopSkippedReasons {
  invalidPlu: number
  emptyName: number
  duplicatePlu: number
}

/** Pro Grund die Liste der Positionen (Zeile/Spalte 1-basiert) zum Nachschlagen in der Excel. */
export interface BackshopSkippedDetails {
  invalidPlu: BackshopSkippedPosition[]
  emptyName: BackshopSkippedPosition[]
  duplicatePlu: BackshopDuplicateDetail[]
}

/** Gleiche Bezeichnung (Name), aber verschiedene PLU – für Übersicht „Wo ist das Problem?“ */
export interface SameNameDifferentPluEntry {
  name: string
  occurrences: { plu: string; row: number; col: number }[]
}

/** Wie die automatische Analyse das Excel-Layout eingestuft hat (für Dialog-Anzeige). */
export type BackshopDetectedLayout = 'classic_rows' | 'kassenblatt_blocks'

/** Ergebnis des Backshop-Excel-Parsers */
export interface BackshopParseResult {
  rows: ParsedBackshopRow[]
  fileName: string
  totalRows: number
  skippedRows: number
  /** Erkanntes bzw. durch manuelles Mapping gewähltes Layout (Auto-Parse vs. manuelle Zuordnung). */
  detectedLayout: BackshopDetectedLayout
  /** Aufschlüsselung der übersprungenen Zeilen (nur gesetzt wenn skippedRows > 0). */
  skippedReasons?: BackshopSkippedReasons
  /** Zeile/Spalte pro übersprungener Position (1-basiert, zum Nachschlagen in der Excel). */
  skippedDetails?: BackshopSkippedDetails
  /** Gleiche Bezeichnung, verschiedene PLU (nur Namen mit mind. 2 verschiedenen PLUs). */
  sameNameDifferentPlu?: SameNameDifferentPluEntry[]
  /** Welche Spalte als PLU erkannt wurde (0-basiert) */
  pluColumnIndex: number
  /** Welche Spalte als Name/Warentext erkannt wurde */
  nameColumnIndex: number
  /** Ob Abbildungs-Spalte gefunden wurde */
  hasImageColumn: boolean
}

/** Ein Backshop-Master-Item für Vergleich (mit optionalem image_url) */
export interface BackshopCompareItem {
  id: string
  plu: string
  system_name: string
  display_name: string | null
  is_manually_renamed: boolean
  status: string
  old_plu: string | null
  image_url: string | null
  /** Zentrale manuelle Nachbesserung (Quelle manual) */
  is_manual_supplement?: boolean
  /** Im Upload-Flow: vorgeschlagene oder vom User gewählte Warengruppe (block_id) */
  block_id?: string | null
}

/** Ergebnis des Backshop-Vergleichs (Items inkl. image_url, Bild-Erhalt aus Vorversion) */
export interface BackshopComparisonResult {
  unchanged: BackshopCompareItem[]
  pluChanged: BackshopCompareItem[]
  newProducts: BackshopCompareItem[]
  removed: BackshopCompareItem[]
  conflicts: { plu: string; incomingName: string; existingName: string }[]
  allItems: BackshopCompareItem[]
  summary: ComparisonSummary
}

/** Ergebnis des KW-Vergleichs */
export interface ComparisonResult {
  unchanged: MasterPLUItem[]
  pluChanged: MasterPLUItem[]
  newProducts: MasterPLUItem[]
  removed: MasterPLUItem[]
  conflicts: ConflictItem[]
  allItems: MasterPLUItem[]
  summary: ComparisonSummary
}

/** Zusammenfassung des Vergleichs */
export interface ComparisonSummary {
  total: number
  unchanged: number
  pluChanged: number
  newProducts: number
  removed: number
  conflicts: number
  duplicatesSkipped: number
}

/** Ein Konflikt: gleiche PLU, anderer Name */
export interface ConflictItem {
  plu: string
  incomingName: string
  existingName: string
  itemType: ItemType
  resolution?: 'replace' | 'ignore' | 'keep_both'
}

/** Input für die Layout-Engine */
export interface LayoutEngineInput {
  masterItems: MasterPLUItem[]
  customProducts: CustomProduct[]
  hiddenPLUs: Set<string>
  /** PLUs die aktuell als Angebot/Werbung gelten (für is_offer auf DisplayItem) */
  offerPLUs?: Set<string>
  /** Rich: Preis + Quelle; hat Vorrang vor offerPLUs */
  offerDisplayByPlu?: Map<string, OfferDisplayInfo>
  /** Marktspezifische Umbenennungen (überschreiben display_name, is_manually_renamed aus Master) */
  renamedItems?: { plu: string; display_name: string; is_manually_renamed: boolean }[]
  bezeichnungsregeln: { keyword: string; position: 'PREFIX' | 'SUFFIX'; case_sensitive: boolean }[]
  blocks: Block[]
  sortMode: 'ALPHABETICAL' | 'BY_BLOCK'
  displayMode: 'MIXED' | 'SEPARATED'
  markRedKwCount: number
  markYellowKwCount: number
  /** KW der angezeigten Version (wann die Master-Items „dazukamen“) */
  versionKwNummer: number
  versionJahr: number
  /** Aktuelle Kalenderwoche/Jahr (heute) – für „wie lange als neu anzeigen“ */
  currentKwNummer: number
  currentJahr: number
  /** Markt: normalisierter system_name → block_id (optional) */
  nameBlockOverrides?: Map<string, string>
  /** Markt: optionale Reihenfolge der Warengruppen; leer = globale order_index */
  storeBlockOrder?: { block_id: string; order_index: number }[]
  /** Markt-Carryover: synthetische Master-Zeilen (PLU nicht in Zentral-Master dieser Version) */
  carryoverMasterItems?: MasterPLUItem[]
  /**
   * PLUs mit manueller Nachbesserung in der Vorversion (Carryover-Quelle).
   * `null` = keine Vorversion; `undefined` = Overlay aus — nur DB-Status für Gelb.
   */
  obstPrevManualPluSet?: Set<string> | null
}

/** Output der Layout-Engine */
export interface LayoutEngineOutput {
  items: DisplayItem[]
  stats: {
    total: number
    hidden: number
    newCount: number
    changedCount: number
    customCount: number
    /** Backshop: Anzahl Produktgruppen ohne Marken-Entscheidung (Mehrere Marken möglich). */
    unresolvedGroupCount?: number
  }
}
