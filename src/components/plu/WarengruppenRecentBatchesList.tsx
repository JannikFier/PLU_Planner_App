import type { ReactNode } from 'react'
import { ChevronDown, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { summarizeBatchLines } from '@/lib/warengruppen-recent-batches'
import type { WarengruppeRecentBatch, WarengruppeRecentLine } from '@/types/warengruppen-workbench-recent'
import { getDisplayPlu } from '@/lib/plu-helpers'

type Props = {
  batches: WarengruppeRecentBatch[]
  emptyLabel: string
  disabled?: boolean
  onRevertLine: (line: WarengruppeRecentLine) => void | Promise<void>
  onRevertBatch: (batchId: string) => void | Promise<void>
  /** Optional z. B. „Override entfernen“ nur wo sinnvoll */
  lineExtra?: (line: WarengruppeRecentLine) => ReactNode
}

export function WarengruppenRecentBatchesList({
  batches,
  emptyLabel,
  disabled = false,
  onRevertLine,
  onRevertBatch,
  lineExtra,
}: Props) {
  if (batches.length === 0) {
    return <p className="text-xs text-muted-foreground">{emptyLabel}</p>
  }

  return (
    <div className="space-y-2">
      {batches.map((batch) => {
        const summary = summarizeBatchLines(batch.lines)
        const title =
          summary.kind === 'uniform' && summary.count > 0
            ? `${summary.count} Artikel nach „${summary.toLabel}“ verschoben`
            : `${summary.count} Artikel geändert`

        return (
          <details key={batch.id} className="group rounded-lg border border-border bg-muted/20">
            <summary
              className={cn(
                'flex cursor-pointer list-none items-start gap-2 px-3 py-2.5 text-sm outline-none [&::-webkit-details-marker]:hidden',
                'marker:content-none',
              )}
            >
              <ChevronDown
                className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                aria-hidden
              />
              <div className="min-w-0 flex-1 space-y-1">
                <p className="font-medium leading-snug">{title}</p>
                <p className="text-[10px] tabular-nums text-muted-foreground">
                  {new Date(batch.at).toLocaleTimeString('de-DE', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 shrink-0 text-xs"
                disabled={disabled}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  void onRevertBatch(batch.id)
                }}
              >
                <Undo2 className="mr-1 inline h-3 w-3" />
                Alles zurück
              </Button>
            </summary>
            <div className="space-y-2 border-t border-border px-3 py-2">
              {batch.lines.map((line) => (
                <div key={line.id} className="space-y-1 rounded-md border border-border/80 bg-background/60 p-2.5 text-sm">
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">{getDisplayPlu(line.plu)}</span>
                  <p className="font-medium leading-snug line-clamp-2">{line.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {line.fromLabel} → {line.toLabel}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-0.5">
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs"
                      disabled={disabled}
                      onClick={() => void onRevertLine(line)}
                    >
                      <Undo2 className="mr-1 inline h-3 w-3" />
                      Zurücknehmen
                    </Button>
                    {lineExtra ? lineExtra(line) : null}
                  </div>
                </div>
              ))}
            </div>
          </details>
        )
      })}
    </div>
  )
}
