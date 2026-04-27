import type { BackshopSource } from '@/types/database'

const LETTER: Record<'edeka' | 'harry' | 'aryzta', 'E' | 'H' | 'A'> = {
  edeka: 'E',
  harry: 'H',
  aryzta: 'A',
}

/** Erste sichtbare Excel-Quelle der Zeile, sonst „O“ (Eigen/Unbekannt). */
export function manualRowPrimaryLetter(
  source: 'master' | 'custom' | 'unknown',
  backshopSources: BackshopSource[] | undefined,
): 'E' | 'H' | 'A' | 'O' {
  if (source === 'custom' || source === 'unknown') return 'O'
  const s = (backshopSources?.[0] ?? 'edeka') as BackshopSource
  if (s === 'manual') return 'O'
  if (s === 'edeka' || s === 'harry' || s === 'aryzta') return LETTER[s]
  return 'E'
}

export function ruleRowLetter(source: BackshopSource): 'E' | 'H' | 'A' | 'O' {
  if (source === 'manual') return 'O'
  if (source === 'edeka' || source === 'harry' || source === 'aryzta') return LETTER[source]
  return 'E'
}

/** Quelle für Badge „Marke“ in Ausgeblendet-Listen (manuell). */
export function manualRowPrimarySource(
  source: 'master' | 'custom' | 'unknown',
  backshopSources: BackshopSource[] | undefined,
): BackshopSource {
  if (source === 'custom' || source === 'unknown') return 'manual'
  const s = backshopSources?.[0]
  if (s === 'edeka' || s === 'harry' || s === 'aryzta') return s
  return 'edeka'
}
