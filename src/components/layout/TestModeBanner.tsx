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
import { FlaskConical } from 'lucide-react'

/**
 * Dezenter gelber Glow-Rahmen um das gesamte Fenster im Testmodus.
 * Kleiner schwebender Badge unten rechts zum Beenden.
 */
export function TestModeBanner() {
  const { isTestMode, showExitConfirm, setShowExitConfirm, disableTestMode } = useTestMode()

  if (!isTestMode) return null

  return (
    <>
      {/* Gelber Glow-Rahmen um das gesamte Fenster (4 Seiten) */}
      <div className="pointer-events-none fixed inset-0 z-[100] border-[3px] border-yellow-400 rounded-sm" style={{ boxShadow: 'inset 0 0 20px rgba(250, 204, 21, 0.4), 0 0 20px rgba(250, 204, 21, 0.3)' }} />

      {/* Schwebender Badge unten rechts */}
      <div className="fixed bottom-4 right-4 z-[101]">
        <Button
          size="sm"
          className="gap-2 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 shadow-lg shadow-yellow-400/30"
          onClick={() => setShowExitConfirm(true)}
        >
          <FlaskConical className="h-4 w-4" />
          Testmodus beenden
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
