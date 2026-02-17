// Find-in-Page: Springen zu Treffern, Vor/Zurück (Chrome-artig)

import { useMemo, useState, useCallback, useEffect } from 'react'

export interface UseFindInPageResult {
  matchIndices: number[]
  currentIndex: number
  setCurrentIndex: (value: number | ((prev: number) => number)) => void
  goNext: () => void
  goPrev: () => void
  totalMatches: number
}

/**
 * Hook für Find-in-Page: ermittelt Treffer-Indizes und aktuellen Index mit Vor/Zurück.
 * @param items - Liste der durchsuchbaren Items
 * @param searchText - Suchtext (leer = keine Treffer)
 * @param isMatch - Predicate pro Item
 */
export function useFindInPage<T>(
  items: T[],
  searchText: string,
  isMatch: (item: T) => boolean,
): UseFindInPageResult {
  const matchIndices = useMemo(() => {
    const q = searchText.trim().toLowerCase()
    if (!q) return []
    return items
      .map((item, index) => (isMatch(item) ? index : -1))
      .filter((i) => i >= 0)
  }, [items, searchText, isMatch])

  const totalMatches = matchIndices.length

  const [currentIndex, setCurrentIndexState] = useState(0)

  // currentIndex in gültigen Bereich bringen
  useEffect(() => {
    setCurrentIndexState((prev) => {
      if (totalMatches === 0) return 0
      if (prev >= totalMatches) return totalMatches - 1
      return prev
    })
  }, [totalMatches])

  const setCurrentIndex = useCallback((value: number | ((prev: number) => number)) => {
    setCurrentIndexState((prev) => {
      const next = typeof value === 'function' ? value(prev) : value
      return Math.max(0, Math.min(totalMatches - 1, next))
    })
  }, [totalMatches])

  const goNext = useCallback(() => {
    setCurrentIndexState((prev) => (totalMatches <= 1 ? 0 : (prev + 1) % totalMatches))
  }, [totalMatches])

  const goPrev = useCallback(() => {
    setCurrentIndexState((prev) => (totalMatches <= 1 ? 0 : (prev - 1 + totalMatches) % totalMatches))
  }, [totalMatches])

  return {
    matchIndices,
    currentIndex,
    setCurrentIndex,
    goNext,
    goPrev,
    totalMatches,
  }
}
