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
