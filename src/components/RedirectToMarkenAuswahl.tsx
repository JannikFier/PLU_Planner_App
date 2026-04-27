// Leitet /…/backshop-marken-tinder dauerhaft auf /…/marken-auswahl inkl. Query-String.
import { Navigate, useLocation } from 'react-router-dom'

export function RedirectToMarkenAuswahl() {
  const l = useLocation()
  return (
    <Navigate
      to={{ pathname: l.pathname.replace('backshop-marken-tinder', 'marken-auswahl'), search: l.search }}
      replace
    />
  )
}
