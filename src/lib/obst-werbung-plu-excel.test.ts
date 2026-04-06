import { filterPluListToMaster, parsePluCell } from '@/lib/obst-werbung-plu-excel'

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
