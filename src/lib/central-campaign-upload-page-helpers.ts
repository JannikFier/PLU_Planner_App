/**
 * Reine Hilfen für CentralCampaignUploadPage (Stufe 4.6) – ohne React.
 */

import type { ObstWerbungPluExcelParseResult } from '@/lib/obst-werbung-plu-excel'
import { buildObstWerbungMatchRows, type ObstWerbungMatchRow } from '@/lib/obst-werbung-match-rows'
import type { MasterPluCandidate } from '@/lib/exit-offer-matching'
import type { CampaignReviewRow } from '@/components/plu/CampaignReviewTable'

/** Zentrale Obst-Werbung: nur Markierung (Namen-Gelb); kein Aktionspreis aus Excel */
export const CENTRAL_OBST_CAMPAIGN_MARK_ONLY_PROMO_PRICE = 0

export type ObstCampaignUploadState = {
  fileName: string
  skippedRows: number
  matchRows: ObstWerbungMatchRow[]
}

export function buildObstCampaignUploadState(
  parsed: ObstWerbungPluExcelParseResult,
  masterPluSet: Set<string>,
  masterCandidates: MasterPluCandidate[],
): ObstCampaignUploadState {
  const matchRows = buildObstWerbungMatchRows(parsed.lines, masterPluSet, masterCandidates)
  return {
    fileName: parsed.fileName,
    skippedRows: parsed.skippedRows,
    matchRows,
  }
}

/**
 * Mappt Obst-MatchRows auf die wiederverwendbare CampaignReviewRow-Struktur.
 */
export function reviewRowsFromObstMatchRows(matchRows: ObstWerbungMatchRow[]): CampaignReviewRow[] {
  return matchRows.map((mr, idx) => ({
    id: `${mr.line.excelPlu}-${mr.line.rowIndex}-${idx}`,
    rowIndex: mr.line.rowIndex,
    sourcePlu: mr.line.excelPlu,
    sourceArtikel: mr.line.artikelHint || null,
    selectedPlu: mr.selectedPlu || null,
    origin: mr.selectedPlu ? 'excel' : 'unassigned',
  }))
}

export function linesFromObstMatchRows(
  matchRows: ObstWerbungMatchRow[],
): Array<{
  plu: string | null
  promo_price: number
  source_plu: string | null
  source_artikel: string | null
  origin: 'excel' | 'unassigned'
}> {
  const seenPlu = new Set<string>()
  const out: Array<{
    plu: string | null
    promo_price: number
    source_plu: string | null
    source_artikel: string | null
    origin: 'excel' | 'unassigned'
  }> = []
  for (const r of matchRows) {
    const source_plu = r.line.excelPlu || null
    const source_artikel = r.line.artikelHint || null
    if (r.selectedPlu) {
      if (seenPlu.has(r.selectedPlu)) continue
      seenPlu.add(r.selectedPlu)
      out.push({
        plu: r.selectedPlu,
        promo_price: CENTRAL_OBST_CAMPAIGN_MARK_ONLY_PROMO_PRICE,
        source_plu,
        source_artikel,
        origin: 'excel',
      })
    } else {
      out.push({
        plu: null,
        promo_price: CENTRAL_OBST_CAMPAIGN_MARK_ONLY_PROMO_PRICE,
        source_plu,
        source_artikel,
        origin: 'unassigned',
      })
    }
  }
  return out
}

export function countUsableObstLines(matchRows: ObstWerbungMatchRow[]): number {
  const seen = new Set<string>()
  for (const r of matchRows) {
    if (!r.selectedPlu) continue
    seen.add(r.selectedPlu)
  }
  return seen.size
}

export function centralCampaignWeekKey(kw: number, year: number): string {
  return `${year}-${kw}`
}
