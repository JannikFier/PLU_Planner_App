// Liste zentraler Obst-Nachbesserungen: anzeigen, bearbeiten, löschen

import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2, Pencil, Trash2, ListTree } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useActiveVersion } from '@/hooks/useActiveVersion'
import { useBlocks } from '@/hooks/useBlocks'
import { useLayoutSettings } from '@/hooks/useLayoutSettings'
import { useObstManualSupplements } from '@/hooks/useObstManualSupplements'
import {
  obstCustomProductShowBlockField,
  obstCustomProductShowItemTypeField,
} from '@/lib/obst-custom-product-layout'
import { invalidateManualSupplementQueries } from '@/lib/manual-supplement-invalidate'
import { formatKWLabel } from '@/lib/plu-helpers'
import { supabase } from '@/lib/supabase'
import type { MasterPLUItem } from '@/types/database'

function formatPreis(p: number | null): string {
  if (p == null) return '–'
  return new Intl.NumberFormat('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(p)
}

export function ObstManualSupplementList() {
  const { isSuperAdmin } = useAuth()
  const queryClient = useQueryClient()
  const { data: activeVersion } = useActiveVersion()
  const versionId = activeVersion?.id
  const { data: rows = [], isLoading } = useObstManualSupplements(versionId, isSuperAdmin ?? false)
  const { data: blocks = [] } = useBlocks()
  const { data: layoutSettings } = useLayoutSettings()
  const showItemType = useMemo(
    () => obstCustomProductShowItemTypeField(layoutSettings),
    [layoutSettings],
  )
  const showBlock = useMemo(() => obstCustomProductShowBlockField(layoutSettings), [layoutSettings])

  const blockById = useMemo(() => new Map(blocks.map((b) => [b.id, b.name])), [blocks])
  const sortedBlocks = useMemo(
    () => [...blocks].sort((a, b) => a.order_index - b.order_index),
    [blocks],
  )

  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editRow, setEditRow] = useState<MasterPLUItem | null>(null)
  const [plu, setPlu] = useState('')
  const [name, setName] = useState('')
  const [itemType, setItemType] = useState<'PIECE' | 'WEIGHT'>('PIECE')
  const [blockId, setBlockId] = useState('')
  const [preis, setPreis] = useState('')

  const openEdit = (row: MasterPLUItem) => {
    setEditRow(row)
    setPlu(row.plu)
    setName(row.system_name)
    setItemType(row.item_type === 'WEIGHT' ? 'WEIGHT' : 'PIECE')
    setBlockId(row.block_id ?? '')
    setPreis(row.preis != null ? String(row.preis).replace('.', ',') : '')
  }

  const closeEdit = () => {
    setEditRow(null)
  }

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('master_plu_items')
        .delete()
        .eq('id', id)
        .eq('is_manual_supplement', true)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      toast.success('Nachbesserung gelöscht')
      setDeleteId(null)
      invalidateManualSupplementQueries(queryClient, { obstVersionId: versionId })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Löschen fehlgeschlagen'),
  })

  const updateMut = useMutation({
    mutationFn: async () => {
      if (!editRow) throw new Error('Keine Zeile')
      const pluTrim = plu.trim()
      if (!/^\d{4,5}$/.test(pluTrim)) throw new Error('PLU: 4 oder 5 Ziffern')
      const it: 'PIECE' | 'WEIGHT' = itemType
      const preisNum =
        preis.trim() === '' ? null : Math.round(parseFloat(preis.replace(',', '.')) * 100) / 100
      if (preis.trim() !== '' && (Number.isNaN(preisNum as number) || (preisNum as number) < 0)) {
        throw new Error('Ungültiger Preis')
      }
      const bid = showBlock ? blockId || null : null
      if (showBlock && !bid) throw new Error('Bitte Warengruppe wählen')

      const { error } = await supabase.rpc('update_obst_manual_supplement', {
        p_id: editRow.id,
        p_plu: pluTrim,
        p_system_name: name.trim(),
        p_item_type: it,
        p_block_id: bid,
        p_preis: preisNum,
      } as never)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      toast.success('Gespeichert')
      closeEdit()
      invalidateManualSupplementQueries(queryClient, { obstVersionId: versionId })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Speichern fehlgeschlagen'),
  })

  if (!isSuperAdmin || !activeVersion) return null

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ListTree className="h-4 w-4" />
            Aktuelle Nachbesserungen
          </CardTitle>
          <CardDescription>
            Einträge für {formatKWLabel(activeVersion.kw_nummer, activeVersion.jahr)} – nur manuell ergänzte Artikel.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Laden…
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Noch keine Nachbesserungen für diese KW.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[88px]">PLU</TableHead>
                    <TableHead>Bezeichnung</TableHead>
                    {showItemType && <TableHead className="w-[100px]">Typ</TableHead>}
                    {showBlock && <TableHead>Warengruppe</TableHead>}
                    <TableHead className="w-[90px] text-right">Preis</TableHead>
                    <TableHead className="w-[100px] text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-mono">{row.plu}</TableCell>
                      <TableCell>{row.system_name}</TableCell>
                      {showItemType && (
                        <TableCell>{row.item_type === 'WEIGHT' ? 'Gewicht' : 'Stück'}</TableCell>
                      )}
                      {showBlock && (
                        <TableCell className="text-muted-foreground">
                          {row.block_id ? blockById.get(row.block_id) ?? '–' : '–'}
                        </TableCell>
                      )}
                      <TableCell className="text-right tabular-nums">{formatPreis(row.preis)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label="Bearbeiten"
                          onClick={() => openEdit(row)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          aria-label="Löschen"
                          onClick={() => setDeleteId(row.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteId != null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Nachbesserung löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Der Eintrag wird aus der aktiven Masterliste entfernt. Das ist nur für manuell ergänzte Zeilen möglich.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMut.mutate(deleteId)}
            >
              {deleteMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Löschen'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={editRow != null} onOpenChange={(o) => !o && closeEdit()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nachbesserung bearbeiten</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-obst-plu">PLU</Label>
                <Input
                  id="edit-obst-plu"
                  inputMode="numeric"
                  maxLength={5}
                  value={plu}
                  onChange={(e) => setPlu(e.target.value.replace(/\D/g, '').slice(0, 5))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-obst-name">Bezeichnung</Label>
                <Input
                  id="edit-obst-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                />
              </div>
            </div>
            {showItemType && (
              <div className="space-y-2">
                <Label>Listentyp</Label>
                <Select value={itemType} onValueChange={(v) => setItemType(v as 'PIECE' | 'WEIGHT')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PIECE">Stück</SelectItem>
                    <SelectItem value="WEIGHT">Gewicht</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {showBlock && (
              <div className="space-y-2">
                <Label>Warengruppe</Label>
                <Select value={blockId} onValueChange={setBlockId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Wählen…" />
                  </SelectTrigger>
                  <SelectContent>
                    {sortedBlocks.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="edit-obst-preis">Preis (optional)</Label>
              <Input id="edit-obst-preis" value={preis} onChange={(e) => setPreis(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeEdit}>
              Abbrechen
            </Button>
            <Button type="button" onClick={() => updateMut.mutate()} disabled={updateMut.isPending}>
              {updateMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Speichern'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
