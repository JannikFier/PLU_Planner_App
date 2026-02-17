import React from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

/**
 * Einzelne Kachel – für User-, Admin- und SuperAdmin-Dashboards.
 * Klickbar via onClick (Navigation oder custom Aktion wie Dialog/toast).
 */
export const DashboardCard = React.memo(function DashboardCard({
  title,
  description,
  icon: Icon,
  onClick,
  color,
  bg,
}: {
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  onClick: () => void
  color: string
  bg: string
}) {
  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-md hover:border-primary/20"
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center gap-4 pb-2">
        <div className={cn('rounded-lg p-3', bg)}>
          <Icon className={cn('h-6 w-6', color)} />
        </div>
        <div>
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent />
    </Card>
  )
})

/** Item-Typ für DashboardGroupCard */
export interface DashboardGroupCardItem {
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  to: string
  color: string
  bg: string
}

/**
 * Überkachel mit mehreren Einträgen – für SuperAdmin-Dashboard.
 * Jeder Eintrag ist ein Link zur Zielroute.
 */
export const DashboardGroupCard = React.memo(function DashboardGroupCard({
  title,
  description,
  items,
}: {
  title: string
  description: string
  items: DashboardGroupCardItem[]
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1 pt-0">
        {items.map((item) => (
          <Link
            key={item.title}
            to={item.to}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/60"
          >
            <div className={cn('rounded-md p-2', item.bg)}>
              <item.icon className={cn('h-4 w-4', item.color)} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm">{item.title}</p>
              <p className="text-xs text-muted-foreground truncate">{item.description}</p>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  )
})
