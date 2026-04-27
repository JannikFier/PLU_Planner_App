import { CheckCircle2, Circle, GraduationCap, Loader2, RotateCcw } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { TutorialModuleKey, TutorialStatePayload } from '@/lib/tutorial-types'
import { moduleNeedsRefresh } from '@/lib/tutorial-types'

/** Anzeige-Labels für die Module – identisch zu TutorialModals. */
const MODULE_LABELS: Record<TutorialModuleKey, string> = {
  basics: 'Grundlagen',
  obst: 'Obst und Gemüse',
  'obst-deep': 'Obst: Vertiefung',
  'obst-konfig': 'Obst: Konfiguration',
  backshop: 'Backshop',
  'backshop-deep': 'Backshop: Vertiefung',
  'backshop-marken': 'Backshop: Marken',
  'backshop-konfig': 'Backshop: Konfiguration',
  werbung: 'Werbung',
  'backshop-upload': 'Backshop: Upload',
  'hidden-renamed-custom': 'Detail-Pfade',
  users: 'Benutzer',
  closing: 'Abschluss',
}

type ModuleStatus = 'complete' | 'pending' | 'refresh'

function statusOf(mod: TutorialModuleKey, payload: TutorialStatePayload | null): ModuleStatus {
  if (!payload) return 'pending'
  const p = payload.modules[mod]
  if (!p) return 'pending'
  if (!p.completed) return 'pending'
  return moduleNeedsRefresh(mod, payload.modules) ? 'refresh' : 'complete'
}

function completionPercent(modules: TutorialModuleKey[], payload: TutorialStatePayload | null): number {
  if (modules.length === 0) return 0
  const done = modules.reduce((acc, m) => acc + (statusOf(m, payload) === 'complete' ? 1 : 0), 0)
  return Math.round((done / modules.length) * 100)
}

/**
 * Checklist-Popover für das Onboarding: zeigt Modul-Status, Fortschrittsbalken und
 * erlaubt gezieltes Wiederholen einzelner Module oder den kompletten Neustart.
 *
 * Wird direkt im AppHeader neben dem Tutorial-Mini-Menü angezeigt.
 */
export function TutorialChecklistPopover(props: {
  payload: TutorialStatePayload | null
  availableModules: TutorialModuleKey[]
  onReplayModule: (mod: TutorialModuleKey) => void | Promise<void>
  onRestartAll: () => void | Promise<void>
  disabled?: boolean
}) {
  const { payload, availableModules, onReplayModule, onRestartAll, disabled } = props
  const progress = completionPercent(availableModules, payload)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Onboarding-Checkliste öffnen"
          title="Onboarding-Checkliste"
          className="relative h-9 w-9"
          data-tour="header-tutorial-checklist"
          disabled={disabled}
        >
          <GraduationCap className="h-5 w-5" />
          {progress < 100 && availableModules.length > 0 && (
            <span
              aria-hidden
              className="absolute -bottom-0.5 -right-0.5 rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground"
            >
              {progress}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-3" onOpenAutoFocus={(e) => e.preventDefault()}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold">Onboarding</p>
            <p className="text-xs text-muted-foreground">Dein Fortschritt</p>
          </div>
          <span className="text-sm font-semibold tabular-nums" aria-live="polite">
            {progress} %
          </span>
        </div>
        <div
          role="progressbar"
          aria-label="Onboarding-Fortschritt"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          className="mb-3 h-2 w-full overflow-hidden rounded-full bg-muted"
        >
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
        <ul className="space-y-1" role="list">
          {availableModules.map((mod) => {
            const st = statusOf(mod, payload)
            const label = MODULE_LABELS[mod] ?? mod
            return (
              <li
                key={mod}
                className={cn(
                  'flex items-center justify-between gap-2 rounded-md px-2 py-1.5',
                  st === 'complete' ? 'bg-emerald-50/60' : 'bg-muted/40',
                )}
              >
                <div className="flex min-w-0 items-center gap-2">
                  {st === 'complete' ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                  ) : st === 'refresh' ? (
                    <Loader2 className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  )}
                  <span className={cn('truncate text-sm', st === 'complete' && 'text-emerald-900')}>{label}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => void onReplayModule(mod)}
                  aria-label={`Modul ${label} wiederholen`}
                >
                  <RotateCcw className="mr-1 h-3 w-3" aria-hidden />
                  Wiederholen
                </Button>
              </li>
            )
          })}
        </ul>
        <div className="mt-3 border-t pt-3">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={() => void onRestartAll()}
          >
            <RotateCcw className="mr-2 h-3.5 w-3.5" aria-hidden />
            Alles von vorn starten
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
