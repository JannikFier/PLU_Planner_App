/** Gleiche Normalisierung wie DB (lower(trim)) für Bezeichnungs-Duplikate. */
export function normalizeSupplementNameKey(name: string): string {
  return name.trim().toLowerCase()
}
