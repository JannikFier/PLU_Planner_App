import { describe, it, expect } from 'vitest'
import {
  paginateNewspaperColumns,
  flattenNewspaperPagesToRows,
  newspaperRowsToFlatRows,
} from '@/lib/newspaper-column-pages'

describe('paginateNewspaperColumns', () => {
  const h = {
    itemRow: 5,
    groupHeader: 4,
    columnHeightFirstPage: 100,
    columnHeightContinuationPage: 100,
  }

  it('füllt zuerst links, dann rechts auf derselben Seite', () => {
    const groups = [
      {
        label: '— A —',
        items: [{ id: '1' }, { id: '2' }, { id: '3' }],
      },
    ]
    const pages = paginateNewspaperColumns(groups, {
      ...h,
      columnHeightFirstPage: 14,
    })
    expect(pages).toHaveLength(1)
    expect(pages[0].left.map((r) => r.type)).toEqual(['group', 'item', 'item'])
    expect(pages[0].right.map((r) => r.type)).toEqual(['group', 'item'])
    if (pages[0].right[0].type === 'group') {
      expect(pages[0].right[0].label).toBe('— A —')
    }
  })

  it('beginnt eine neue Seite, wenn beide Spalten voll sind', () => {
    const groups = [
      { label: '— A —', items: [{ id: 'a1' }, { id: 'a2' }] },
      { label: '— B —', items: [{ id: 'b1' }] },
    ]
    const pages = paginateNewspaperColumns(groups, {
      ...h,
      columnHeightFirstPage: 13,
      columnHeightContinuationPage: 13,
    })
    expect(pages.length).toBeGreaterThanOrEqual(2)
  })

  it('liefert leere Seitenliste bei leeren Gruppen', () => {
    expect(paginateNewspaperColumns([], h)).toEqual([])
  })
})

describe('flattenNewspaperPagesToRows', () => {
  it('reiht links vor rechts pro Seite', () => {
    const pages = [
      {
        left: [
          { type: 'group' as const, label: 'G' },
          { type: 'item' as const, item: { x: 1 } },
        ],
        right: [{ type: 'item' as const, item: { x: 2 } }],
      },
    ]
    const flat = flattenNewspaperPagesToRows(pages)
    expect(flat).toHaveLength(3)
    expect(newspaperRowsToFlatRows(flat).map((r) => r.type)).toEqual(['header', 'item', 'item'])
  })
})
