// BackshopNotificationBell: Glocke mit Badge für Backshop-Benachrichtigungen

import { useState } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useActiveBackshopVersion } from '@/hooks/useActiveBackshopVersion'
import { useBackshopActiveVersionChangeCount } from '@/hooks/useBackshopNotifications'
import { BackshopNotificationDialog } from './BackshopNotificationDialog'

/**
 * Glocke für Backshop-Seiten: zeigt Anzahl neuer + geänderter Produkte der aktiven Backshop-Version.
 */
export function BackshopNotificationBell() {
  const { data: activeVersion } = useActiveBackshopVersion()
  const { data: count = 0 } = useBackshopActiveVersionChangeCount()
  const [dialogOpen, setDialogOpen] = useState(false)

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
        aria-label="Backshop-Benachrichtigungen"
      >
        <Bell className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </Button>

      {notificationForDialog && (
        <BackshopNotificationDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          notification={notificationForDialog}
        />
      )}
    </>
  )
}
