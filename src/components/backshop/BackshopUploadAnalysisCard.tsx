// Analyse-Karte: Reconciliation importierter PLUs vs. übersprungene Spalten (Backshop-Upload Schritt 1 / Review)

import { Button } from '@/components/ui/button'
import { buildBackshopParseAnalysis, downloadBackshopParseResultCsv } from '@/lib/backshop-upload-analysis'
import type { BackshopParseResult, ParsedBackshopRow } from '@/types/plu'
import { BarChart3, Download } from 'lucide-react'

type Props = {
  result: BackshopParseResult
  /** Zeilen für CSV-Export (mit imageUrl o. Ä. – nur Stammdaten nötig). */
  rowsForCsv: ParsedBackshopRow[]
  compact?: boolean
}

export function BackshopUploadAnalysisCard({ result, rowsForCsv, compact = false }: Props) {
  const a = buildBackshopParseAnalysis(result)

  return (
    <div
      className={`rounded-lg border border-primary/20 bg-primary/5 ${compact ? 'p-2.5 text-xs' : 'p-3 text-sm'} space-y-2`}
      data-tour="backshop-upload-analyze-card"
    >
      <div className="flex items-center gap-2 font-medium text-foreground">
        <BarChart3 className={`${compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} text-primary shrink-0`} aria-hidden />
        Produkt-Analyse
      </div>
      <ul className="space-y-1 text-muted-foreground list-none pl-0">
        <li>
          <span className="font-medium text-foreground">Importiert (eindeutige PLU):</span> {a.uniqueImported}
        </li>
        <li>
          <span className="font-medium text-foreground">Zweite Spalten mit gleicher PLU:</span> {a.duplicateSecondColumns}{' '}
          (werden nicht doppelt importiert – nur die erste Spalte pro PLU zählt)
        </li>
        <li>
          <span className="font-medium text-foreground">Check vor Duplikaten:</span> {a.grossColumnsBeforeDedupe} ={' '}
          {a.uniqueImported} + {a.duplicateSecondColumns}
          <span className="block mt-0.5 text-xs">
            Entspricht der Anzahl Spalten mit gültiger PLU und Name in der Excel, bevor doppelte PLUs entfernt werden.
          </span>
        </li>
        {(a.invalidPlu > 0 || a.emptyName > 0) && (
          <li>
            <span className="font-medium text-foreground">Übersprungen:</span> {a.invalidPlu}× ungültige PLU
            {a.emptyName > 0 ? `, ${a.emptyName}× leerer Name/Platzhalter` : ''}
            {a.emptyName > 0 && (
              <span className="block mt-0.5 text-xs">
                Fehlende Namen in einzelnen Spalten können von Zusammenführungen im Excel kommen – Datei speichern und
                erneut hochladen; oder Zusammenführung aufheben und Namen je Spalte eintragen.
              </span>
            )}
          </li>
        )}
        {a.sameNameDifferentPluCount > 0 && (
          <li className="text-amber-800">
            <span className="font-medium">Hinweis:</span> {a.sameNameDifferentPluCount}× gleicher Name, verschiedene PLU
            (siehe Liste unten)
          </li>
        )}
        {!a.skippedSumMatches && (
          <li className="text-destructive text-xs">
            Interne Summenprüfung: {a.skippedSumParts} ≠ {a.skippedRowsTotal} übersprungen – bitte melden.
          </li>
        )}
      </ul>
      {rowsForCsv.length > 0 && (
        <Button
          type="button"
          variant="outline"
          size={compact ? 'sm' : 'default'}
          className="w-full sm:w-auto"
          onClick={() => downloadBackshopParseResultCsv(rowsForCsv, result.fileName)}
        >
          <Download className="h-4 w-4 mr-2" />
          PLU-Liste als CSV
        </Button>
      )}
    </div>
  )
}
