// BackshopLayoutPreview: Live-Vorschau der Backshop-Liste für Layout-Einstellungen
// Verwendet feste Beispieldaten (keine Server-Abfrage), damit die Vorschau sofort auf
// Anzeige- und Flussänderung reagiert und der Unterschied zwischen Alle zusammen /
// Nach Warengruppen sowie Zeilenweise / Spaltenweise klar sichtbar ist.

import { useMemo } from 'react'
import type { DisplayItem } from '@/types/plu'

interface BackshopLayoutPreviewProps {
  sortMode: 'ALPHABETICAL' | 'BY_BLOCK'
  flowDirection: 'ROW_BY_ROW' | 'COLUMN_FIRST'
  fontHeaderPx?: number
  fontColumnPx?: number
  fontProductPx?: number
  /** Bei „Nach Warengruppen“: Vorschau als getrennte Seiten (jede Warengruppe = eine Seite mit Titel „[Gruppe] Liste“) */
  pageBreakPerBlock?: boolean
}

/** Beispieldaten für die Vorschau – typische Backshop-Warengruppen und -Produkte */
const BACKSHOP_PREVIEW_EXAMPLE_ITEMS: DisplayItem[] = [
  { id: 'ex-1', plu: '10001', system_name: 'Brötchen', display_name: 'Brötchen', item_type: 'PIECE', status: 'UNCHANGED', old_plu: null, warengruppe: null, block_id: null, block_name: 'Brötchen', preis: null, is_custom: false, is_manually_renamed: false },
  { id: 'ex-2', plu: '10002', system_name: 'Croissant', display_name: 'Croissant', item_type: 'PIECE', status: 'UNCHANGED', old_plu: null, warengruppe: null, block_id: null, block_name: 'Brötchen', preis: null, is_custom: false, is_manually_renamed: false },
  { id: 'ex-3', plu: '10003', system_name: 'Laugenbrötchen', display_name: 'Laugenbrötchen', item_type: 'PIECE', status: 'UNCHANGED', old_plu: null, warengruppe: null, block_id: null, block_name: 'Brötchen', preis: null, is_custom: false, is_manually_renamed: false },
  { id: 'ex-4', plu: '10004', system_name: 'Baguette', display_name: 'Baguette', item_type: 'PIECE', status: 'UNCHANGED', old_plu: null, warengruppe: null, block_id: null, block_name: 'Baguette', preis: null, is_custom: false, is_manually_renamed: false },
  { id: 'ex-5', plu: '10005', system_name: 'Ciabatta', display_name: 'Ciabatta', item_type: 'PIECE', status: 'UNCHANGED', old_plu: null, warengruppe: null, block_id: null, block_name: 'Baguette', preis: null, is_custom: false, is_manually_renamed: false },
  { id: 'ex-6', plu: '10006', system_name: 'Vollkornbrot', display_name: 'Vollkornbrot', item_type: 'PIECE', status: 'UNCHANGED', old_plu: null, warengruppe: null, block_id: null, block_name: 'Brot', preis: null, is_custom: false, is_manually_renamed: false },
  { id: 'ex-7', plu: '10007', system_name: 'Mischbrot', display_name: 'Mischbrot', item_type: 'PIECE', status: 'UNCHANGED', old_plu: null, warengruppe: null, block_id: null, block_name: 'Brot', preis: null, is_custom: false, is_manually_renamed: false },
  { id: 'ex-8', plu: '10008', system_name: 'Berliner', display_name: 'Berliner', item_type: 'PIECE', status: 'UNCHANGED', old_plu: null, warengruppe: null, block_id: null, block_name: 'Süßwaren', preis: null, is_custom: false, is_manually_renamed: false },
  { id: 'ex-9', plu: '10009', system_name: 'Donut', display_name: 'Donut', item_type: 'PIECE', status: 'UNCHANGED', old_plu: null, warengruppe: null, block_id: null, block_name: 'Süßwaren', preis: null, is_custom: false, is_manually_renamed: false },
  { id: 'ex-10', plu: '10010', system_name: 'Schokocroissant', display_name: 'Schokocroissant', item_type: 'PIECE', status: 'UNCHANGED', old_plu: null, warengruppe: null, block_id: null, block_name: 'Süßwaren', preis: null, is_custom: false, is_manually_renamed: false },
  { id: 'ex-11', plu: '10011', system_name: 'Laugenstange', display_name: 'Laugenstange', item_type: 'PIECE', status: 'UNCHANGED', old_plu: null, warengruppe: null, block_id: null, block_name: 'Snacks', preis: null, is_custom: false, is_manually_renamed: false },
  { id: 'ex-12', plu: '10012', system_name: 'Salatbrötchen', display_name: 'Salatbrötchen', item_type: 'PIECE', status: 'UNCHANGED', old_plu: null, warengruppe: null, block_id: null, block_name: 'Snacks', preis: null, is_custom: false, is_manually_renamed: false },
]

