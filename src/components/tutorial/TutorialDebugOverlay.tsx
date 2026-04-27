import { useEffect, useState } from 'react'
import { clearTutorialDebugBuffer, subscribeTutorialDebug, type TutorialEvent } from '@/lib/tutorial-events'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Fixes Overlay in der rechten unteren Ecke, das die letzten 10 Tutorial-Events
 * zeigt. Wird nur aktiviert über `?debug-tutorial=1` oder Flag im Orchestrator.
 */
export function TutorialDebugOverlay() {
  const [events, setEvents] = useState<TutorialEvent[]>([])
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => subscribeTutorialDebug(setEvents), [])

  const visible = events.slice(-10).reverse()

  return (
    <div
      role="region"
      aria-label="Tutorial-Debug-Overlay"
      className={cn(
        'fixed bottom-3 right-3 z-[9999] rounded-md border bg-background/95 shadow-lg backdrop-blur',
        'max-w-sm text-xs font-mono',
      )}
    >
      <div className="flex items-center justify-between border-b px-3 py-1.5">
        <span className="font-semibold">Tutorial Debug</span>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[10px]"
            onClick={() => clearTutorialDebugBuffer()}
          >
            Clear
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[10px]"
            onClick={() => setCollapsed((v) => !v)}
          >
            {collapsed ? 'Expand' : 'Collapse'}
          </Button>
        </div>
      </div>
      {!collapsed && (
        <ul className="max-h-64 overflow-auto px-3 py-2 space-y-1" role="list">
          {visible.length === 0 ? (
            <li className="text-muted-foreground">Noch keine Events …</li>
          ) : (
            visible.map((ev, i) => (
              <li key={i} className="whitespace-pre-wrap break-words">
                <span className="font-semibold">{ev.event}</span>
                {ev.module ? ` · ${ev.module}` : ''}
                {typeof ev.stepIndex === 'number' ? ` #${ev.stepIndex}` : ''}
                {ev.meta && Object.keys(ev.meta).length > 0
                  ? ` · ${JSON.stringify(ev.meta).slice(0, 160)}`
                  : ''}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
