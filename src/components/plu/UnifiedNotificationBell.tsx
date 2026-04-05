// Eine Glocke: ungelesene Benachrichtigungen Obst + Backshop (nach Bereichs-Sichtbarkeit)

import { useState } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useUnreadNotificationCount } from '@/hooks/useNotifications'
import { useBackshopUnreadNotificationCount } from '@/hooks/useBackshopNotifications'
import { useEffectiveListVisibility } from '@/hooks/useStoreListVisibility'
import { UnifiedNotificationDialog } from './UnifiedNotificationDialog'

/**
 * Eine Glocke im Header: Badge = Summe ungelesener Einträge (version_notifications + backshop),
 * nur für sichtbare Bereiche (obst_gemuese / backshop).
 */
export function UnifiedNotificationBell() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const { data: obstUnread = 0 } = useUnreadNotificationCount()
  const { data: backshopUnread = 0 } = useBackshopUnreadNotificationCount()
  const { obstGemuese: obstVisible, backshop: backshopVisible } = useEffectiveListVisibility()

  const totalUnread = (obstVisible ? obstUnread : 0) + (backshopVisible ? backshopUnread : 0)

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
        {totalUnread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 px-0.5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
            {totalUnread > 9 ? '9+' : totalUnread}
          </span>
        )}
      </Button>

      <UnifiedNotificationDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  )
}
