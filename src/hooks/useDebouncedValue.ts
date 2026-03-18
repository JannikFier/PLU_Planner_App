import { useState, useEffect } from 'react'

/**
 * Verzögert die Aktualisierung eines Wertes um `delay` ms.
 * Nützlich für Suchfelder, um nicht bei jedem Tastendruck zu filtern.
 */
export function useDebouncedValue<T>(value: T, delay = 200): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])

  return debounced
}
