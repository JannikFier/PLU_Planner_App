// Find-in-Page für einfache Listen (scope + data-row-index), analog PLUTable

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useFindInPage } from '@/hooks/useFindInPage'
import { scrollToDataRowIndexInScope } from '@/lib/find-in-page-scroll'

export interface UseListFindInPageSectionOptions<T> {
  items: T[]
  scopeId: string
  /** Treffer wenn true; üblicherweise itemMatchesSearch o. Ä. mit deferredQuery */
  isMatch: (item: T, deferredQuery: string) => boolean
}

export interface UseListFindInPageSectionResult {
  searchText: string
  setSearchText: (v: string) => void
  showBar: boolean
  openSearch: () => void
  closeSearch: () => void
  deferredSearch: string
  findInPageBarProps: {
    searchText: string
    onSearchTextChange: (value: string) => void
    currentIndex: number
    totalMatches: number
    onPrev: () => void
    onNext: () => void
    onClose: () => void
  }
  /** Zeilenindex in items (0-basiert) des aktiven Treffers */
  activeRowIndex: number | null
  matchIndices: number[]
}

export function useListFindInPageSection<T>({
  items,
  scopeId,
  isMatch,
}: UseListFindInPageSectionOptions<T>): UseListFindInPageSectionResult {
  const [searchText, setSearchText] = useState('')
  const deferredSearch = useDebouncedValue(searchText, 200)
  const [searchOpen, setSearchOpen] = useState(false)
  const showBar = searchOpen || searchText.trim().length > 0

  const stableMatch = useMemo(
    () => (item: T) => isMatch(item, deferredSearch),
    [isMatch, deferredSearch],
  )

  const { matchIndices, currentIndex, goNext, goPrev, totalMatches } = useFindInPage(
    items,
    deferredSearch,
    stableMatch,
  )

  const activeRowIndex = totalMatches > 0 ? (matchIndices[currentIndex] ?? null) : null

  useEffect(() => {
    if (totalMatches === 0 || activeRowIndex == null) return
    const run = () => {
      scrollToDataRowIndexInScope(scopeId, activeRowIndex)
    }
    requestAnimationFrame(() => requestAnimationFrame(run))
  }, [scopeId, currentIndex, totalMatches, matchIndices, deferredSearch, activeRowIndex])

  const closeSearch = useCallback(() => {
    setSearchOpen(false)
    setSearchText('')
  }, [])

  useEffect(() => {
    if (!showBar) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSearch()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showBar, closeSearch])

  const findInPageBarProps = useMemo(
    () => ({
      searchText,
      onSearchTextChange: setSearchText,
      currentIndex,
      totalMatches,
      onPrev: goPrev,
      onNext: goNext,
      onClose: closeSearch,
    }),
    [searchText, currentIndex, totalMatches, goPrev, goNext, closeSearch],
  )

  return {
    searchText,
    setSearchText,
    showBar,
    openSearch: () => setSearchOpen(true),
    closeSearch,
    deferredSearch,
    findInPageBarProps,
    activeRowIndex,
    matchIndices,
  }
}
