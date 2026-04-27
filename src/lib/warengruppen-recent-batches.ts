import type { WarengruppeRecentBatch, WarengruppeRecentLine } from '@/types/warengruppen-workbench-recent'

export function randomRecentLineId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/** Neuen Batch voranstellen; alte Batches verwerfen bis maxBatches oder maxLines überschritten würde. */
export function prependRecentBatch(
  prev: WarengruppeRecentBatch[],
  lines: WarengruppeRecentLine[],
  opts?: { maxBatches?: number; maxLines?: number },
): WarengruppeRecentBatch[] {
  const maxBatches = opts?.maxBatches ?? 10
  const maxLines = opts?.maxLines ?? 48
  if (lines.length === 0) return prev

  const batch: WarengruppeRecentBatch = {
    id: randomRecentLineId(),
    at: Date.now(),
    lines,
  }

  let next: WarengruppeRecentBatch[] = [batch, ...prev]
  while (next.length > maxBatches) {
    next = next.slice(0, -1)
  }
  let lineCount = next.reduce((n, b) => n + b.lines.length, 0)
  while (lineCount > maxLines && next.length > 1) {
    next = next.slice(0, -1)
    lineCount = next.reduce((n, b) => n + b.lines.length, 0)
  }
  return next
}

/** Zeilen-Summary für Batch-Titel (einheitliches Ziel vs. gemischt). */
/** Entfernt eine Zeile aus allen Batches; leere Batches fallen weg. */
export function removeLineFromBatchesByLineId(
  batches: WarengruppeRecentBatch[],
  lineId: string,
): WarengruppeRecentBatch[] {
  return batches
    .map((b) => ({ ...b, lines: b.lines.filter((l) => l.id !== lineId) }))
    .filter((b) => b.lines.length > 0)
}

export function removeBatchById(
  batches: WarengruppeRecentBatch[],
  batchId: string,
): WarengruppeRecentBatch[] {
  return batches.filter((b) => b.id !== batchId)
}

export function summarizeBatchLines(lines: WarengruppeRecentLine[]): {
  kind: 'uniform'
  count: number
  toLabel: string
} | {
  kind: 'mixed'
  count: number
} {
  if (lines.length === 0) return { kind: 'mixed', count: 0 }
  const firstTo = lines[0].toLabel
  const uniform = lines.every((l) => l.toLabel === firstTo)
  if (uniform) return { kind: 'uniform', count: lines.length, toLabel: firstTo }
  return { kind: 'mixed', count: lines.length }
}
