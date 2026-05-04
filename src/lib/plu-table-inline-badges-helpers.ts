import type { DisplayItem } from '@/types/plu'
import { getDisplayPreisForItem } from '@/lib/plu-helpers'

/** Ob die Zeile einen sichtbaren Preis hat (für Tabellen-Spalten-Layout). */
export function itemHasDisplayPreis(item: DisplayItem | undefined): boolean {
  if (!item) return false
  return getDisplayPreisForItem(item) != null
}
