import { describe, it, expect } from 'vitest'
import {
  paginateNewspaperColumns,
  flattenNewspaperPagesToRows,
  newspaperRowsToFlatRows,
  newspaperPageMinHeightPx,
  newspaperPageStartFlatRowIndex,
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

  it('verliert keine Items bei leerer Gruppe vor voller Gruppe', () => {
    const groups = [
      { label: 'Leer', items: [] as { id: string }[] },
      { label: 'Voll', items: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] },
    ]
    const pages = paginateNewspaperColumns(groups, h)
    const flat = flattenNewspaperPagesToRows(pages)
    expect(flat.filter((r) => r.type === 'item')).toHaveLength(3)
  })

  it('zeigt Gruppenkopf auch bei leerer Warengruppe (nur Header, keine Items)', () => {
    const groups = [
      { label: 'Leer', items: [] as { id: string }[] },
      { label: 'Mit', items: [{ id: 'x' }] },
    ]
    const pages = paginateNewspaperColumns(groups, h)
    expect(pages.length).toBeGreaterThanOrEqual(1)
    const flat = flattenNewspaperPagesToRows(pages)
    expect(flat.some((r) => r.type === 'group' && r.label === 'Leer')).toBe(true)
    expect(flat.some((r) => r.type === 'item')).toBe(true)
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

describe('newspaperPageStartFlatRowIndex', () => {
  it('summiert links+rechts der vorherigen Seiten', () => {
    const pages = [
      { left: [{ type: 'group' as const, label: 'A' }], right: [{ type: 'item' as const, item: 1 }] },
      { left: [{ type: 'item' as const, item: 2 }], right: [] },
    ]
    expect(newspaperPageStartFlatRowIndex(pages, 0)).toBe(0)
    expect(newspaperPageStartFlatRowIndex(pages, 1)).toBe(2)
  })
})
