// NotificationBell: Glocken-Icon mit Badge für neue/geänderte Produkte der aktiven KW

import { useState } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useActiveVersion } from '@/hooks/useActiveVersion'
import { useActiveVersionChangeCount } from '@/hooks/useNotifications'
import { NotificationDialog } from './NotificationDialog'

/**
 * Glocken-Icon für den AppHeader.
 * Zeigt Badge mit Anzahl neuer + geänderter Produkte in der aktiven Version (KW).
 * Klick öffnet den NotificationDialog für die aktive Version.
 */
export function NotificationBell() {
  const { data: activeVersion } = useActiveVersion()
  const { data: count = 0 } = useActiveVersionChangeCount()
  const [dialogOpen, setDialogOpen] = useState(false)

  // Notification-ähnliches Objekt aus aktiver Version für den Dialog
  const notificationForDialog =
    activeVersion &&
    ({
      id: activeVersion.id,
      version_id: activeVersion.id,
      versions: {
        id: activeVersion.id,
        kw_nummer: activeVersion.kw_nummer,
        jahr: activeVersion.jahr,
        kw_label: activeVersion.kw_label,
      },
    } as const)

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setDialogOpen(true)}
        aria-label="Benachrichtigungen"
      >
        <Bell className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </Button>

      {notificationForDialog && (
        <NotificationDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          notification={notificationForDialog}
        />
      )}
    </>
  )
}
