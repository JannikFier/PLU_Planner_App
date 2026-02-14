// LayoutPreview: Live-Vorschau der PLU-Tabelle für Layout-Einstellungen

import { useMemo } from 'react'
import { PreisBadge } from './PreisBadge'
import { StatusBadge } from './StatusBadge'
import { useActiveVersion } from '@/hooks/useActiveVersion'
import { usePLUData } from '@/hooks/usePLUData'
import { useBlocks } from '@/hooks/useBlocks'
import {
  groupItemsByLetter,
  groupItemsByBlock,
  getDisplayNameForItem,
} from '@/lib/plu-helpers'
import type { MasterPLUItem, Block } from '@/types/database'
import type { DisplayItem } from '@/types/plu'
import type { LetterGroup, BlockGroup } from '@/lib/plu-helpers'

interface LayoutPreviewProps {
  sortMode: 'ALPHABETICAL' | 'BY_BLOCK'
  displayMode: 'MIXED' | 'SEPARATED'
  flowDirection: 'ROW_BY_ROW' | 'COLUMN_FIRST'
  fontHeaderPx?: number
  fontColumnPx?: number
  fontProductPx?: number
}

const MAX_PREVIEW_ITEMS = 8
const MAX_SEPARATED_ITEMS = 5


export function LayoutPreview({
  sortMode,
  displayMode,
  flowDirection,
  fontHeaderPx = 14,
  fontColumnPx = 10,
  fontProductPx = 11,
}: LayoutPreviewProps) {
  const { data: activeVersion } = useActiveVersion()
  const { data: allItems = [] } = usePLUData(activeVersion?.id)
  const { data: blocks = [] } = useBlocks()

  // Items einschränken
  const items = useMemo(() => allItems.slice(0, 30), [allItems])

  // Schriftgrößen-Objekt durchreichen (auf Vorschau-Skala: halbierte Werte als Basis)
  const fonts = useMemo(() => ({
    header: Math.max(8, Math.round(fontHeaderPx * 0.55)),
    column: Math.max(7, Math.round(fontColumnPx * 0.55)),
    product: Math.max(7, Math.round(fontProductPx * 0.6)),
  }), [fontHeaderPx, fontColumnPx, fontProductPx])

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Keine PLU-Daten für die Vorschau vorhanden.
        <br />
        Lade zuerst eine Excel-Datei hoch.
      </div>
    )
  }

  if (displayMode === 'SEPARATED') {
    const pieceItems = items.filter((i) => i.item_type === 'PIECE')
    const weightItems = items.filter((i) => i.item_type === 'WEIGHT')
    return (
      <div className="space-y-4">
        {pieceItems.length > 0 && (
          <div>
            <div className="rounded-t-lg bg-blue-500/10 border border-blue-200 px-3 py-1.5 font-semibold text-blue-700 uppercase tracking-wider" style={{ fontSize: fonts.header }}>
              PLU-Liste Stück
            </div>
            <PreviewTable
              items={pieceItems.slice(0, MAX_SEPARATED_ITEMS)}
              sortMode={sortMode}
              flowDirection={flowDirection}
              blocks={blocks}
              totalCount={pieceItems.length}
              fonts={fonts}
            />
          </div>
        )}
        {weightItems.length > 0 && (
          <div>
            <div className="rounded-t-lg bg-amber-500/10 border border-amber-200 px-3 py-1.5 font-semibold text-amber-700 uppercase tracking-wider" style={{ fontSize: fonts.header }}>
              PLU-Liste Gewicht
            </div>
            <PreviewTable
              items={weightItems.slice(0, MAX_SEPARATED_ITEMS)}
              sortMode={sortMode}
              flowDirection={flowDirection}
              blocks={blocks}
              totalCount={weightItems.length}
              fonts={fonts}
            />
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div
        className="rounded-t-lg bg-gray-500/10 border border-b-0 border-gray-300 px-3 py-1 font-semibold text-gray-700 uppercase tracking-wider text-center"
        style={{ fontSize: fonts.header }}
      >
        PLU-Liste
      </div>
      <PreviewTable
        items={items.slice(0, MAX_PREVIEW_ITEMS)}
        sortMode={sortMode}
        flowDirection={flowDirection}
        blocks={blocks}
        totalCount={items.length}
        fonts={fonts}
      />
    </div>
  )
}

// ============================================================

interface FontSizes {
  header: number
  column: number
  product: number
}

interface PreviewTableProps {
  items: MasterPLUItem[]
  sortMode: 'ALPHABETICAL' | 'BY_BLOCK'
  flowDirection: 'ROW_BY_ROW' | 'COLUMN_FIRST'
  blocks: Block[]
  totalCount: number
  fonts: FontSizes
}

interface FlatRow {
  type: 'header' | 'item'
  label?: string
  item?: MasterPLUItem
}

interface TableRow {
  type: 'fullHeader' | 'itemPair'
  label?: string
  left?: MasterPLUItem
  right?: MasterPLUItem
}

function buildFlatRowsFromLetterGroups(groups: LetterGroup<MasterPLUItem>[]): FlatRow[] {
  const rows: FlatRow[] = []
  for (const group of groups) {
    rows.push({ type: 'header', label: `— ${group.letter} —` })
    for (const item of group.items) {
      rows.push({ type: 'item', item })
    }
  }
  return rows
}

function buildFlatRowsFromBlockGroups(groups: BlockGroup<MasterPLUItem>[]): FlatRow[] {
  const rows: FlatRow[] = []
  for (const group of groups) {
    rows.push({ type: 'header', label: group.blockName })
    for (const item of group.items) {
      rows.push({ type: 'item', item })
    }
  }
  return rows
}

/** Gruppen in ROW_BY_ROW TableRows umwandeln */
function buildRowByRowTable(groups: (LetterGroup<MasterPLUItem> | BlockGroup<MasterPLUItem>)[]): TableRow[] {
  const rows: TableRow[] = []
  for (const group of groups) {
    const label = 'letter' in group ? `— ${group.letter} —` : group.blockName
    rows.push({ type: 'fullHeader', label })

    const items = group.items
    for (let i = 0; i < items.length; i += 2) {
      rows.push({
        type: 'itemPair',
        left: items[i],
        right: items[i + 1] ?? undefined,
      })
    }
  }
  return rows
}

function PreviewTable({ items, sortMode, flowDirection, blocks, totalCount, fonts }: PreviewTableProps) {
  const groups = useMemo(() => {
    if (sortMode === 'BY_BLOCK') return groupItemsByBlock<MasterPLUItem>(items, blocks)
    return groupItemsByLetter<MasterPLUItem>(items)
  }, [items, sortMode, blocks])

  const rowByRowData = useMemo(() => {
    if (flowDirection !== 'ROW_BY_ROW') return null
    return buildRowByRowTable(groups)
  }, [groups, flowDirection])

  const [leftRows, rightRows] = useMemo(() => {
    if (flowDirection === 'ROW_BY_ROW') return [[], []]
    const flatRows = sortMode === 'BY_BLOCK'
      ? buildFlatRowsFromBlockGroups(groups as BlockGroup<MasterPLUItem>[])
      : buildFlatRowsFromLetterGroups(groups as LetterGroup<MasterPLUItem>[])
    const mid = Math.ceil(flatRows.length / 2)
    return [flatRows.slice(0, mid), flatRows.slice(mid)]
  }, [groups, flowDirection, sortMode])

  const remaining = totalCount - items.length

  if (flowDirection === 'ROW_BY_ROW' && rowByRowData) {
    return (
      <div className="rounded-lg border border-border overflow-hidden">
        <PreviewRowByRowTable tableRows={rowByRowData} fonts={fonts} />
        {remaining > 0 && (
          <div className="px-3 py-1.5 text-center text-muted-foreground border-t border-border bg-muted/30" style={{ fontSize: fonts.product }}>
            und {remaining} weitere Artikel...
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="grid grid-cols-2 divide-x divide-border">
        <PreviewColumn rows={leftRows} fonts={fonts} />
        <PreviewColumn rows={rightRows} fonts={fonts} />
      </div>
      {remaining > 0 && (
        <div className="px-3 py-1.5 text-center text-muted-foreground border-t border-border bg-muted/30" style={{ fontSize: fonts.product }}>
          und {remaining} weitere Artikel...
        </div>
      )}
    </div>
  )
}

function PreviewRowByRowTable({ tableRows, fonts }: { tableRows: TableRow[]; fonts: FontSizes }) {
  return (
    <table className="w-full">
      <thead>
        <tr className="border-b border-border">
          <th className="w-[50px] px-1.5 py-1 text-left font-semibold text-muted-foreground uppercase" style={{ fontSize: fonts.column }}>
            PLU
          </th>
          <th className="px-1.5 py-1 text-left font-semibold text-muted-foreground uppercase" style={{ fontSize: fonts.column }}>
            Artikel
          </th>
          <th className="w-[50px] px-1.5 py-1 text-left font-medium text-muted-foreground uppercase border-l border-border" style={{ fontSize: fonts.column }}>
            Preis
          </th>
          <th className="w-[50px] px-1.5 py-1 text-left font-semibold text-muted-foreground uppercase border-l border-border" style={{ fontSize: fonts.column }}>
            PLU
          </th>
          <th className="px-1.5 py-1 text-left font-semibold text-muted-foreground uppercase" style={{ fontSize: fonts.column }}>
            Artikel
          </th>
          <th className="w-[50px] px-1.5 py-1 text-left font-medium text-muted-foreground uppercase border-l border-border" style={{ fontSize: fonts.column }}>
            Preis
          </th>
        </tr>
      </thead>
      <tbody>
        {tableRows.map((row, i) => {
          if (row.type === 'fullHeader') {
            return (
              <tr key={`h-${i}`} className="border-b border-border">
                <td colSpan={6} className="px-1.5 py-1 text-center font-bold text-muted-foreground tracking-wider uppercase bg-muted/50" style={{ fontSize: fonts.column }}>
                  {row.label}
                </td>
              </tr>
            )
          }
          return (
            <tr key={`p-${i}`} className="border-b border-border last:border-b-0">
              {row.left ? (
                <>
                  <td className="px-1.5 py-0.5" style={{ fontSize: fonts.product }}>
                    <StatusBadge plu={row.left.plu} status={row.left.status} oldPlu={row.left.old_plu} className="px-1 py-0" style={{ fontSize: fonts.product }} />
                  </td>
                  <td className="px-1.5 py-0.5 truncate" style={{ fontSize: fonts.product }} title={getDisplayNameForItem(row.left.display_name, row.left.system_name, (row.left as unknown as DisplayItem).is_custom)}>
                    {getDisplayNameForItem(row.left.display_name, row.left.system_name, (row.left as unknown as DisplayItem).is_custom)}
                  </td>
                  <td className="px-1.5 py-0.5 border-l border-border" style={{ fontSize: fonts.product }}>
                    {(row.left as unknown as DisplayItem).preis != null ? (
                      <PreisBadge value={(row.left as unknown as DisplayItem).preis!} style={{ fontSize: Math.max(8, fonts.product - 1) + 'px' }} />
                    ) : null}
                  </td>
                </>
              ) : (
                <><td className="px-1.5 py-0.5" /><td className="px-1.5 py-0.5" /><td className="px-1.5 py-0.5" /></>
              )}
              {row.right ? (
                <>
                  <td className="px-1.5 py-0.5 border-l border-border" style={{ fontSize: fonts.product }}>
                    <StatusBadge plu={row.right.plu} status={row.right.status} oldPlu={row.right.old_plu} className="px-1 py-0" style={{ fontSize: fonts.product }} />
                  </td>
                  <td className="px-1.5 py-0.5 truncate" style={{ fontSize: fonts.product }} title={getDisplayNameForItem(row.right.display_name, row.right.system_name, (row.right as unknown as DisplayItem).is_custom)}>
                    {getDisplayNameForItem(row.right.display_name, row.right.system_name, (row.right as unknown as DisplayItem).is_custom)}
                  </td>
                  <td className="px-1.5 py-0.5 border-l border-border" style={{ fontSize: fonts.product }}>
                    {(row.right as unknown as DisplayItem).preis != null ? (
                      <PreisBadge value={(row.right as unknown as DisplayItem).preis!} style={{ fontSize: Math.max(8, fonts.product - 1) + 'px' }} />
                    ) : null}
                  </td>
                </>
              ) : (
                <><td className="px-1.5 py-0.5 border-l border-border" /><td className="px-1.5 py-0.5" /><td className="px-1.5 py-0.5" /></>
              )}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function PreviewColumn({ rows, fonts }: { rows: FlatRow[]; fonts: FontSizes }) {
  return (
    <div>
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="w-[50px] px-1.5 py-1 text-left font-semibold text-muted-foreground uppercase" style={{ fontSize: fonts.column }}>
              PLU
            </th>
            <th className="px-1.5 py-1 text-left font-semibold text-muted-foreground uppercase" style={{ fontSize: fonts.column }}>
              Artikel
            </th>
            <th className="w-[50px] px-1.5 py-1 text-left font-medium text-muted-foreground uppercase border-l border-border" style={{ fontSize: fonts.column }}>
              Preis
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            if (row.type === 'header') {
              return (
                <tr key={`h-${i}`} className="border-b border-border">
                  <td colSpan={3} className="px-1.5 py-1 text-center font-bold text-muted-foreground tracking-wider uppercase bg-muted/50" style={{ fontSize: fonts.column }}>
                    {row.label}
                  </td>
                </tr>
              )
            }
            const item = row.item!
            return (
              <tr key={item.id} className="border-b border-border last:border-b-0">
                <td className="px-1.5 py-0.5" style={{ fontSize: fonts.product }}>
                  <StatusBadge plu={item.plu} status={item.status} oldPlu={item.old_plu} className="px-1 py-0" style={{ fontSize: fonts.product }} />
                </td>
                <td className="px-1.5 py-0.5 truncate" style={{ fontSize: fonts.product }} title={getDisplayNameForItem(item.display_name, item.system_name, (item as unknown as DisplayItem).is_custom)}>
                  {getDisplayNameForItem(item.display_name, item.system_name, (item as unknown as DisplayItem).is_custom)}
                </td>
                <td className="px-1.5 py-0.5 border-l border-border" style={{ fontSize: fonts.product }}>
                  {(item as unknown as DisplayItem).preis != null ? (
                    <PreisBadge value={(item as unknown as DisplayItem).preis!} style={{ fontSize: Math.max(8, fonts.product - 1) + 'px' }} />
                  ) : null}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
