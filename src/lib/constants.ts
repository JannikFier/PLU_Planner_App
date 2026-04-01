// Zentrale Konstanten (DRY)

/** Batch-Größe für DB-Inserts (Version/Backshop-Version publish). */
export const PUBLISH_BATCH_SIZE = 500

// ============================================================
// PLU-Tabellen: gemeinsame Header-Klassen (Design-System)
// ============================================================

/** Basis-Klasse für PLU-Tabellen-Header (grau, z. B. „PLU-Liste“). */
export const PLU_TABLE_HEADER_CLASS =
  'rounded-t-lg bg-gray-500/10 border border-b-0 border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 uppercase tracking-wider text-center sm:px-4 sm:py-2 sm:text-sm'

/** Header-Klasse Stück (blau). */
export const PLU_TABLE_HEADER_STUECK_CLASS =
  'rounded-t-lg bg-blue-500/10 border border-b-0 border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 uppercase tracking-wider text-center'

/** Header-Klasse Gewicht (amber). */
export const PLU_TABLE_HEADER_GEWICHT_CLASS =
  'rounded-t-lg bg-amber-500/10 border border-b-0 border-amber-200 px-4 py-2 text-sm font-semibold text-amber-700 uppercase tracking-wider text-center'