const WAREINGRUPPEN_REIHENFOLGE = ['Brötchen', 'Baguette', 'Brot', 'Süßwaren', 'Snacks'] as const

type PreviewRow = { type: 'group'; label: string } | { type: 'item'; item: DisplayItem }

function buildPreviewRows(sortMode: 'ALPHABETICAL' | 'BY_BLOCK'): PreviewRow[] {
  if (sortMode === 'ALPHABETICAL') {
    const sorted = [...BACKSHOP_PREVIEW_EXAMPLE_ITEMS].sort((a, b) =>
      (a.display_name ?? a.system_name).localeCompare(b.display_name ?? b.system_name, 'de'),
    )
    return sorted.map((item) => ({ type: 'item' as const, item }))
  }
  const rows: PreviewRow[] = []
  for (const groupName of WAREINGRUPPEN_REIHENFOLGE) {
    const groupItems = BACKSHOP_PREVIEW_EXAMPLE_ITEMS.filter((i) => i.block_name === groupName)
    if (groupItems.length > 0) {
      rows.push({ type: 'group', label: groupName })
      for (const item of groupItems) rows.push({ type: 'item', item })
    }
  }
  return rows
}

interface FontSizes {
  header: number
  column: number
  product: number
}

/** Gruppierte Items für „jede Seite getrennt“: [ Gruppenname, DisplayItem[] ][] */
function buildGroupsForPageBreak(): [string, DisplayItem[]][] {
  const groups: [string, DisplayItem[]][] = []
  for (const groupName of WAREINGRUPPEN_REIHENFOLGE) {
    const items = BACKSHOP_PREVIEW_EXAMPLE_ITEMS.filter((i) => i.block_name === groupName)
    if (items.length > 0) groups.push([groupName, items])
  }
  return groups
}

