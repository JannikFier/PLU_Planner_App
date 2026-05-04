// Horizontale Navigation: Werbung · Backshop-Liste · PLU-Liste · Konfiguration (User/Admin/Viewer)

import { NavLink, useLocation } from 'react-router-dom'
import { getBackshopNavPrefix } from '@/lib/backshop-werbung-routes'
import { cn } from '@/lib/utils'

const navBtn =
  'inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition-colors border border-transparent'

export function BackshopBereichNav() {
  const location = useLocation()
  // Super-Admin: andere Einstiege (Markt-Detail, Upload) — diese Leiste gilt nur User/Admin/Viewer.
  if (location.pathname.startsWith('/super-admin')) {
    return null
  }

  const prefix = getBackshopNavPrefix(location.pathname)

  const isWerbungActive =
    location.pathname === `${prefix}/backshop-werbung` ||
    location.pathname.startsWith(`${prefix}/backshop-werbung/`)

  return (
    <nav
      className="flex flex-wrap gap-2 border-b border-border pb-3 mb-6"
      aria-label="Backshop-Bereich"
      data-tour={'backshop-bereich-nav'}
    >
      <NavLink
        to={`${prefix}/backshop-werbung`}
        className={() =>
          cn(navBtn, isWerbungActive ? 'bg-primary/10 text-primary border-primary/20' : 'text-muted-foreground hover:bg-muted')
        }
        end={false}
        data-tour={'backshop-hub-werbung-card'}
      >
        Werbung
      </NavLink>
      <NavLink
        to={`${prefix}/backshop-kacheln`}
        className={({ isActive }) =>
          cn(navBtn, isActive ? 'bg-primary/10 text-primary border-primary/20' : 'text-muted-foreground hover:bg-muted')
        }
        data-tour={'backshop-hub-kachel-link'}
      >
        Backshop-Liste
      </NavLink>
      <NavLink
        to={`${prefix}/backshop-list`}
        className={({ isActive }) =>
          cn(navBtn, isActive ? 'bg-primary/10 text-primary border-primary/20' : 'text-muted-foreground hover:bg-muted')
        }
        data-tour={'backshop-hub-list-card'}
      >
        PLU-Liste
      </NavLink>
      <NavLink
        to={`${prefix}/backshop/konfiguration`}
        className={({ isActive }) =>
          cn(navBtn, isActive ? 'bg-primary/10 text-primary border-primary/20' : 'text-muted-foreground hover:bg-muted')
        }
        data-tour={'backshop-hub-konfig-card'}
      >
        Konfiguration
      </NavLink>
    </nav>
  )
}
