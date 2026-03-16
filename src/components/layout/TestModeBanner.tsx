import { useTestMode } from '@/contexts/TestModeContext'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { FlaskConical, X } from 'lucide-react'

/**
 * Gelbe Hinweisleiste und Rahmen im Testmodus.
 * Wird nur angezeigt wenn isTestMode === true.
 */
export function TestModeBanner() {
  const { isTestMode, showExitConfirm, setShowExitConfirm, disableTestMode } = useTestMode()

  if (!isTestMode) return null

  return (
    <>
      {/* Gelbe Hinweisleiste */}
      <div className="sticky top-0 z-[60] flex items-center justify-between gap-4 bg-yellow-400 px-4 py-2 text-yellow-900">
        <div className="flex items-center gap-2 text-sm font-medium">
          <FlaskConical className="h-4 w-4" />
          <span>Testmodus aktiv – Änderungen werden <strong>nicht</strong> gespeichert</span>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1 border-yellow-600 bg-yellow-300 hover:bg-yellow-200 text-yellow-900"
          onClick={() => setShowExitConfirm(true)}
        >
          <X className="h-3 w-3" />
          Beenden
        </Button>
      </div>

      {/* Bestaetigungsdialog beim Beenden */}
      <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Testmodus beenden?</AlertDialogTitle>
            <AlertDialogDescription>
              Alle Änderungen, die du im Testmodus gemacht hast, gehen verloren.
              Die echten Daten werden wiederhergestellt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Weiter testen</AlertDialogCancel>
            <Button onClick={disableTestMode}>
              Testmodus beenden
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
