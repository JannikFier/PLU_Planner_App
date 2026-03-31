/**
 * Sortiert PLUs nach der Reihenfolge der Anzeigeliste.
 * Unbekannte PLUs (nicht in displayOrderPlu) landen am Ende.
 */
export function orderPluByDisplayOrder(
  pluList: readonly string[],
  displayOrderPlu: readonly string[],
): string[] {
  const rank = new Map(displayOrderPlu.map((p, i) => [p, i]))
  const unique = [...new Set(pluList)]
  return unique.sort((a, b) => {
    const ra = rank.has(a) ? rank.get(a)! : 999_999
    const rb = rank.has(b) ? rank.get(b)! : 999_999
    if (ra !== rb) return ra - rb
    return a.localeCompare(b, 'de')
  })
}

/** Sortiert Objekte nach PLU-Reihenfolge der Anzeigeliste */
export function orderByPluDisplayOrder<T>(
  rows: readonly T[],
  getPlu: (row: T) => string,
  displayOrderPlu: readonly string[],
): T[] {
  const order = orderPluByDisplayOrder(
    rows.map(getPlu),
    displayOrderPlu,
  )
  const rank = new Map(order.map((p, i) => [p, i]))
  return [...rows].sort((a, b) => {
    const pa = getPlu(a)
    const pb = getPlu(b)
    const ra = rank.has(pa) ? rank.get(pa)! : 999_999
    const rb = rank.has(pb) ? rank.get(pb)! : 999_999
    if (ra !== rb) return ra - rb
    return pa.localeCompare(pb, 'de')
  })
}
