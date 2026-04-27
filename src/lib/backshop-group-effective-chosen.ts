import type { BackshopSource } from '@/types/database'

/**
 * Effektive Markenwahl für die Listen-Engine: zuerst gültige DB-`chosen_sources`,
 * sonst Fallback auf die Warengruppen-Grundregel (`preferred_source` für `group.block_id`),
 * wenn diese Quelle in der Gruppe vorkommt.
 *
 * `undefined` = keine effektive Teilmenge → Engine behandelt wie bisher „alle Quellen“ (`show_all`).
 */
export function resolveEffectiveChosenSourcesForGroupFilter(
  memberSet: Set<BackshopSource>,
  dbChosen: BackshopSource[] | undefined,
  groupBlockId: string | null | undefined,
  blockPreferredSourceByBlockId: Map<string, BackshopSource> | undefined,
): BackshopSource[] | undefined {
  const valid = [...new Set((dbChosen ?? []).filter((s) => memberSet.has(s)))]
  if (valid.length > 0) return valid
  if (!blockPreferredSourceByBlockId || blockPreferredSourceByBlockId.size === 0 || !groupBlockId) {
    return undefined
  }
  const pref = blockPreferredSourceByBlockId.get(groupBlockId)
  if (!pref || !memberSet.has(pref)) return undefined
  return [pref]
}
