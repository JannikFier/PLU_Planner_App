// Zurück-Ziel für Vollseiten-Picker (Ausblenden / Umbenennen) – Header-Pfeil + state.backTo

const PICKER_SEGMENTS = [
  'pick-hide-obst',
  'pick-hide-backshop',
  'pick-rename-obst',
  'pick-rename-backshop',
] as const

type PickerSegment = (typeof PICKER_SEGMENTS)[number]

const FALLBACK_BY_SEGMENT: Record<PickerSegment, string> = {
  'pick-hide-obst': 'hidden-products',
  'pick-hide-backshop': 'backshop-hidden-products',
  'pick-rename-obst': 'renamed-products',
  'pick-rename-backshop': 'backshop-renamed-products',
}

const ALLOWED_PARENT_SEGMENTS = new Set([
  'hidden-products',
  'hidden-items',
  'renamed-products',
  'backshop-hidden-products',
  'backshop-renamed-products',
])

function rolePrefixFromPath(pathname: string): '/user' | '/admin' | '/super-admin' | null {
  if (pathname.startsWith('/super-admin')) return '/super-admin'
  if (pathname.startsWith('/admin')) return '/admin'
  if (pathname.startsWith('/user')) return '/user'
  return null
}

/** Prüft backTo für Picker: gleicher Rollen-Bereich, keine Open-Redirects. */
export function isSafePickerBackTo(backTo: string, rolePrefix: '/user' | '/admin' | '/super-admin'): boolean {
  const t = backTo.trim()
  if (!t.startsWith(rolePrefix + '/')) return false
  if (t.includes('//')) return false
  if (/[\s\r\n]/.test(t)) return false
  const lower = t.toLowerCase()
  if (lower.includes('javascript:') || lower.includes('data:')) return false

  const pathPart = t.split('?')[0] ?? t
  const parts = pathPart.split('/').filter(Boolean)
  if (parts.length < 2) return false
  const seg = parts[parts.length - 1]
  if (!ALLOWED_PARENT_SEGMENTS.has(seg)) return false
  return true
}

function pickerSegment(pathname: string): PickerSegment | null {
  const parts = pathname.split('/').filter(Boolean)
  const last = parts[parts.length - 1]
  if (!last) return null
  return (PICKER_SEGMENTS as readonly string[]).includes(last) ? (last as PickerSegment) : null
}

export function isPickerPath(pathname: string): boolean {
  return pickerSegment(pathname) != null
}

/**
 * Wenn pathname ein Picker ist: gültiges state.backTo oder Fallback-Elternseite.
 * Sonst null (Header nutzt reguläre Logik).
 */
export function resolvePickerBackTarget(
  pathname: string,
  locationState: unknown,
): string | null {
  const seg = pickerSegment(pathname)
  if (!seg) return null

  const prefix = rolePrefixFromPath(pathname)
  if (!prefix) return null

  const backTo = (locationState as { backTo?: string } | null)?.backTo?.trim()
  if (backTo && isSafePickerBackTo(backTo, prefix)) {
    return backTo
  }

  return `${prefix}/${FALLBACK_BY_SEGMENT[seg]}`
}
