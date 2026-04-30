import { Navigate } from 'react-router-dom'
import { useEffectiveListVisibility } from '@/hooks/useStoreListVisibility'
import { LoadingSkeleton } from '@/components/layout/ProtectedRoute'

/**
 * /kiosk ohne Unterpfad: erste sichtbare Liste (Obst bevorzugt), sonst Hinweis.
 */
export function KioskDefaultRedirect() {
  const { obstGemuese, backshop, isLoading } = useEffectiveListVisibility()

  if (isLoading) {
    return <LoadingSkeleton />
  }
  if (obstGemuese) {
    return <Navigate to="/kiosk/obst" replace />
  }
  if (backshop) {
    return <Navigate to="/kiosk/backshop" replace />
  }
  return (
    <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
      <p className="font-medium text-foreground">Keine Liste freigeschaltet</p>
      <p className="mt-2 text-sm">Für diesen Markt sind Obst/Gemüse und Backshop derzeit nicht sichtbar.</p>
    </div>
  )
}
