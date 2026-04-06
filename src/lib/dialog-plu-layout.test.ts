import { describe, it, expect } from 'vitest'
import { buildDialogPluLayout, newspaperPageMinHeightPx } from '@/lib/dialog-plu-layout'
import type { DialogItemBase } from '@/lib/plu-helpers'

type Item = DialogItemBase & { id: string; plu: string }

function item(plu: string, name: string, itemType: 'PIECE' | 'WEIGHT' = 'PIECE'): Item {
  return {
    id: plu,
    plu,
    display_name: name,
    system_name: name,
    item_type: itemType,
  }
}

const fonts = { header: 24, column: 16, product: 12 }

describe('buildDialogPluLayout', () => {
  it('ROW_BY_ROW: paart Items pro Gruppe', () => {
    const groups = [
      { label: '— A —', items: [item('1', 'A1'), item('2', 'A2'), item('3', 'A3')] },
    ]
    const r = buildDialogPluLayout({
      groups,
      filteredItems: groups.flatMap((g) => g.items),
      flowDirection: 'ROW_BY_ROW',
      displayMode: 'MIXED',
      sortMode: 'ALPHABETICAL',
      listType: 'obst',
      fontSizes: fonts,
    })
    expect(r.mode).toBe('row_by_row')
    if (r.mode !== 'row_by_row') return
    expect(r.tableRows.filter((x) => x.type === 'row').length).toBe(2)
    const row1 = r.tableRows.find((x) => x.type === 'row' && x.left?.plu === '1')
    expect(row1?.right?.plu).toBe('2')
  })

  it('COLUMN_FIRST Obst MIXED: liefert newspaper_obst mit mindestens einer Seite', () => {
    const items = Array.from({ length: 8 }, (_, i) =>
      item(String(41000 + i), `Artikel ${i}`),
    )
    const groups = [{ label: '— A —', items }]
    const r = buildDialogPluLayout({
      groups,
      filteredItems: items,
      flowDirection: 'COLUMN_FIRST',
      displayMode: 'MIXED',
      sortMode: 'ALPHABETICAL',
      listType: 'obst',
      fontSizes: fonts,
    })
    expect(r.mode).toBe('newspaper_obst')
    if (r.mode !== 'newspaper_obst') return
    expect(r.sections.length).toBe(1)
    expect(r.sections[0].sectionBanner).toBeNull()
    expect(r.sections[0].pages.length).toBeGreaterThanOrEqual(1)
    expect(r.mobileRows.some((m) => m.type === 'item')).toBe(true)
  })

  it('COLUMN_FIRST Backshop alphabetisch: split_columns mit zwei Spalten', () => {
    const items = [item('1', 'Alpha'), item('2', 'Beta'), item('3', 'Gamma')]
    const groups = [{ label: '— A —', items }]
    const r = buildDialogPluLayout({
      groups,
      filteredItems: items,
      flowDirection: 'COLUMN_FIRST',
      displayMode: 'MIXED',
      sortMode: 'ALPHABETICAL',
      listType: 'backshop',
      fontSizes: fonts,
    })
    expect(r.mode).toBe('split_columns')
    if (r.mode !== 'split_columns') return
    expect(r.leftFlat.length).toBeGreaterThan(0)
    expect(r.rightFlat.length).toBeGreaterThan(0)
  })
})

describe('newspaperPageMinHeightPx', () => {
  it('erste Seite nutzt columnHeightFirstPage', () => {
    const h = {
      itemRow: 10,
      groupHeader: 10,
      columnHeightFirstPage: 100,
      columnHeightContinuationPage: 200,
    }
    expect(newspaperPageMinHeightPx(0, h)).toBe(100)
    expect(newspaperPageMinHeightPx(1, h)).toBe(200)
  })
})
