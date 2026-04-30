import { AppHeader } from './AppHeader'
import { useTestMode } from '@/contexts/TestModeContext'

interface DashboardLayoutProps {
  children: React.ReactNode
  /** Kein AppHeader (z. B. Kassenmodus mit eigenem Rahmen) */
  hideHeader?: boolean
}

/**
 * Dashboard Layout – Wrapper fuer alle geschuetzten Seiten.
 * Enthaelt Header und Content-Bereich mit konsistenten Abstaenden.
 * Im Testmodus wird ein gelber Rahmen angezeigt.
 */
export function DashboardLayout({ children, hideHeader = false }: DashboardLayoutProps) {
  const { isTestMode } = useTestMode()

  return (
    <div
      className="min-h-screen bg-background"
      style={isTestMode ? { border: '4px solid #EAB308' } : undefined}
    >
      {!hideHeader && <AppHeader />}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {children}
      </main>
    </div>
  )
}