export function BackshopLayoutPreview({
  sortMode,
  flowDirection,
  fontHeaderPx = 14,
  fontColumnPx = 10,
  fontProductPx = 11,
  pageBreakPerBlock = false,
}: BackshopLayoutPreviewProps) {
  const previewRows = useMemo(() => buildPreviewRows(sortMode), [sortMode])
  const groupsForPages = useMemo(() => buildGroupsForPageBreak(), [])

  const fonts = useMemo(
    () => ({
      header: Math.max(8, Math.round(fontHeaderPx * 0.55)),
      column: Math.max(7, Math.round(fontColumnPx * 0.55)),
      product: Math.max(7, Math.round(fontProductPx * 0.6)),
    }),
    [fontHeaderPx, fontColumnPx, fontProductPx],
  )

  const itemCount = previewRows.filter((r) => r.type === 'item').length
  const showAsSeparatePages = sortMode === 'BY_BLOCK' && pageBreakPerBlock

  if (showAsSeparatePages) {
    return (
      <div className="space-y-4">
        <div
          className="rounded-t-lg bg-gray-500/10 border border-b-0 border-gray-300 px-3 py-1 font-semibold text-gray-700 uppercase tracking-wider text-center"
          style={{ fontSize: fonts.header }}
        >
          Backshop-Liste (Beispielvorschau – jede Seite getrennt)
        </div>
        {groupsForPages.map(([groupName, items]) => (
          <div
            key={groupName}
            className="rounded-lg border border-border overflow-hidden bg-card shadow-sm"
          >
            <div
              className="border-b border-border bg-muted/70 px-3 py-2 font-semibold text-center"
              style={{ fontSize: fonts.header }}
            >
              {groupName} Liste
            </div>
            <div className="border-t-0">
              {flowDirection === 'ROW_BY_ROW' ? (
                <BackshopPreviewRowByRow
                  rows={items.map((item) => ({ type: 'item' as const, item }))}
                  fonts={fonts}
                />
              ) : (
                <BackshopPreviewColumnFirst
                  rows={items.map((item) => ({ type: 'item' as const, item }))}
                  fonts={fonts}
                />
              )}
            </div>
          </div>
        ))}
        <div
          className="px-3 py-1.5 text-center text-muted-foreground rounded-b-lg border border-border bg-muted/30"
          style={{ fontSize: fonts.product }}
        >
          Jede Warengruppe = eine PDF-Seite mit Titel oben · {flowDirection === 'ROW_BY_ROW' ? 'Zeilenweise' : 'Spaltenweise'}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div
        className="rounded-t-lg bg-gray-500/10 border border-b-0 border-gray-300 px-3 py-1 font-semibold text-gray-700 uppercase tracking-wider text-center"
        style={{ fontSize: fonts.header }}
      >
        Backshop-Liste (Beispielvorschau)
      </div>
      <div className="rounded-b-lg border border-border overflow-hidden">
        {flowDirection === 'ROW_BY_ROW' ? (
          <BackshopPreviewRowByRow rows={previewRows} fonts={fonts} />
        ) : (
          <BackshopPreviewColumnFirst rows={previewRows} fonts={fonts} />
        )}
        <div
          className="px-3 py-1.5 text-center text-muted-foreground border-t border-border bg-muted/30"
          style={{ fontSize: fonts.product }}
        >
          {sortMode === 'BY_BLOCK' ? 'Nach Warengruppen, innerhalb A–Z' : 'Alle zusammen, A–Z'}
          {' · '}
          {flowDirection === 'ROW_BY_ROW' ? 'Zeilenweise' : 'Spaltenweise'}
          {' · '}
          {itemCount} Beispielartikel
        </div>
      </div>
    </div>
  )
}

type TableRow =
  | { type: 'group'; label: string }
  | { type: 'item'; left: DisplayItem | null; right: DisplayItem | null }

function BackshopPreviewRowByRow({
  rows,
  fonts,
}: {
  rows: PreviewRow[]
  fonts: FontSizes
}) {
  const tableRows = useMemo((): TableRow[] => {
    const out: TableRow[] = []
    let i = 0
    while (i < rows.length) {
      const r = rows[i]
      if (r.type === 'group') {
        out.push({ type: 'group', label: r.label })
        i++
      } else {
        const left = r.item
        const next = rows[i + 1]
        const right = next?.type === 'item' ? next.item : null
        out.push({ type: 'item', left, right: right ?? null })
        i += right ? 2 : 1
      }
    }
    return out
  }, [rows])

  return (
    <table className="w-full table-fixed border-collapse">
      <colgroup>
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <col key={n} style={{ width: '16.66%' }} />
        ))}
      </colgroup>
      <thead>
        <tr className="border-b-2 border-border">
          <th className="px-1 py-0.5 text-center font-semibold text-muted-foreground uppercase border-b border-r border-border" style={{ fontSize: fonts.column }}>
            Bild
          </th>
          <th className="px-1 py-0.5 text-center font-semibold text-muted-foreground uppercase border-b border-r border-border" style={{ fontSize: fonts.column }}>
            PLU
          </th>
          <th className="px-1 py-0.5 text-center font-semibold text-muted-foreground uppercase border-b border-border" style={{ fontSize: fonts.column }}>
            Name
          </th>
          <th className="px-1 py-0.5 text-center font-semibold text-muted-foreground uppercase border-b-2 border-l-2 border-r border-border bg-muted/30" style={{ fontSize: fonts.column }}>
            Bild
          </th>
          <th className="px-1 py-0.5 text-center font-semibold text-muted-foreground uppercase border-b border-r border-border" style={{ fontSize: fonts.column }}>
            PLU
          </th>
          <th className="px-1 py-0.5 text-center font-semibold text-muted-foreground uppercase border-b border-border" style={{ fontSize: fonts.column }}>
            Name
          </th>
        </tr>
      </thead>
      <tbody>
        {tableRows.map((row, i) =>
          row.type === 'group' ? (
            <tr key={`g-${i}`} className="border-b border-border">
              <td colSpan={6} className="bg-muted/70 px-2 py-1 font-semibold text-muted-foreground text-center border-b border-border" style={{ fontSize: fonts.column }}>
                — {row.label} —
              </td>
            </tr>
          ) : (
            <tr key={i} className="border-b border-border last:border-b-0">
              <PreviewCell item={row.left} fonts={fonts} isRight={false} />
              <PreviewCell item={row.right} fonts={fonts} isRight />
            </tr>
          ),
        )}
      </tbody>
    </table>
  )
}

