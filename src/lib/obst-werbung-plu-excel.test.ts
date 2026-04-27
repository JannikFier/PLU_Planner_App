import {
  extractPluListFromObstWerbungRows,
  filterPluListToMaster,
  mergeObstWerbungParseResults,
  parsePluCell,
} from '@/lib/obst-werbung-plu-excel'

describe('parsePluCell', () => {
  it('liest Zahl und Ziffernfolge', () => {
    expect(parsePluCell(41207)).toBe('41207')
    expect(parsePluCell('41207')).toBe('41207')
    expect(parsePluCell(' 41.207 ')).toBe('41207')
  })
})

describe('filterPluListToMaster', () => {
  it('behält Reihenfolge und filtert', () => {
    const m = new Set(['1', '2'])
    const { accepted, dropped } = filterPluListToMaster(['2', '3', '1'], m)
    expect(accepted).toEqual(['2', '1'])
    expect(dropped).toEqual(['3'])
  })
})

describe('mergeObstWerbungParseResults', () => {
  it('verbindet PLUs, Zeilen und summiert Metadaten', () => {
    const merged = mergeObstWerbungParseResults([
      {
        plu: ['1', '2'],
        lines: [
          { excelPlu: '1', rowIndex: 2, artikelHint: 'A' },
          { excelPlu: '2', rowIndex: 3, artikelHint: 'B' },
        ],
        fileName: 'a.xlsx',
        totalRows: 10,
        skippedRows: 1,
      },
      {
        plu: ['2', '3'],
        lines: [
          { excelPlu: '2', rowIndex: 2, artikelHint: 'anderes' },
          { excelPlu: '3', rowIndex: 3, artikelHint: 'C' },
        ],
        fileName: 'b.xlsx',
        totalRows: 5,
        skippedRows: 2,
      },
    ])
    expect(merged.plu).toEqual(['1', '2', '3'])
    expect(merged.lines.map((l) => l.excelPlu)).toEqual(['1', '2', '3'])
    expect(merged.lines.find((l) => l.excelPlu === '2')?.artikelHint).toBe('B')
    expect(merged.fileName).toBe('a.xlsx + b.xlsx')
    expect(merged.totalRows).toBe(15)
    expect(merged.skippedRows).toBe(3)
  })
})

describe('extractPluListFromObstWerbungRows', () => {
  it('liest klassische Kopfzeile PLU inkl. Artikel-Hinweis', () => {
    const rows: unknown[][] = [
      ['PLU', 'Name'],
      ['41175', 'Radieschen'],
      ['41174', 'Porree'],
    ]
    const { plu, lines, skippedRows } = extractPluListFromObstWerbungRows(rows)
    expect(plu).toEqual(['41175', '41174'])
    expect(lines[0].artikelHint).toBe('Radieschen')
    expect(lines[1].artikelHint).toBe('Porree')
    expect(skippedRows).toBe(0)
  })

  it('erkennt ZWS-PLU als Kopf', () => {
    const rows: unknown[][] = [
      ['*ZWS-PLU*', 'Artikel'],
      ['41200', 'Test'],
    ]
    const { plu } = extractPluListFromObstWerbungRows(rows)
    expect(plu).toEqual(['41200'])
  })

  it('inferiert Spalte A bei Kategorieliste ohne PLU-Kopf', () => {
    const rows: unknown[][] = [
      ['WURZELGEMÜSE', ''],
      ['41175', 'Radieschen'],
      ['', ''],
      ['ZWIEBELGEMÜSE', ''],
      ['41174', 'Porree Stück'],
    ]
    const { plu, skippedRows } = extractPluListFromObstWerbungRows(rows)
    expect(plu).toEqual(['41175', '41174'])
    expect(skippedRows).toBeGreaterThan(0)
  })

  it('überspringt Duplikate', () => {
    const rows: unknown[][] = [
      ['PLU'],
      ['41175'],
      ['41175'],
    ]
    const { plu, skippedRows } = extractPluListFromObstWerbungRows(rows)
    expect(plu).toEqual(['41175'])
    expect(skippedRows).toBe(1)
  })

  it('wirft wenn weder Kopf noch inferierbare PLU-Spalte existiert', () => {
    const rows: unknown[][] = [['Hinweis'], ['nur Text']]
    expect(() => extractPluListFromObstWerbungRows(rows)).toThrow(/Spalte „PLU“ nicht gefunden/)
  })
})
