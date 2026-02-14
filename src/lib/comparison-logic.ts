// Vergleichs-Logik: Vergleicht neue Excel-Daten mit bestehender KW-Version

import type { MasterPLUItem } from '@/types/database'
import type {
  ParsedPLURow,
  ItemType,
  ComparisonResult,
  ComparisonSummary,
  ConflictItem,
} from '@/types/plu'

/** Key für Name-Lookup: lowercase name + item_type */
function nameKey(name: string, itemType: ItemType): string {
  return `${name.toLowerCase()}_${itemType}`
}

interface CompareInput {
  /** Geparste Zeilen aus den Excel-Dateien */
  incomingRows: ParsedPLURow[]
  /** Item-Typ (PIECE oder WEIGHT) */
  itemType: ItemType
  /** Items der aktuell aktiven Version (kann leer sein beim ersten Upload) */
  currentItems: MasterPLUItem[]
  /** Items aller früheren Versionen (für "war schon mal da"-Check) */
  previousItems: MasterPLUItem[]
  /** ID der neuen Version (wird in die Items geschrieben) */
  newVersionId: string
  /** Ist dies der allererste Upload? (keine Vorversion vorhanden) */
  isFirstUpload: boolean
}

/**
 * Vergleicht neue Excel-Daten mit der bestehenden Version.
 *
 * Entscheidungsbaum:
 * 1. PLU existiert + gleicher Name → UNCHANGED
 * 2. PLU existiert + anderer Name → CONFLICT
 * 3. Name existiert mit anderer PLU (aktuell) → PLU_CHANGED_RED
 * 4. Name existiert in früheren Versionen → PLU_CHANGED_RED
 * 5. Komplett neu → NEW_PRODUCT_YELLOW
 * 6. Erster Upload → alles UNCHANGED
 */
