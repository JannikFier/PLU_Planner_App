// BackshopNotificationDialog: Dialog-Hülle um BackshopNotificationPanel

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useBackshopVersionNotification } from '@/hooks/useBackshopNotifications'
import { BackshopNotificationPanel } from './BackshopNotificationPanel'

interface BackshopNotificationDialogProps {
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

export function BackshopNotificationDialog({
  open,
  onOpenChange,
  notification,
}: BackshopNotificationDialogProps) {
  const versionId = notification.version_id
  const versionInfo = notification.versions
  const { data: versionNotif } = useBackshopVersionNotification(versionId)
  const showInfoHint = versionNotif == null || versionNotif.is_read === false

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Backshop – {versionInfo?.kw_label ?? 'aktive KW'}</DialogTitle>
          <DialogDescription>
            Neue und geänderte Backshop-Produkte aus dem letzten Upload. Ausgeblendete erscheinen nicht in der
            PLU-Liste und im PDF.
          </DialogDescription>
        </DialogHeader>

        <BackshopNotificationPanel
          versionId={versionId}
          showInfoHint={showInfoHint}
          onAfterMarkRead={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