function BackshopPreviewColumnFirst({
  rows,
  fonts,
}: {
  rows: PreviewRow[]
  fonts: FontSizes
}) {
  const { leftRows, rightRows } = useMemo(() => {
    const itemRows = rows.filter((r): r is { type: 'item'; item: DisplayItem } => r.type === 'item')
    const mid = Math.ceil(itemRows.length / 2)
    const leftItems = itemRows.slice(0, mid)
    const rightItems = itemRows.slice(mid)
    const buildColumnRows = (items: { type: 'item'; item: DisplayItem }[]): PreviewRow[] => {
      const out: PreviewRow[] = []
      let lastGroup: string | null = null
      for (const r of items) {
        const name = r.item.block_name ?? null
        if (name && name !== lastGroup) {
          out.push({ type: 'group', label: name })
          lastGroup = name
        }
        out.push(r)
      }
      return out
    }
    return {
      leftRows: buildColumnRows(leftItems),
      rightRows: buildColumnRows(rightItems),
    }
  }, [rows])

  const renderColumn = (columnRows: PreviewRow[]) => (
    <table className="w-full table-fixed border-collapse">
      <thead>
        <tr className="border-b-2 border-border">
          <th className="w-12 px-1 py-0.5 text-center font-semibold text-muted-foreground uppercase border-b border-r border-border" style={{ fontSize: fonts.column }}>
            Bild
          </th>
          <th className="w-14 px-1 py-0.5 text-center font-semibold text-muted-foreground uppercase border-b border-r border-border" style={{ fontSize: fonts.column }}>
            PLU
          </th>
          <th className="px-1 py-0.5 text-center font-semibold text-muted-foreground uppercase border-b border-border" style={{ fontSize: fonts.column }}>
            Name
          </th>
        </tr>
      </thead>
      <tbody>
        {columnRows.map((r, i) =>
          r.type === 'group' ? (
            <tr key={`g-${i}`} className="border-b border-border">
              <td colSpan={3} className="bg-muted/70 px-2 py-1 font-semibold text-muted-foreground text-center border-b border-border" style={{ fontSize: fonts.column }}>
                — {r.label} —
              </td>
            </tr>
          ) : (
            <tr key={r.item.id} className="border-b border-border last:border-b-0">
              <td className="px-1 py-0.5 align-middle text-center border-b border-r border-border" style={{ fontSize: fonts.product }}>
                <span className="inline-block h-8 w-8 rounded bg-muted mx-auto" />
              </td>
              <td className="px-1 py-0.5 text-center border-b border-r border-border" style={{ fontSize: fonts.product }}>{r.item.plu}</td>
              <td className="px-1 py-0.5 text-center break-words min-w-0 border-b border-border" style={{ fontSize: fonts.product }} title={r.item.display_name}>
                {r.item.display_name}
              </td>
            </tr>
          ),
        )}
      </tbody>
    </table>
  )

  return (
    <div className="grid grid-cols-2 divide-x divide-border">
      <div>{renderColumn(leftRows)}</div>
      <div>{renderColumn(rightRows)}</div>
    </div>
  )
}

function PreviewCell({
  item,
  fonts,
  isRight,
}: {
  item: DisplayItem | null
  fonts: FontSizes
  /** Rechte Hälfte: erste Zelle hat Mittellinie (border-l-2) */
  isRight?: boolean
}) {
  const cellBorder = 'border-b border-border'
  const emptyCell = (extra?: string) => <td className={`px-1 py-0.5 text-center ${cellBorder} ${extra ?? ''}`} />

  if (!item) {
    return (
      <>
        {emptyCell(isRight ? 'border-l-2 border-border bg-muted/20' : 'border-r border-border')}
        {emptyCell('border-r border-border')}
        {emptyCell()}
      </>
    )
  }
  return (
    <>
      <td className={`px-1 py-0.5 align-middle text-center ${cellBorder} ${isRight ? 'border-l-2 border-border bg-muted/20' : 'border-r border-border'}`} style={{ fontSize: fonts.product }}>
        <span className="inline-block h-8 w-8 rounded bg-muted mx-auto" />
      </td>
      <td className={`px-1 py-0.5 text-center ${cellBorder} border-r border-border`} style={{ fontSize: fonts.product }}>{item.plu}</td>
      <td className={`px-1 py-0.5 text-center break-words min-w-0 ${cellBorder}`} style={{ fontSize: fonts.product }} title={item.display_name}>
        {item.display_name}
      </td>
    </>
  )
}
