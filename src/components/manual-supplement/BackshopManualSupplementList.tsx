// Liste zentraler Backshop-Nachbesserungen: anzeigen, bearbeiten, löschen

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
import { Loader2, Pencil, Trash2, ListTree, ImageIcon } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useActiveBackshopVersion } from '@/hooks/useActiveBackshopVersion'
import { useBackshopBlocks } from '@/hooks/useBackshopBlocks'
import { useBackshopManualSupplements } from '@/hooks/useBackshopManualSupplements'
import { invalidateManualSupplementQueries } from '@/lib/manual-supplement-invalidate'
import { uploadBackshopImage } from '@/lib/backshop-storage'
import { formatKWLabel } from '@/lib/plu-helpers'
import { supabase } from '@/lib/supabase'
import type { BackshopMasterPLUItem } from '@/types/database'

export function BackshopManualSupplementList() {
  const { isSuperAdmin, user } = useAuth()
  const queryClient = useQueryClient()
  const { data: activeVersion } = useActiveBackshopVersion()
  const versionId = activeVersion?.id
  const { data: rows = [], isLoading } = useBackshopManualSupplements(versionId, isSuperAdmin ?? false)
  const { data: blocks = [] } = useBackshopBlocks()

  const blockById = useMemo(() => new Map(blocks.map((b) => [b.id, b.name])), [blocks])
  const sortedBlocks = useMemo(
    () => [...blocks].sort((a, b) => a.order_index - b.order_index),
    [blocks],
  )

  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editRow, setEditRow] = useState<BackshopMasterPLUItem | null>(null)
  const [plu, setPlu] = useState('')
  const [name, setName] = useState('')
  const [blockId, setBlockId] = useState('__none')
  const [file, setFile] = useState<File | null>(null)

  const openEdit = (row: BackshopMasterPLUItem) => {
    setEditRow(row)
    setPlu(row.plu)
    setName(row.system_name)
    setBlockId(row.block_id ?? '__none')
    setFile(null)
  }

  const closeEdit = () => {
    setEditRow(null)
    setFile(null)
  }

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('backshop_master_plu_items')
        .delete()
        .eq('id', id)
        .eq('is_manual_supplement', true)
        .eq('source', 'manual')
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      toast.success('Nachbesserung gelöscht')
      setDeleteId(null)
      invalidateManualSupplementQueries(queryClient, { backshopVersionId: versionId })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Löschen fehlgeschlagen'),
  })

  const updateMut = useMutation({
    mutationFn: async () => {
      if (!editRow || !user?.id) throw new Error('Ungültig')
      const pluTrim = plu.trim()
      if (!/^\d{4,5}$/.test(pluTrim)) throw new Error('PLU: 4 oder 5 Ziffern')
      let imageUrl = editRow.image_url ?? ''
      if (file) {
        imageUrl = await uploadBackshopImage(file, `manual-supplement/${editRow.version_id}/${user.id}`)
      }
      if (!imageUrl?.trim()) throw new Error('Bild-URL fehlt')

      const bid = blockId === '__none' ? null : blockId
      const { error } = await supabase.rpc('update_backshop_manual_supplement', {
        p_id: editRow.id,
        p_plu: pluTrim,
        p_system_name: name.trim(),
        p_image_url: imageUrl.trim(),
        p_block_id: bid,
      } as never)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      toast.success('Gespeichert')
      closeEdit()
      invalidateManualSupplementQueries(queryClient, { backshopVersionId: versionId })
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
            Einträge für {formatKWLabel(activeVersion.kw_nummer, activeVersion.jahr)} – nur manuell ergänzte Artikel
            (Quelle Nachbesserung).
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
                    <TableHead className="w-[52px]" />
                    <TableHead className="w-[88px]">PLU</TableHead>
                    <TableHead>Bezeichnung</TableHead>
                    <TableHead>Warengruppe</TableHead>
                    <TableHead className="w-[100px] text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        {row.image_url ? (
                          <img
                            src={row.image_url}
                            alt=""
                            className="h-10 w-10 rounded border object-contain bg-muted/30"
                          />
                        ) : (
                          <span className="inline-flex h-10 w-10 items-center justify-center rounded border bg-muted/50 text-muted-foreground">
                            –
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono">{row.plu}</TableCell>
                      <TableCell>{row.system_name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.block_id ? blockById.get(row.block_id) ?? '–' : '–'}
                      </TableCell>
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
              Der Eintrag wird aus der aktiven Backshop-Liste entfernt.
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
                <Label htmlFor="edit-bs-plu">PLU</Label>
                <Input
                  id="edit-bs-plu"
                  inputMode="numeric"
                  maxLength={5}
                  value={plu}
                  onChange={(e) => setPlu(e.target.value.replace(/\D/g, '').slice(0, 5))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-bs-name">Bezeichnung</Label>
                <Input
                  id="edit-bs-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Warengruppe (optional)</Label>
              <Select value={blockId} onValueChange={setBlockId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Keine</SelectItem>
                  {sortedBlocks.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-bs-img">Neues Bild (optional; sonst bleibt das aktuelle)</Label>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  id="edit-bs-img"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="max-w-xs"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    setFile(f ?? null)
                    e.target.value = ''
                  }}
                />
                {file && (
                  <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                    <ImageIcon className="h-3 w-3" />
                    {file.name}
                  </span>
                )}
              </div>
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
