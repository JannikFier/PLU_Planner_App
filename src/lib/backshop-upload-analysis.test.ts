import { describe, it, expect } from 'vitest'
import { buildBackshopParseAnalysis, truncateSkippedCellRaw, buildBackshopRowsCsv } from '@/lib/backshop-upload-analysis'
import type { BackshopParseResult, ParsedBackshopRow } from '@/types/plu'

function minimalResult(over: Partial<BackshopParseResult>): BackshopParseResult {
  return {
    rows: [],
    fileName: 't.xlsx',
    totalRows: 0,
    skippedRows: 0,
    detectedLayout: 'kassenblatt_blocks',
    pluColumnIndex: 0,
    nameColumnIndex: 0,
    hasImageColumn: true,
    ...over,
  }
}

describe('buildBackshopParseAnalysis', () => {
  it('rechnet Brutto vor Duplikaten (172 + 5)', () => {
    const r = minimalResult({
      totalRows: 172,
      skippedRows: 9,
      skippedReasons: { invalidPlu: 4, emptyName: 0, duplicatePlu: 5 },
    })
    const a = buildBackshopParseAnalysis(r)
    expect(a.uniqueImported).toBe(172)
    expect(a.duplicateSecondColumns).toBe(5)
    expect(a.grossColumnsBeforeDedupe).toBe(177)
    expect(a.skippedSumMatches).toBe(true)
  })

  it('kürzt Rohzellen', () => {
    const long = 'x'.repeat(60)
    expect(truncateSkippedCellRaw(long).length).toBeLessThanOrEqual(50)
  })
})

describe('buildBackshopRowsCsv', () => {
  it('enthält UTF-8-BOM und Semikolon', () => {
    const rows: ParsedBackshopRow[] = [
      {
        plu: '81593',
        systemName: 'Test',
        imageColumnIndex: 0,
        imageUrl: null,
        pluSheetRow: 2,
        pluSheetCol: 1,
      },
    ]
    const csv = buildBackshopRowsCsv(rows)
    expect(csv.startsWith('\uFEFF')).toBe(true)
    expect(csv).toContain('81593')
    expect(csv).toContain(';')
  })
})
