// Bezeichnungsregeln: Pure Functions für Keyword-Normalisierung

import type { MasterPLUItem } from '@/types/database'
import type { Bezeichnungsregel } from '@/types/database'

/** Keyword für Regex escapen */
function escapeKeyword(keyword: string): string {
  return keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Regex: Keyword nur als ganzes Wort (Wortgrenzen = Anfang/Ende, Leerzeichen, Klammern).
 * Treffen: "Bio", "(Bio)", " Bio ", "Bio Banane", "Banane Bio".
 * Nicht treffen: "Bionda", "Biologie".
 */
function keywordAsWordRegex(keyword: string): RegExp {
  const escaped = escapeKeyword(keyword)
  return new RegExp(`(?:^|[\\s(])${escaped}(?:[\\s)\\\\]|$)`, 'gi')
}

/**
 * Regex zum Entfernen: Vor-Grenze + Keyword + Nach-Grenze (mit Capturing-Gruppen für Klammer-Logik).
 * Gruppe 1: Zeichen vor dem Keyword (Leerzeichen und/oder "(")
 * Gruppe 2: Zeichen nach dem Keyword (Leerzeichen und/oder ")")
 */
function keywordRemovalRegex(keyword: string): RegExp {
  const escaped = escapeKeyword(keyword)
  return new RegExp(`(^|[\\s(]+)${escaped}([\\s)\\\\]+|$)`, 'gi')
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
  const re = keywordRemovalRegex(keyword)
  const cleanedName = name.replace(re, (_match, before: string, after: string) => {
    const keepLeft = before.includes('(') ? '(' : ' '
    const keepRight = after.includes(')') ? ')' : ' '
    return keepLeft + keepRight
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
      lowerName === lowerKeyword
    )
  } else {
    return (
      lowerName.endsWith(' ' + lowerKeyword) ||
      lowerName.endsWith('(' + lowerKeyword + ')') ||
      lowerName === lowerKeyword
    )
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
 * Wendet alle aktiven Regeln auf eine Liste von Items an.
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
    // Ausgangspunkt: system_name (Original aus Excel)
    let currentName = item.system_name

    // Alle aktiven Regeln der Reihe nach anwenden
    for (const regel of activeRegeln) {
      if (nameContainsKeyword(currentName, regel.keyword)) {
        currentName = normalizeKeywordInName(currentName, regel.keyword, regel.position)
      }
    }

    // Nur wenn sich etwas geändert hat
    if (currentName !== (item.display_name ?? item.system_name)) {
      updates.push({ id: item.id, display_name: currentName })
    }
  }

  return updates
}
