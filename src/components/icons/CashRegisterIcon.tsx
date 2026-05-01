import { cn } from '@/lib/utils'

type Props = {
  className?: string
}

/**
 * Registrierkasse als SVG (Display, Gehäuse, Tasten, Schublade).
 * lucide-react bietet kein eigenes Kassen-Glyph; daher projektlokal.
 */
export function CashRegisterIcon({ className }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0', className)}
      aria-hidden
    >
      {/* Kunden-Display */}
      <rect x="5" y="2.75" width="14" height="5.5" rx="1.2" stroke="currentColor" strokeWidth="1.75" />
      <line x1="7.5" y1="5.35" x2="16.5" y2="5.35" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity={0.4} />
      {/* Gehäuse */}
      <rect x="3.5" y="9.75" width="17" height="11.5" rx="1.65" stroke="currentColor" strokeWidth="1.75" />
      {/* Tastenfeld (Andeutung) */}
      <circle cx="8.25" cy="14.25" r="1" fill="currentColor" />
      <circle cx="12" cy="14.25" r="1" fill="currentColor" />
      <circle cx="15.75" cy="14.25" r="1" fill="currentColor" />
      <circle cx="10.1" cy="17.35" r="1" fill="currentColor" />
      <circle cx="13.9" cy="17.35" r="1" fill="currentColor" />
      {/* Geldschublade */}
      <path d="M7 21.35h10" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <rect x="8" y="19.85" width="8" height="2.15" rx="0.35" stroke="currentColor" strokeWidth="1.35" fill="none" />
    </svg>
  )
}
