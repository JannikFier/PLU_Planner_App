import { cn } from '@/lib/utils'

export function BackshopHiddenBrandLetterBadge({
  letter,
  className,
}: {
  letter: 'E' | 'H' | 'A' | 'O'
  className?: string
}) {
  return (
    <span
      className={cn(
        'bshva-bbadge',
        letter === 'E' && 'bshva-bbadge--E',
        letter === 'H' && 'bshva-bbadge--H',
        letter === 'A' && 'bshva-bbadge--A',
        letter === 'O' && 'bshva-bbadge--O',
        className,
      )}
      aria-hidden
    >
      {letter}
    </span>
  )
}
