// Dialog: Entscheidung zentrale Werbung (Obst/Backshop, gleiche Texte)

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

/** Ausgangszustand für die angebotenen Aktionen */
export type CentralOfferMegaphonePhase =
  /** Zentrale Werbung ist für den Markt aktiv */
  | 'promo_on'
  /** Werbung aus, Produkt noch in der Hauptliste (nicht in Ausgeblendete) */
  | 'promo_off_visible'
  /** Werbung aus und in Ausgeblendete */
  | 'promo_off_hidden'

export type CentralOfferMegaphoneAction =
  | 'promo_off_keep_in_list'
  | 'promo_off_hide_from_list'
  | 'promo_on_restore_central'
  | 'promo_off_add_hide'
  | 'unhide_keep_promo_off'

export interface CentralOfferMegaphoneDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Kurz-Anzeige z. B. Artikelname + PLU */
  productLabel: string
  phase: CentralOfferMegaphonePhase
  isBusy: boolean
  onAction: (action: CentralOfferMegaphoneAction) => void | Promise<void>
}

/**
 * Kurze Entscheidung: nur Werbung aus vs. aus Liste, bzw. Rücknahme je Phase.
 */
export function CentralOfferMegaphoneDialog({
  open,
  onOpenChange,
  productLabel,
  phase,
  isBusy,
  onAction,
}: CentralOfferMegaphoneDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        className="max-w-md"
        data-testid="central-offer-megaphone-dialog"
      >
        <AlertDialogHeader>
          <AlertDialogTitle>Zentrale Werbung</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">{productLabel}</span>
              </p>
              {phase === 'promo_on' && (
                <p>
                  Diese Aktion kommt von der Zentrale. Du kannst sie für deinen Markt abschalten oder die Zeile
                  komplett aus deiner Liste entfernen.
                </p>
              )}
              {phase === 'promo_off_visible' && (
                <p>Die Werbung ist bei dir aus. Du kannst sie wieder einschalten oder die Zeile aus der Liste nehmen.</p>
              )}
              {phase === 'promo_off_hidden' && (
                <p>
                  Die Zeile ist ausgeblendet und die Werbung ist aus. Du kannst die zentrale Werbung wieder anzeigen
                  oder nur die Zeile wieder einblenden (dann ohne gelbe Markierung).
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
          {phase === 'promo_on' && (
            <>
              <Button
                type="button"
                disabled={isBusy}
                className="w-full sm:w-full"
                onClick={() => void onAction('promo_off_keep_in_list')}
              >
                Nur normale Zeile (ohne Werbung)
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={isBusy}
                className="w-full sm:w-full"
                onClick={() => void onAction('promo_off_hide_from_list')}
              >
                Aus Liste und PDF entfernen
              </Button>
            </>
          )}
          {phase === 'promo_off_visible' && (
            <>
              <Button
                type="button"
                disabled={isBusy}
                className="w-full sm:w-full"
                onClick={() => void onAction('promo_on_restore_central')}
              >
                Werbung wieder anzeigen
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={isBusy}
                className="w-full sm:w-full"
                onClick={() => void onAction('promo_off_add_hide')}
              >
                Aus Liste und PDF entfernen
              </Button>
            </>
          )}
          {phase === 'promo_off_hidden' && (
            <>
              <Button
                type="button"
                disabled={isBusy}
                className="w-full sm:w-full"
                onClick={() => void onAction('promo_on_restore_central')}
              >
                Werbung wieder anzeigen
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={isBusy}
                className="w-full sm:w-full"
                onClick={() => void onAction('unhide_keep_promo_off')}
              >
                Zeile einblenden (ohne Werbung)
              </Button>
            </>
          )}
          <AlertDialogCancel disabled={isBusy} className="w-full sm:w-full mt-0">
            Abbrechen
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
