// Zentrale Nachbesserung Backshop (nur Super-Admin, Quelle manual, Bild Pflicht)

import { useState, useMemo } from 'react'
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
import { Loader2, PlusCircle, ImageIcon } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useActiveBackshopVersion } from '@/hooks/useActiveBackshopVersion'
import { useBackshopBlocks } from '@/hooks/useBackshopBlocks'
import { invalidateManualSupplementQueries } from '@/lib/manual-supplement-invalidate'
import { uploadBackshopImage } from '@/lib/backshop-storage'
import { formatKWLabel } from '@/lib/plu-helpers'
import { supabase } from '@/lib/supabase'

export function BackshopManualSupplementCard() {
  const { isSuperAdmin, user } = useAuth()
  const queryClient = useQueryClient()
  const { data: activeVersion } = useActiveBackshopVersion()
  const { data: blocks = [] } = useBackshopBlocks()

  const [plu, setPlu] = useState('')
  const [name, setName] = useState('')
  const [blockId, setBlockId] = useState('__none')
  const [file, setFile] = useState<File | null>(null)

  const sortedBlocks = useMemo(
    () => [...blocks].sort((a, b) => a.order_index - b.order_index),
    [blocks],
  )

  const insertMut = useMutation({
    mutationFn: async () => {
      if (!activeVersion?.id) throw new Error('Keine aktive Backshop-Version')
      if (!user?.id) throw new Error('Nicht angemeldet')
      const pluTrim = plu.trim()
      if (!/^\d{4,5}$/.test(pluTrim)) throw new Error('PLU: 4 oder 5 Ziffern')
      if (!file) throw new Error('Bitte ein Produktbild wählen')
      const url = await uploadBackshopImage(file, `manual-supplement/${activeVersion.id}/${user.id}`)

      const bid = blockId === '__none' ? null : blockId
      const { data, error } = await supabase.rpc('insert_backshop_manual_supplement', {
        p_version_id: activeVersion.id,
        p_plu: pluTrim,
        p_system_name: name.trim(),
        p_image_url: url,
        p_block_id: bid,
      } as never)
      if (error) throw new Error(error.message)
      return data as string
    },
    onSuccess: () => {
      toast.success('Nachbesserung gespeichert')
      setPlu('')
      setName('')
      setBlockId('__none')
      setFile(null)
      invalidateManualSupplementQueries(queryClient, { backshopVersionId: activeVersion?.id })
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : 'Speichern fehlgeschlagen')
    },
  })

  if (!isSuperAdmin || !activeVersion) return null

  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <PlusCircle className="h-4 w-4" />
          Zentrale Nachbesserung
        </CardTitle>
        <CardDescription>
          Fehlende Artikel für die aktive Backshop-Liste{' '}
          <strong>{formatKWLabel(activeVersion.kw_nummer, activeVersion.jahr)}</strong> mit Bild ergänzen (Quelle „Nachbesserung“).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="bs-supp-plu">PLU</Label>
            <Input
              id="bs-supp-plu"
              inputMode="numeric"
              maxLength={5}
              value={plu}
              onChange={(e) => setPlu(e.target.value.replace(/\D/g, '').slice(0, 5))}
              placeholder="z. B. 40123"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bs-supp-name">Bezeichnung</Label>
            <Input
              id="bs-supp-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Artikelname"
              maxLength={100}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Warengruppe (optional)</Label>
          <Select value={blockId} onValueChange={setBlockId}>
            <SelectTrigger>
              <SelectValue placeholder="Keine / später zuordnen" />
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
          <Label htmlFor="bs-supp-img">Produktbild (Pflicht)</Label>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              id="bs-supp-img"
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
        <Button type="button" onClick={() => insertMut.mutate()} disabled={insertMut.isPending}>
          {insertMut.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Speichern…
            </>
          ) : (
            'Nachbesserung hinzufügen'
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
