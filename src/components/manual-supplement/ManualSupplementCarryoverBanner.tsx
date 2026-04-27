// Hinweis: manuelle Nachbesserungen aus der Vor-KW in die aktive Liste übernehmen (Super-Admin)

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Loader2, RefreshCw } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import {
  useBackshopManualSupplementCarryoverPending,
  useObstManualSupplementCarryoverPending,
} from '@/hooks/useManualSupplementCarryoverPending'
import { useVersions } from '@/hooks/useVersions'
import { useBackshopVersions } from '@/hooks/useBackshopVersions'
import { supabase } from '@/lib/supabase'

type ListKind = 'obst' | 'backshop'

export function ManualSupplementCarryoverBanner({ listType }: { listType: ListKind }) {
  const { isSuperAdmin } = useAuth()
  const queryClient = useQueryClient()
  const { data: obstVersions = [] } = useVersions()
  const { data: bsVersions = [] } = useBackshopVersions()

  const obstQ = useObstManualSupplementCarryoverPending(listType === 'obst' ? obstVersions : undefined)
  const bsQ = useBackshopManualSupplementCarryoverPending(listType === 'backshop' ? bsVersions : undefined)

  const pending =
    listType === 'obst'
      ? obstQ.data
      : bsQ.data
  const isLoading = listType === 'obst' ? obstQ.isLoading : bsQ.isLoading

  const carryMut = useMutation({
    mutationFn: async () => {
      if (!pending?.fromVersionId || !pending.toVersionId) throw new Error('Keine Daten')
      if (listType === 'obst') {
        const { data, error } = await supabase.rpc('carry_over_obst_manual_supplements', {
          p_from_version_id: pending.fromVersionId,
          p_to_version_id: pending.toVersionId,
        } as never)
        if (error) throw error
        return data as number
      }
      const { data, error } = await supabase.rpc('carry_over_backshop_manual_supplements', {
        p_from_version_id: pending.fromVersionId,
        p_to_version_id: pending.toVersionId,
      } as never)
      if (error) throw error
      return data as number
    },
    onSuccess: (n) => {
      toast.success(n === 0 ? 'Nichts zu übernehmen' : `${n} Nachbesserung(en) übernommen`)
      queryClient.invalidateQueries({ queryKey: ['versions'] })
      queryClient.invalidateQueries({ queryKey: ['version', 'active'] })
      queryClient.invalidateQueries({ queryKey: ['plu-items'] })
      queryClient.invalidateQueries({ queryKey: ['backshop-versions'] })
      queryClient.invalidateQueries({ queryKey: ['backshop-version', 'active'] })
      queryClient.invalidateQueries({ queryKey: ['backshop-plu-items'] })
      queryClient.invalidateQueries({ queryKey: ['manual-supplement-carryover-pending'] })
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : 'Übernahme fehlgeschlagen')
    },
  })

  if (!isSuperAdmin) return null
  if (isLoading || !pending || pending.pendingCount === 0) return null

  return (
    <Alert className="border-amber-200 bg-amber-50/80 dark:bg-amber-950/20">
      <RefreshCw className="h-4 w-4 text-amber-800 dark:text-amber-200" />
      <AlertTitle className="text-amber-900 dark:text-amber-100">
        Nachbesserungen aus der Vor-KW
      </AlertTitle>
      <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span>
          Es gibt{' '}
          <strong>{pending.pendingCount}</strong>{' '}
          manuelle Nachbesserung(en), die in der neuen Liste noch nicht vorkommen. Diese für die aktuelle KW übernehmen?
        </span>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="shrink-0"
          disabled={carryMut.isPending}
          onClick={() => carryMut.mutate()}
        >
          {carryMut.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Übernehmen…
            </>
          ) : (
            'In aktuelle KW übernehmen'
          )}
        </Button>
      </AlertDescription>
    </Alert>
  )
}
