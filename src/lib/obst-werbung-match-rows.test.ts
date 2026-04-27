import { buildObstWerbungMatchRows } from '@/lib/obst-werbung-match-rows'
import type { ParsedObstWerbungLine } from '@/lib/obst-werbung-plu-excel'
import type { MasterPluCandidate } from '@/lib/exit-offer-matching'

describe('buildObstWerbungMatchRows', () => {
  const candidates: MasterPluCandidate[] = [
    { plu: '41175', label: 'Radieschen lose' },
    { plu: '50000', label: 'Anderes Produkt' },
  ]

  it('setzt selectedPlu = excelPlu wenn in Master', () => {
    const lines: ParsedObstWerbungLine[] = [{ excelPlu: '41175', rowIndex: 2, artikelHint: 'x' }]
    const rows = buildObstWerbungMatchRows(lines, new Set(['41175']), candidates)
    expect(rows[0].selectedPlu).toBe('41175')
  })

  it('nutzt Namens-Ranking wenn PLU nicht im Master', () => {
    const lines: ParsedObstWerbungLine[] = [{ excelPlu: '99999', rowIndex: 2, artikelHint: 'Radieschen lose' }]
    const rows = buildObstWerbungMatchRows(lines, new Set(['41175']), candidates)
    expect(rows[0].selectedPlu).toBe('41175')
  })
})
