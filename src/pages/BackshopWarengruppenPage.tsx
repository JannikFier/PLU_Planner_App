// BackshopWarengruppenPage: Deep-Link → Warengruppen & Sortierung (gemeinsame Seite mit Block-Sort)

import { Navigate, useLocation } from 'react-router-dom'

export function BackshopWarengruppenPage() {
  const location = useLocation()
  const prefix = location.pathname.startsWith('/super-admin') ? '/super-admin' : '/admin'
  const search = location.search ?? ''

  return <Navigate to={`${prefix}/backshop-block-sort${search}`} replace />
}
