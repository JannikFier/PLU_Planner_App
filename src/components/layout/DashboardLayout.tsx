import { AppHeader } from './AppHeader'

interface DashboardLayoutProps {
  children: React.ReactNode
}

/**
 * Dashboard Layout – Wrapper für alle geschützten Seiten.
 * Enthält Header und Content-Bereich mit konsistenten Abständen.
 */
export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {children}
      </main>
    </div>
  )
}
