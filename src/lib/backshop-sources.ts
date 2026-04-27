// Backshop-Quellen (Edeka, Harry, Aryzta): zentrale Konstanten + Helper.
// Wird überall verwendet, wo Badges, Filter oder Source-Logik greifen.

import type { BackshopSource } from '@/types/database'

/** Nur Excel-/Marken-Uploads (keine manuellen Nachbesserungen). */
export type BackshopExcelSource = 'edeka' | 'harry' | 'aryzta'

/** Reihenfolge ist die Anzeige-Reihenfolge in Filter/Dropdown. */
export const BACKSHOP_SOURCES: readonly BackshopExcelSource[] = ['edeka', 'harry', 'aryzta'] as const

export interface BackshopSourceMeta {
  id: BackshopSource
  /** Voller Markenname für Tooltip/Überschrift. */
  label: string
  /** 1-Buchstaben-Kürzel fürs Badge (E, H, A). */
  short: string
  /** Tailwind-Background-Klasse für Badge-Hintergrund. */
  bgClass: string
  /** Tailwind-Text-Klasse fürs Badge. */
  textClass: string
  /** Tailwind-Border-Klasse für Outline-Badges/Chips. */
  borderClass: string
}

export const BACKSHOP_SOURCE_META: Record<BackshopExcelSource, BackshopSourceMeta> = {
  edeka: {
    id: 'edeka',
    label: 'Edeka',
    short: 'E',
    bgClass: 'bg-blue-100',
    textClass: 'text-blue-800',
    borderClass: 'border-blue-200',
  },
  harry: {
    id: 'harry',
    label: 'Harry',
    short: 'H',
    bgClass: 'bg-orange-100',
    textClass: 'text-orange-800',
    borderClass: 'border-orange-200',
  },
  aryzta: {
    id: 'aryzta',
    label: 'Aryzta',
    short: 'A',
    bgClass: 'bg-violet-100',
    textClass: 'text-violet-800',
    borderClass: 'border-violet-200',
  },
}

/** Manuelle zentrale Nachbesserung (Meta separat, nicht in BACKSHOP_SOURCES). */
export const BACKSHOP_MANUAL_SOURCE_META: BackshopSourceMeta = {
  id: 'manual',
  label: 'Nachbesserung',
  short: 'N',
  bgClass: 'bg-emerald-100',
  textClass: 'text-emerald-900',
  borderClass: 'border-emerald-200',
}

/** Type-Guard: nur Excel-/Marken-Upload (Route-Parameter). */
export function isBackshopExcelSource(v: unknown): v is BackshopExcelSource {
  return typeof v === 'string' && (v === 'edeka' || v === 'harry' || v === 'aryzta')
}

/** Type-Guard: prüft ob ein beliebiger String eine gültige Backshop-Quelle ist (inkl. manuelle Nachbesserung). */
export function isBackshopSource(v: unknown): v is BackshopSource {
  return typeof v === 'string' && (v === 'edeka' || v === 'harry' || v === 'aryzta' || v === 'manual')
}

/** Voller Markenname mit Fallback (unbekannt -> 'Unbekannt'). */
export function backshopSourceLabel(source: BackshopSource | null | undefined): string {
  if (!source) return 'Unbekannt'
  if (source === 'manual') return BACKSHOP_MANUAL_SOURCE_META.label
  return BACKSHOP_SOURCE_META[source as BackshopExcelSource]?.label ?? source
}

/** Kurzkürzel (E/H/A) mit Fallback. */
export function backshopSourceShort(source: BackshopSource | null | undefined): string {
  if (!source) return '?'
  if (source === 'manual') return BACKSHOP_MANUAL_SOURCE_META.short
  return BACKSHOP_SOURCE_META[source as BackshopExcelSource]?.short ?? '?'
}

/**
 * Normalisiert einen Produktnamen für Gruppen-Matching.
 * Ziele: unabhängig von Kleinschreibung, Leerzeichen und trennenden Sonderzeichen.
 */
export function normalizeBackshopGroupName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[,;\-_/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
