import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { FierMascot } from '@/components/tutorial/FierMascot'
import type { TutorialModuleKey } from '@/lib/tutorial-types'

export function TutorialWelcomeModal(props: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onStart: () => void
  onSkip: () => void
  onNeverAgain: () => void
}) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <div className="flex items-start gap-4">
            <FierMascot size={80} pose="welcome" />
            <div>
              <DialogTitle>Hi, ich bin Fier.</DialogTitle>
              <DialogDescription className="text-left pt-2">
                4 Minuten für eine kurze Runde durch deinen Markt?
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2 flex-col sm:flex-row sm:justify-between">
          <Button type="button" variant="ghost" onClick={props.onNeverAgain}>
            Nicht mehr anzeigen
          </Button>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="outline" onClick={props.onSkip}>
              Überspringen
            </Button>
            <Button type="button" onClick={props.onStart}>
              Tour starten
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const MODULE_LABELS: Record<string, string> = {
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
}

type TrackPickOption = Exclude<TutorialModuleKey, 'basics' | 'closing'>

export function TutorialTrackPickModal(props: {
  open: boolean
  onOpenChange: (v: boolean) => void
  options: TrackPickOption[]
  value: TrackPickOption | null
  onChange: (v: TrackPickOption) => void
  onConfirm: () => void
  onEnoughForToday: () => void
  /** Wenn true: Headline ändert sich zu „Weiter mit …?" */
  isMidTour?: boolean
}) {
  const selected = props.value ?? props.options[0] ?? null
  const title = props.isMidTour ? 'Weiter mit einem nächsten Bereich?' : 'Womit möchtest du starten?'
  const body = props.isMidTour
    ? 'Fier kann mit dir noch in einen weiteren Bereich gehen – oder ihr macht an einem anderen Tag weiter.'
    : 'Fier hat die Grundlagen gezeigt. Wähle jetzt deinen ersten Bereich.'
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="relative sm:max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-4 pr-8">
            <FierMascot size={72} pose="think" />
            <div>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription className="text-left pt-2">{body}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div
          className="grid max-h-[min(52vh,420px)] gap-2 overflow-y-auto overscroll-contain py-2 pr-1"
          role="listbox"
          aria-label="Bereich wählen"
        >
          {props.options.length === 0 ? (
            <p className="text-sm text-muted-foreground">Keine weiteren Bereiche verfügbar.</p>
          ) : (
            props.options.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => props.onChange(key)}
                className={cn(
                  'rounded-lg border p-3 text-left font-medium transition-colors shrink-0',
                  selected === key ? 'border-primary bg-primary/5' : 'hover:bg-muted/50',
                )}
              >
                {MODULE_LABELS[key] ?? key}
              </button>
            ))
          )}
        </div>
        <DialogFooter className="gap-2 sm:gap-2 flex-col sm:flex-row sm:justify-between">
          <Button type="button" variant="ghost" onClick={props.onEnoughForToday}>
            Für heute genug
          </Button>
          <Button type="button" onClick={props.onConfirm} disabled={props.options.length === 0}>
            Weiter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export type TutorialFollowupKind = 'completed' | 'aborted' | 'skipped'

const FOLLOWUP_TITLES: Record<TutorialFollowupKind, string> = {
  completed: 'Super, du bist durch!',
  aborted: 'Tour pausiert',
  skipped: 'Tour pausiert',
}

const FOLLOWUP_BODIES: Record<TutorialFollowupKind, string> = {
  completed:
    'Wenn etwas unklar blieb, klicke dich ruhig noch einmal durch – oder starte die Einführung später über das Profilmenü neu. Soll die Tour beim nächsten Besuch wieder automatisch starten?',
  aborted:
    'Kein Problem – du kannst die Einführung jederzeit über das Profilmenü oder das Rundgang-Icon oben rechts wieder aufnehmen.',
  skipped:
    'Kein Problem – du kannst die Einführung jederzeit über das Profilmenü oder das Rundgang-Icon oben rechts wieder aufnehmen.',
}

export function TutorialFollowupModal(props: {
  open: boolean
  onOpenChange: (v: boolean) => void
  kind?: TutorialFollowupKind
  onReplayFromStart: () => void
  onReplayContinue: () => void
  onNeverAuto: () => void
  onRestartNow: () => void
}) {
  const kind = props.kind ?? 'completed'
  const title = FOLLOWUP_TITLES[kind]
  const body = FOLLOWUP_BODIES[kind]
  const pose = kind === 'completed' ? 'cheer' : 'stand'
  const size = kind === 'completed' ? 96 : 72
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <FierMascot size={size} pose={pose} />
            <div>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription className="text-left pt-2">{body}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="flex flex-col gap-2 py-2">
          <Button type="button" variant="secondary" onClick={props.onReplayFromStart}>
            Beim nächsten Mal wieder – von vorne
          </Button>
          <Button type="button" variant="secondary" onClick={props.onReplayContinue}>
            Beim nächsten Mal wieder – dort weitermachen
          </Button>
          <Button type="button" variant="outline" onClick={props.onNeverAuto}>
            Nicht mehr automatisch anzeigen
          </Button>
          <Button type="button" onClick={() => void props.onRestartNow()}>
            Jetzt erneut starten
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function TutorialNoListModal(props: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onConfirm: () => void
}) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <FierMascot size={72} pose="confused" />
            <div>
              <DialogTitle>Keine Liste freigeschaltet</DialogTitle>
              <DialogDescription className="text-left pt-2">
                Für diesen Markt sind weder Obst/Gemüse noch Backshop sichtbar. Bitte wende dich an deinen Administrator,
                damit die Berechtigungen angepasst werden.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" onClick={props.onConfirm}>
            Verstanden
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function TutorialTestModeInterruptModal(props: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onEnableTestMode: () => void
  onEndTour: () => void
  onResumeLater: () => void
}) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <div className="flex items-start gap-4">
            <FierMascot size={80} pose="alert" />
            <div>
              <DialogTitle>Tour pausiert</DialogTitle>
              <DialogDescription className="text-left pt-2">
                Ohne Testmodus ist die Übungssicherheit weg. Schalte den Testmodus wieder ein, mach später weiter oder
                beende die Tour ganz.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2 flex-col sm:flex-row sm:justify-between">
          <Button type="button" variant="ghost" onClick={props.onEndTour}>
            Tour beenden
          </Button>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="outline" onClick={props.onResumeLater}>
              Später fortsetzen
            </Button>
            <Button
              type="button"
              onClick={() => {
                props.onEnableTestMode()
                props.onOpenChange(false)
              }}
            >
              Testmodus wieder an
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
