// Backshop Umbenennen: RPCs für display_name + optional image_url

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

/** Fehlermeldung aus Supabase/PostgrestError oder Error lesen */
function getErrorMessage(error: unknown): string {
  if (error == null) return 'Unbekannt'
  if (typeof error === 'object' && 'message' in error && typeof (error as { message: unknown }).message === 'string') {
    return (error as { message: string }).message
  }
  if (error instanceof Error) return error.message
  return String(error)
}

/** Backshop-Master-Item umbenennen (Admin + Super-Admin); new_image_url: undefined = unverändert, '' = entfernen, sonst = neue URL */
export function useRenameBackshopMasterProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      item_id,
      new_display_name,
      new_image_url,
    }: {
      item_id: string
      new_display_name: string
      new_image_url?: string | null
    }) => {
      const { error } = await supabase.rpc('rename_backshop_master_plu_item', {
        item_id,
        new_display_name,
        new_image_url: new_image_url === undefined ? null : new_image_url === '' ? '' : new_image_url,
      } as never)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backshop-plu-items'] })
      toast.success('Produktname geändert')
    },
    onError: (error) => {
      toast.error(`Fehler: ${getErrorMessage(error)}`)
    },
  })
}

/** Backshop-Master-Item-Name zurücksetzen (Admin + Super-Admin); Bild unverändert */
export function useResetBackshopProductName() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ item_id, system_name }: { item_id: string; system_name: string }) => {
      const { error } = await supabase.rpc('reset_backshop_master_plu_item_display_name', {
        item_id,
        system_name,
      } as never)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backshop-plu-items'] })
      toast.success('Produktname zurückgesetzt')
    },
    onError: (error) => {
      toast.error(`Fehler: ${getErrorMessage(error)}`)
    },
  })
}

/** Nur „umbenannt“-Flag entfernen (z. B. wenn nur Bild geändert wurde). Entfernt Eintrag aus „Umbenannte Produkte“. */
export function useClearBackshopRenamedFlag() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (item_id: string) => {
      const { error } = await supabase.rpc('clear_backshop_manually_renamed_flag', { item_id } as never)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backshop-plu-items'] })
      toast.success('Aus Liste entfernt')
    },
    onError: (error) => {
      toast.error(`Fehler: ${getErrorMessage(error)}`)
    },
  })
}
