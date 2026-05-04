// Review-Zeilen für zentrale Obst-Werbung: Auto-PLU + Namens-Vorschlag wie Exit/Backshop

import { rankExitRowMatches } from '@/lib/exit-offer-matching'
import type { MasterPluCandidate } from '@/lib/exit-offer-matching'
import type { ParsedObstWerbungLine } from '@/lib/obst-werbung-plu-excel'

export interface ObstWerbungMatchRow {
  line: ParsedObstWerbungLine
  /** Gewählte Master-PLU (leer = nicht zuordnen / nicht speichern) */
  selectedPlu: string
  /** Anzeige bei mehreren Master-Kandidaten mit gleicher PLU */
  selectedMasterDisplay?: { label: string; source?: MasterPluCandidate['source'] } | null
}

/**
 * Initialzuordnung: Excel-PLU = Master-PLU wenn vorhanden, sonst bester Namens-Treffer.
 */
export function buildObstWerbungMatchRows(
  lines: ParsedObstWerbungLine[],
  masterPluSet: Set<string>,
  masterCandidates: MasterPluCandidate[],
): ObstWerbungMatchRow[] {
  return lines.map((line) => {
    if (masterPluSet.has(line.excelPlu)) {
      return { line, selectedPlu: line.excelPlu }
    }
    const cands = rankExitRowMatches(line.artikelHint, masterCandidates, 12)
    return { line, selectedPlu: cands[0]?.plu ?? '' }
  })
}
