// Zentrale Nachbesserung Obst/Gemüse (nur Super-Admin, aktive KW-Version)

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
import { Loader2, PlusCircle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useActiveVersion } from '@/hooks/useActiveVersion'
import { useBlocks } from '@/hooks/useBlocks'
import { useLayoutSettings } from '@/hooks/useLayoutSettings'
import {
  obstCustomProductShowBlockField,
  obstCustomProductShowItemTypeField,
  OBST_CUSTOM_PRODUCT_DEFAULT_ITEM_TYPE,
} from '@/lib/obst-custom-product-layout'
import { invalidateManualSupplementQueries } from '@/lib/manual-supplement-invalidate'
import { formatKWLabel } from '@/lib/plu-helpers'
import { supabase } from '@/lib/supabase'

export function ObstManualSupplementCard() {
  const { isSuperAdmin } = useAuth()
  const queryClient = useQueryClient()
  const { data: activeVersion } = useActiveVersion()
  const { data: blocks = [] } = useBlocks()
  const { data: layoutSettings } = useLayoutSettings()
  const showItemType = useMemo(
    () => obstCustomProductShowItemTypeField(layoutSettings),
    [layoutSettings],
  )
  const showBlock = useMemo(() => obstCustomProductShowBlockField(layoutSettings), [layoutSettings])

  const [plu, setPlu] = useState('')
  const [name, setName] = useState('')
  const [itemType, setItemType] = useState<'PIECE' | 'WEIGHT' | ''>('')
  const [blockId, setBlockId] = useState('')
  const [preis, setPreis] = useState('')

  const sortedBlocks = useMemo(
    () => [...blocks].sort((a, b) => a.order_index - b.order_index),
    [blocks],
  )

  const insertMut = useMutation({
    mutationFn: async () => {
      if (!activeVersion?.id) throw new Error('Keine aktive Version')
      const pluTrim = plu.trim()
      if (!/^\d{4,5}$/.test(pluTrim)) throw new Error('PLU: 4 oder 5 Ziffern')
      const item = showItemType ? itemType || OBST_CUSTOM_PRODUCT_DEFAULT_ITEM_TYPE : OBST_CUSTOM_PRODUCT_DEFAULT_ITEM_TYPE
      const it: 'PIECE' | 'WEIGHT' = item === 'WEIGHT' ? 'WEIGHT' : 'PIECE'
      const preisNum =
        preis.trim() === '' ? null : Math.round(parseFloat(preis.replace(',', '.')) * 100) / 100
      if (preis.trim() !== '' && (Number.isNaN(preisNum as number) || (preisNum as number) < 0)) {
        throw new Error('Ungültiger Preis')
      }
      const bid = showBlock ? blockId || null : null
      if (showBlock && !bid) throw new Error('Bitte Warengruppe wählen')

      const { data, error } = await supabase.rpc('insert_obst_manual_supplement', {
        p_version_id: activeVersion.id,
        p_plu: pluTrim,
        p_system_name: name.trim(),
        p_item_type: it,
        p_block_id: bid,
        p_preis: preisNum,
      } as never)
      if (error) throw new Error(error.message)
      return data as string
    },
    onSuccess: () => {
      toast.success('Nachbesserung gespeichert')
      setPlu('')
      setName('')
      setItemType('')
      setBlockId('')
      setPreis('')
      invalidateManualSupplementQueries(queryClient, { obstVersionId: activeVersion?.id })
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
          Fehlende Artikel für die aktuell aktive Liste{' '}
          <strong>{formatKWLabel(activeVersion.kw_nummer, activeVersion.jahr)}</strong> ergänzen (ohne Excel).
          PLU und Bezeichnung dürfen in dieser Version noch nicht vorkommen.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="obst-supp-plu">PLU</Label>
            <Input
              id="obst-supp-plu"
              inputMode="numeric"
              maxLength={5}
              value={plu}
              onChange={(e) => setPlu(e.target.value.replace(/\D/g, '').slice(0, 5))}
              placeholder="z. B. 40501"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="obst-supp-name">Bezeichnung</Label>
            <Input
              id="obst-supp-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Artikelname"
              maxLength={100}
            />
          </div>
        </div>
        {showItemType && (
          <div className="space-y-2">
            <Label>Listentyp</Label>
            <Select
              value={itemType || 'PIECE'}
              onValueChange={(v) => setItemType(v as 'PIECE' | 'WEIGHT')}
            >
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
          <Label htmlFor="obst-supp-preis">Preis (optional)</Label>
          <Input
            id="obst-supp-preis"
            value={preis}
            onChange={(e) => setPreis(e.target.value)}
            placeholder="z. B. 1,99"
          />
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
