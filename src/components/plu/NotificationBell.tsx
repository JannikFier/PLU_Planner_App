// NotificationBell: Glocken-Icon mit Badge für ungelesene Benachrichtigungen

import { useState } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useUnreadNotificationCount, useUnreadNotifications } from '@/hooks/useNotifications'
import { NotificationDialog } from './NotificationDialog'

/**
 * Glocken-Icon für den AppHeader.
 * Zeigt Badge mit Anzahl ungelesener Notifications.
 * Klick öffnet den NotificationDialog.
 */
export function NotificationBell() {
  const { data: count = 0 } = useUnreadNotificationCount()
  const { data: unreadNotifications = [] } = useUnreadNotifications()
  const [dialogOpen, setDialogOpen] = useState(false)

  // Letzte ungelesene Notification (für den Dialog)
  const latestNotification = unreadNotifications[0] ?? null

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setDialogOpen(true)}
      >
        <Bell className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </Button>

      {latestNotification && (
        <NotificationDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          notification={latestNotification}
        />
      )}
    </>
  )
}
