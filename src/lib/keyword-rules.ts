// Bezeichnungsregeln: Pure Functions für Keyword-Normalisierung

import type { MasterPLUItem } from '@/types/database'
import type { Bezeichnungsregel } from '@/types/database'

/** Keyword für Regex escapen */
function escapeKeyword(keyword: string): string {
  return keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Nach dem Keyword: typische Wortgrenzen inkl. Satzzeichen (Komma, Punkt …) vor Leerzeichen oder Zeilenende */
const AFTER_KEYWORD_BOUNDARY = '(?:[\\s)\\\\]|[,;:.]+(?=\\s|$)|$)'

/**
 * Regex: Keyword nur als ganzes Wort (Wortgrenzen = Anfang/Ende, Leerzeichen, Klammern, Satzzeichen).
 * Treffen: "Bio", "(Bio)", " Bio ", "Bio Banane", "Banane Bio", "Banane Bio,", "Bio, regional".
 * Nicht treffen: "Bionda", "Biologie".
 */
function keywordAsWordRegex(keyword: string): RegExp {
  const escaped = escapeKeyword(keyword)
  return new RegExp(`(?:^|[\\s(])${escaped}${AFTER_KEYWORD_BOUNDARY}`, 'gi')
}

/**
 * Regex zum Entfernen: Vor-Grenze + Keyword + Nach-Grenze.
 * Gruppe 1: Zeichen vor dem Keyword (Zeilenanfang, Leerzeichen, "(")
 * Gruppe 2: Zeichen direkt nach dem Keyword (Whitespace, Klammern, Satzzeichen oder Ende)
 */
function keywordRemovalRegex(keyword: string): RegExp {
  const escaped = escapeKeyword(keyword)
  return new RegExp(`(^|[\\s(]+)${escaped}([\\s)\\,;:.]+|$)`, 'gi')
}

/**
 * Prüft ob das Keyword bereits an der korrekten Position steht.
 * Wenn ja, muss nichts geändert werden.
 */
export function isAlreadyCorrect(
  name: string,
  keyword: string,
  position: 'PREFIX' | 'SUFFIX',
): boolean {
  const lowerName = name.toLowerCase()
  const lowerKeyword = keyword.toLowerCase()

  if (position === 'PREFIX') {
    return (
      lowerName.startsWith(lowerKeyword + ' ') ||
      lowerName.startsWith(lowerKeyword + '(') ||
      lowerName === lowerKeyword ||
      new RegExp(`^${escapeKeyword(keyword)}[,;:.](?=\\s|$)`, 'i').test(lowerName)
    )
  } else {
    return (
      lowerName.endsWith(' ' + lowerKeyword) ||
      lowerName.endsWith('(' + lowerKeyword + ')') ||
      lowerName === lowerKeyword ||
      new RegExp(`\\s${escapeKeyword(keyword)}[,;:.]+$`, 'i').test(lowerName)
    )
  }
}

/**
 * Normalisiert ein Keyword im Produktnamen.
 * Entfernt das Keyword nur als ganzes Wort (nicht in "Bionda" etc.);
 * in Klammern bleibt Rest erhalten, leere Klammern werden entfernt.
 * Fügt das Keyword an der gewünschten Position (PREFIX/SUFFIX) ein.
 *
 * Beispiel: normalizeKeywordInName("Banane Bio", "Bio", "PREFIX") → "Bio Banane"
 * Beispiel: normalizeKeywordInName("Zitronen (Bio Demeter)", "Bio", "PREFIX") → "Bio Zitronen (Demeter)"
 */
export function normalizeKeywordInName(
  name: string,
  keyword: string,
  position: 'PREFIX' | 'SUFFIX',
): string {
  if (isAlreadyCorrect(name, keyword, position)) {
    return name
  }
  const re = keywordRemovalRegex(keyword)
  const cleanedName = name.replace(re, (_match, before: string, after: string) => {
    // Keyword entfernen: vorher + nachher zusammenfügen (inkl. Komma/Punkt in „after“)
    return before + after
  })
    .replace(/\s+/g, ' ')
    .replace(/\s*\(\s*\)\s*/g, ' ')
    .trim()

  if (position === 'PREFIX') {
    return `${keyword} ${cleanedName}`
  } else {
    return `${cleanedName} ${keyword}`
  }
}

/**
 * Prüft ob ein Name das Keyword als ganzes Wort enthält (case-insensitive).
 * Trifft z. B. "Bio", "(Bio)", " Bio ", nicht "Bionda" oder "Biologie".
 */
export function nameContainsKeyword(name: string, keyword: string): boolean {
  return keywordAsWordRegex(keyword).test(name)
}

/**
 * Wendet alle aktiven Regeln nacheinander auf einen Anzeigenamen an (wie in der Layout-Engine).
 */
export function applyActiveBezeichnungsregelnToName(
  name: string,
  regeln: Bezeichnungsregel[],
): string {
  const activeRegeln = regeln.filter((r) => r.is_active)
  let current = name
  for (const regel of activeRegeln) {
    if (nameContainsKeyword(current, regel.keyword)) {
      current = normalizeKeywordInName(current, regel.keyword, regel.position)
    }
  }
  return current
}

/** Markt-Umbenennung (Obst/Gemüse) für Bulk-Regeln: gleiche Logik wie Layout-Engine-Merge */
export type RenamedRowForRules = {
  plu: string
  store_id: string
  display_name: string
  is_manually_renamed: boolean
}

/**
 * Wie applyAllRulesToItems, aber mit marktspezifischen Einträgen aus renamed_items / backshop_renamed_items:
 * Wenn für die PLU ein Rename existiert, wird dort display_name aktualisiert, sonst Master-Tabelle.
 */
export function applyAllRulesWithRenamedMerge<
  T extends {
    id: string
    plu: string
    system_name: string
    display_name: string | null
    is_manually_renamed: boolean
  },
>(
  items: T[],
  renamedRows: RenamedRowForRules[],
  regeln: Bezeichnungsregel[],
): {
  masterUpdates: { id: string; display_name: string }[]
  renamedUpdates: RenamedRowForRules[]
} {
  const activeRegeln = regeln.filter((r) => r.is_active)
  if (activeRegeln.length === 0) {
    return { masterUpdates: [], renamedUpdates: [] }
  }

  const renamedByPlu = new Map(renamedRows.map((r) => [r.plu, r]))
  const masterUpdates: { id: string; display_name: string }[] = []
  const renamedUpdates: RenamedRowForRules[] = []

  for (const item of items) {
    const renamed = renamedByPlu.get(item.plu)
    const effective = renamed?.display_name ?? item.display_name ?? item.system_name
    const newName = applyActiveBezeichnungsregelnToName(effective, regeln)
    if (newName === effective) continue

    if (renamed) {
      renamedUpdates.push({
        plu: item.plu,
        store_id: renamed.store_id,
        display_name: newName,
        is_manually_renamed: newName !== item.system_name,
      })
    } else {
      masterUpdates.push({ id: item.id, display_name: newName })
    }
  }

  return { masterUpdates, renamedUpdates }
}

/**
 * Wendet alle aktiven Regeln auf eine Liste von Items an (nur Master-Zeilen, ohne renamed_items-Merge).
 * Gibt ein Array von {id, display_name} zurück – nur für Items die sich ändern.
 */
export function applyAllRulesToItems(
  items: MasterPLUItem[],
  regeln: Bezeichnungsregel[],
): { id: string; display_name: string }[] {
  const activeRegeln = regeln.filter((r) => r.is_active)
  if (activeRegeln.length === 0) return []

  const updates: { id: string; display_name: string }[] = []

  for (const item of items) {
    const base = item.is_manually_renamed
      ? (item.display_name ?? item.system_name)
      : item.system_name
    const currentName = applyActiveBezeichnungsregelnToName(base, regeln)

    if (currentName !== (item.display_name ?? item.system_name)) {
      updates.push({ id: item.id, display_name: currentName })
    }
  }

  return updates
}
