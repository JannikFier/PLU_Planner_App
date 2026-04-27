// BlockSortPage: Weiterleitung zur Obst-Warengruppen-Workbench (alte URL bleibt gültig)

import { Navigate, useLocation } from 'react-router-dom'

export function BlockSortPage() {
  const location = useLocation()
  const prefix = location.pathname.startsWith('/super-admin') ? '/super-admin' : '/admin'
  const target = `${prefix}/obst-warengruppen${location.search}`

  return <Navigate to={target} replace />
}
