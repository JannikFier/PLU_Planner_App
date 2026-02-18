import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Home } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

/**
 * 404-Seite – wird angezeigt wenn eine Route nicht existiert.
 * Zurück-Button führt je nach Rolle zum passenden Dashboard.
 */
export function NotFound() {
  const navigate = useNavigate()
  const { profile } = useAuth()

  const dashboardPath =
    profile?.role === 'super_admin' ? '/super-admin/masterlist' : profile?.role === 'admin' ? '/admin' : profile?.role === 'viewer' ? '/viewer' : '/user'

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
      <div className="text-center">
        <p className="text-7xl font-bold text-primary">404</p>
        <h1 className="mt-4 text-2xl font-semibold">Seite nicht gefunden</h1>
        <p className="mt-2 text-muted-foreground">
          Die angeforderte Seite existiert nicht oder wurde verschoben.
        </p>
      </div>
      <Button onClick={() => navigate(dashboardPath)} className="mt-4 gap-2">
        <Home className="h-4 w-4" />
        Zur Startseite
      </Button>
    </div>
  )
}