export function compareWithCurrentVersion(input: CompareInput): ComparisonResult {
  const {
    incomingRows,
    itemType,
    currentItems,
    previousItems,
    newVersionId,
    isFirstUpload,
  } = input

  // Lookup-Maps bauen
  const currentByPLU = new Map<string, MasterPLUItem>()
  const currentByName = new Map<string, MasterPLUItem>()

  for (const item of currentItems) {
    currentByPLU.set(item.plu, item)
    currentByName.set(nameKey(item.system_name, item.item_type as ItemType), item)
  }

  const allPreviousByName = new Map<string, MasterPLUItem>()
  for (const item of previousItems) {
    const key = nameKey(item.system_name, item.item_type as ItemType)
    // Nur setzen wenn nicht schon in aktueller Version
    if (!currentByName.has(key)) {
      allPreviousByName.set(key, item)
    }
  }

  // Ergebnis-Arrays
  const unchanged: MasterPLUItem[] = []
  const pluChanged: MasterPLUItem[] = []
  const newProducts: MasterPLUItem[] = []
  const conflicts: ConflictItem[] = []
  const allItems: MasterPLUItem[] = []
  const processedPLUs = new Set<string>()

  let duplicatesSkipped = 0

  for (const row of incomingRows) {
    // Duplikat in incoming (sollte vom Parser schon gefiltert sein, Sicherheit)
    if (processedPLUs.has(row.plu)) {
      duplicatesSkipped++
      continue
    }
    processedPLUs.add(row.plu)

    // Basis-Item erstellen
    const baseItem: MasterPLUItem = {
      id: crypto.randomUUID(),
      version_id: newVersionId,
      plu: row.plu,
      system_name: row.systemName,
      display_name: null,
      item_type: itemType,
      status: 'UNCHANGED',
      old_plu: null,
      warengruppe: row.category,
      block_id: null,
      is_admin_eigen: false,
      is_manually_renamed: false,
      preis: null,
      created_at: new Date().toISOString(),
    }

    // Sonderfall: Erster Upload → alles UNCHANGED
    if (isFirstUpload) {
      baseItem.status = 'UNCHANGED'
      unchanged.push(baseItem)
      allItems.push(baseItem)
      continue
    }

    // 1. PLU existiert in aktueller Version?
    const existingByPLU = currentByPLU.get(row.plu)
    if (existingByPLU) {
      if (existingByPLU.system_name.toLowerCase() === row.systemName.toLowerCase()) {
        // Gleiche PLU + gleicher Name → UNCHANGED
        baseItem.status = 'UNCHANGED'
        unchanged.push(baseItem)
      } else {
        // Gleiche PLU + anderer Name → CONFLICT
        conflicts.push({
          plu: row.plu,
          incomingName: row.systemName,
          existingName: existingByPLU.system_name,
          itemType,
        })
        // Item wird erst nach Konflikt-Lösung hinzugefügt
        continue
      }
      allItems.push(baseItem)
      continue
    }

    // 2. Name existiert in aktueller Version mit anderer PLU?
    const nKey = nameKey(row.systemName, itemType)
    const existingByName = currentByName.get(nKey)
    if (existingByName) {
      baseItem.status = 'PLU_CHANGED_RED'
      baseItem.old_plu = existingByName.plu
      pluChanged.push(baseItem)
      allItems.push(baseItem)
      continue
    }

    // 3. Name existiert in früheren Versionen?
    const previousItem = allPreviousByName.get(nKey)
    if (previousItem) {
      baseItem.status = 'PLU_CHANGED_RED'
      baseItem.old_plu = previousItem.plu
      pluChanged.push(baseItem)
      allItems.push(baseItem)
      continue
    }

    // 4. Komplett neu
    baseItem.status = 'NEW_PRODUCT_YELLOW'
    newProducts.push(baseItem)
    allItems.push(baseItem)
  }

  // Entfernte Produkte: In aktueller Version aber nicht in neuer
  const removed = currentItems.filter(
    (item) =>
      item.item_type === itemType && !processedPLUs.has(item.plu)
  )

  // Zusammenfassung
  const summary: ComparisonSummary = {
    total: allItems.length,
    unchanged: unchanged.length,
    pluChanged: pluChanged.length,
    newProducts: newProducts.length,
    removed: removed.length,
    conflicts: conflicts.length,
    duplicatesSkipped,
  }

  return {
    unchanged,
    pluChanged,
    newProducts,
    removed,
    conflicts,
    allItems,
    summary,
  }
}

/**
 * Wendet Konflikt-Lösungen an und gibt die finalen Items zurück.
 * Wird nach Step 3 (Konflikte lösen) aufgerufen.
 */
export function resolveConflicts(
  conflicts: ConflictItem[],
  newVersionId: string,
): MasterPLUItem[] {
  const resolved: MasterPLUItem[] = []

  for (const conflict of conflicts) {
    if (!conflict.resolution || conflict.resolution === 'ignore') {
      // Ignorieren: Bestehenden Namen behalten
      resolved.push({
        id: crypto.randomUUID(),
        version_id: newVersionId,
        plu: conflict.plu,
        system_name: conflict.existingName,
        display_name: null,
        item_type: conflict.itemType,
        status: 'UNCHANGED',
        old_plu: null,
        warengruppe: null,
        block_id: null,
        is_admin_eigen: false,
        is_manually_renamed: false,
        preis: null,
        created_at: new Date().toISOString(),
      })
    } else if (conflict.resolution === 'replace') {
      // Ersetzen: Neuen Namen übernehmen
      resolved.push({
        id: crypto.randomUUID(),
        version_id: newVersionId,
        plu: conflict.plu,
        system_name: conflict.incomingName,
        display_name: null,
        item_type: conflict.itemType,
        status: 'UNCHANGED',
        old_plu: null,
        warengruppe: null,
        block_id: null,
        is_admin_eigen: false,
        is_manually_renamed: false,
        preis: null,
        created_at: new Date().toISOString(),
      })
    }
    // 'keep_both' → kein Item (PLU-Konflikt nicht lösbar mit gleicher PLU)
  }

  return resolved
}
