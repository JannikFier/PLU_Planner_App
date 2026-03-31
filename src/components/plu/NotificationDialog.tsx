// NotificationDialog: Obst/Gemüse – Dialog-Hülle um ObstNotificationPanel

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useVersionNotification } from '@/hooks/useNotifications'
import { ObstNotificationPanel } from './ObstNotificationPanel'

interface NotificationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  notification: {
    id: string
    version_id: string
    versions?: {
      id: string
      kw_nummer: number
      jahr: number
      kw_label: string
    } | null
  }
}

/**
 * Dialog zum Durchsehen neuer und geänderter Produkte einer Obst/Gemüse-Version.
 */
export function NotificationDialog({ open, onOpenChange, notification }: NotificationDialogProps) {
  const versionId = notification.version_id
  const versionInfo = (notification as { versions?: { kw_label: string } }).versions
  const { data: versionNotif } = useVersionNotification(versionId)
  const showInfoHint = versionNotif == null || versionNotif.is_read === false

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Benachrichtigung – {versionInfo?.kw_label ?? 'aktive KW'}</DialogTitle>
          <DialogDescription>
            Neue und geänderte Produkte aus dem letzten Upload. Ausgeblendete erscheinen nicht in der PLU-Liste und im
            PDF.
          </DialogDescription>
        </DialogHeader>

        <ObstNotificationPanel
          versionId={versionId}
          showInfoHint={showInfoHint}
          onAfterMarkRead={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
