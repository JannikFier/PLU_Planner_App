import { useEffect, useState } from 'react'

/**
 * true, wenn Viewport mindestens minWidthPx breit ist (matchMedia).
 * Für responsive Layouts (z. B. Warengruppen-Workbench ab xl = 1280px).
 */
export function useMediaMinWidth(minWidthPx: number): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia(`(min-width: ${minWidthPx}px)`).matches,
  )

  useEffect(() => {
    const m = window.matchMedia(`(min-width: ${minWidthPx}px)`)
    const sync = () => setMatches(m.matches)
    sync()
    m.addEventListener('change', sync)
    return () => m.removeEventListener('change', sync)
  }, [minWidthPx])

  return matches
}

/** Tailwind `xl` – gleicher Breakpoint wie 3-Spalten-Warengruppen-Workbench. */
export const WARENGRUPPEN_WORKBENCH_DESKTOP_MIN_PX = 1280
