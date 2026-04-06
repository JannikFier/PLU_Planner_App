import { cn } from '@/lib/utils'

type AppBrandLogoProps = {
  /** z. B. Login groesser: h-16 w-16 */
  className?: string
}

/**
 * Marken-Icon aus public/favicon.svg (Primary-Blau, Fier Hub).
 * Dekorativ neben dem App-Namen – Beschriftung kommt separat (h1 o.ä.).
 */
export function AppBrandLogo({ className }: AppBrandLogoProps) {
  return (
    <img
      src="/favicon.svg"
      alt=""
      decoding="async"
      className={cn('h-9 w-9 shrink-0 rounded-lg object-cover', className)}
    />
  )
}
