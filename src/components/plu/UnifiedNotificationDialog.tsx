// Ein Dialog für Obst/Gemüse + Backshop – nur eine Glocke im Header

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useActiveVersion } from '@/hooks/useActiveVersion'
import { useActiveBackshopVersion } from '@/hooks/useActiveBackshopVersion'
import { useVersionNotification } from '@/hooks/useNotifications'
import { useBackshopVersionNotification } from '@/hooks/useBackshopNotifications'
import { useUserListVisibility } from '@/hooks/useStoreListVisibility'
import { ObstNotificationPanel } from './ObstNotificationPanel'
import { BackshopNotificationPanel } from './BackshopNotificationPanel'

interface UnifiedNotificationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UnifiedNotificationDialog({ open, onOpenChange }: UnifiedNotificationDialogProps) {
  const { data: visibility } = useUserListVisibility()
  const obstVisible = visibility?.find((v) => v.list_type === 'obst_gemuese')?.is_visible ?? true
  const backshopVisible = visibility?.find((v) => v.list_type === 'backshop')?.is_visible ?? true

  const { data: activeObst } = useActiveVersion()
  const { data: activeBackshop } = useActiveBackshopVersion()

  const { data: obstVersionNotif } = useVersionNotification(activeObst?.id)
  const { data: backshopVersionNotif } = useBackshopVersionNotification(activeBackshop?.id)

  const obstShowHint = obstVersionNotif == null || obstVersionNotif.is_read === false
  const backshopShowHint = backshopVersionNotif == null || backshopVersionNotif.is_read === false

  const showObstSection = obstVisible && !!activeObst
  const showBackshopSection = backshopVisible && !!activeBackshop

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
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
                  /* Query invalidiert Hook; Dialog offen lassen für Backshop-Abschnitt */
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
                onAfterMarkRead={() => {}}
              />
            </section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
