// Ein Dialog für Obst/Gemüse + Backshop – nur eine Glocke im Header

import { useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useActiveVersion } from '@/hooks/useActiveVersion'
import { useActiveBackshopVersion } from '@/hooks/useActiveBackshopVersion'
import { useVersionNotification, useMarkNotificationRead } from '@/hooks/useNotifications'
import {
  useBackshopVersionNotification,
  useBackshopMarkNotificationRead,
} from '@/hooks/useBackshopNotifications'
import { useEffectiveListVisibility } from '@/hooks/useStoreListVisibility'
import { useCurrentStore } from '@/hooks/useCurrentStore'
import { ObstNotificationPanel } from './ObstNotificationPanel'
import { BackshopNotificationPanel } from './BackshopNotificationPanel'
import type { VersionNotification } from '@/types/database'
import type { BackshopVersionNotification } from '@/types/database'
import { Loader2 } from 'lucide-react'

interface UnifiedNotificationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Kein Eintrag oder bereits gelesen → Bereich blockiert Dialog-Schließen nicht. */
function sectionReadResolved(row: VersionNotification | BackshopVersionNotification | null | undefined): boolean {
  return row == null || row.is_read === true
}

export function UnifiedNotificationDialog({ open, onOpenChange }: UnifiedNotificationDialogProps) {
  const queryClient = useQueryClient()
  const { currentStoreId } = useCurrentStore()
  const { obstGemuese: obstVisible, backshop: backshopVisible } = useEffectiveListVisibility()

  const { data: activeObst } = useActiveVersion()
  const { data: activeBackshop } = useActiveBackshopVersion()

  const { data: obstVersionNotif } = useVersionNotification(activeObst?.id)
  const { data: backshopVersionNotif } = useBackshopVersionNotification(activeBackshop?.id)

  const obstShowHint = obstVersionNotif == null || obstVersionNotif.is_read === false
  const backshopShowHint = backshopVersionNotif == null || backshopVersionNotif.is_read === false

  const showObstSection = obstVisible && !!activeObst
  const showBackshopSection = backshopVisible && !!activeBackshop

  const markObstRead = useMarkNotificationRead()
  const markBackshopRead = useBackshopMarkNotificationRead()

  const showMarkAllRead = showObstSection && showBackshopSection

  const handleMarkAllRead = async () => {
    try {
      if (activeObst?.id) await markObstRead.mutateAsync(activeObst.id)
      if (activeBackshop?.id) await markBackshopRead.mutateAsync(activeBackshop.id)
      onOpenChange(false)
    } catch {
      // Toast in den Mutations-Hooks
    }
  }

  /** Dialog schließen, sobald alle sichtbaren Bereiche gelesen sind (nach Refetch aus dem Panel). */
  const closeIfAllSectionsRead = async () => {
    const obstId = activeObst?.id
    const backId = activeBackshop?.id
    if (!currentStoreId) {
      onOpenChange(false)
      return
    }
    if (obstId) await queryClient.refetchQueries({ queryKey: ['version-notification', obstId, currentStoreId] })
    if (backId) await queryClient.refetchQueries({ queryKey: ['backshop-version-notification', backId, currentStoreId] })

    const obstRow =
      showObstSection && obstId
        ? queryClient.getQueryData<VersionNotification | null>(['version-notification', obstId, currentStoreId])
        : undefined
    const backRow =
      showBackshopSection && backId
        ? queryClient.getQueryData<BackshopVersionNotification | null>([
            'backshop-version-notification',
            backId,
            currentStoreId,
          ])
        : undefined

    const obstOk = !showObstSection || sectionReadResolved(obstRow)
    const backOk = !showBackshopSection || sectionReadResolved(backRow)
    if (obstOk && backOk) {
      onOpenChange(false)
    }
  }

  const markAllPending = markObstRead.isPending || markBackshopRead.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Benachrichtigungen</DialogTitle>
          <DialogDescription>
            Neue und geänderte Produkte nach dem letzten Upload (Obst/Gemüse und Backshop). Ausgeblendete erscheinen nicht
            in den Listen und im PDF.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-[200px] space-y-8 pr-1">
          {!showObstSection && !showBackshopSection && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Keine aktive Kalenderwoche für die sichtbaren Bereiche.
            </p>
          )}

          {showObstSection && (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2">
                Obst/Gemüse – {activeObst.kw_label}
              </h3>
              <ObstNotificationPanel
                versionId={activeObst.id}
                showInfoHint={obstShowHint}
                onAfterMarkRead={() => {
                  void closeIfAllSectionsRead()
                }}
              />
            </section>
          )}

          {showBackshopSection && (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2">
                Backshop – {activeBackshop.kw_label}
              </h3>
              <BackshopNotificationPanel
                versionId={activeBackshop.id}
                showInfoHint={backshopShowHint}
                onAfterMarkRead={() => {
                  void closeIfAllSectionsRead()
                }}
              />
            </section>
          )}
        </div>

        {showMarkAllRead ? (
          <div className="shrink-0 border-t border-border pt-3 flex flex-wrap items-center justify-end gap-2">
            <p className="text-xs text-muted-foreground mr-auto max-w-[min(100%,20rem)]">
              Mit einem Klick Obst/Gemüse und Backshop als gelesen markieren (sonst je Bereich unten „Gelesen“).
            </p>
            <Button
              type="button"
              variant="secondary"
              disabled={markAllPending}
              onClick={() => void handleMarkAllRead()}
            >
              {markAllPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden /> : null}
              Alles als gelesen markieren
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
