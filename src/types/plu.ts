// PLU-spezifische Types für Business-Logik

import type { MasterPLUItem, Block, CustomProduct } from './database'

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

/** Geparste Zeile aus Excel für eigene Produkte (Spalte 1: PLU oder Preis, 2: Name, 3: Warengruppe/Typ) */
export interface ParsedCustomProductRow {
  /** 4–5 Ziffern, oder null wenn Spalte 1 ein Preis ist */
  plu: string | null
  /** Dezimalzahl, oder null wenn Spalte 1 eine PLU ist */
  preis: number | null
  name: string
  /** Inhalt von Spalte 3 (Block-Name oder „Stück“/„Gewicht“) */
  blockNameOrType: string | null
}

/** Ergebnis des Excel-Parsers für eigene Produkte */
export interface CustomProductParseResult {
  rows: ParsedCustomProductRow[]
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
}

/** Doppelte PLU: Position des Duplikats + PLU + Position der ersten Vorkommens (zum klaren Nachschlagen). */
export interface BackshopDuplicateDetail {
  row: number
  col: number
  plu: string
  firstRow: number
  firstCol: number
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

/** Ergebnis des Backshop-Excel-Parsers */
export interface BackshopParseResult {
  rows: ParsedBackshopRow[]
  fileName: string
  totalRows: number
  skippedRows: number
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
  status: string
  old_plu: string | null
  image_url: string | null
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
  }
}
