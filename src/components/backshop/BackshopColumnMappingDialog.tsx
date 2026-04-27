// Dialog zur manuellen Auswahl von PLU-, Name- und Bildspalte für Backshop-Uploads.
// Unterstützt zwei Layout-Modi:
//   - classic: 1 Zeile = 1 Produkt (mit Header-Zeile oder „keine Kopfzeile“)
//   - block:   pro Spalte ein Produkt (Kassenblatt: Namens-Zeile, PLU-Zeile, optional Bild-Zeile)

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { extractImagesFromBackshopExcel } from '@/lib/backshop-excel-images'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioCard } from '@/components/ui/radio-card'
import type { BackshopParseResult } from '@/types/plu'
import type { BackshopExcelPreview, BackshopManualLayoutMode, BackshopManualMapping } from '@/lib/backshop-excel-parser'

interface BackshopColumnMappingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  preview: BackshopExcelPreview | null
  /** Letztes Ergebnis des Auto-Parsers – zeigt, welches Layout erkannt wurde. */
  parseResult?: BackshopParseResult | null
  /** Original-.xlsx für eingebettete Bild-Miniaturen in der Vorschau (optional). */
  previewFile?: File | null
  /** Wird beim Bestätigen aufgerufen mit dem gewählten Mapping (classic oder block). */
  onConfirm: (mapping: BackshopManualMapping) => void
}

/** Spalten-Index 0-basiert -> Excel-Buchstabe A/B/.../AA. */
function colToLetter(index0: number): string {
  let n = index0 + 1
  let s = ''
  while (n > 0) {
    n--
    s = String.fromCharCode(65 + (n % 26)) + s
    n = Math.floor(n / 26)
  }
  return s
}

/**
 * Rendert eine Vorschau-Zelle. Leere Zellen bleiben leer (nicht als „Bild“).
 * Nur echtes „[object Object]“ oder nicht-stringifizierbare Objekte → Platzhalter (embedded Image o. ä.).
 */
function renderPreviewCell(raw: unknown): React.ReactNode {
  if (raw == null) return ''
  if (typeof raw === 'string') {
    if (raw === '[object Object]') {
      return <span className="italic text-muted-foreground">[Bild]</span>
    }
    if (raw === '') {
      return <span className="text-muted-foreground/25" aria-hidden="true">·</span>
    }
    return raw
  }
  if (typeof raw === 'number' || typeof raw === 'boolean') return String(raw)
  return <span className="italic text-muted-foreground">[Bild]</span>
}

/** Ob die Zelle zusätzlich zum Bild lesbaren Text enthält (für Anzeige unter der Miniatur). */
function hasCellText(raw: unknown): boolean {
  if (raw == null) return false
  if (typeof raw === 'string') return raw.trim() !== '' && raw !== '[object Object]'
  if (typeof raw === 'number' || typeof raw === 'boolean') return true
  return false
}

function mimeFromImageExtension(ext: string): string {
  const e = ext.toLowerCase().replace(/^\./, '')
  if (e === 'jpg' || e === 'jpeg') return 'image/jpeg'
  if (e === 'png') return 'image/png'
  if (e === 'gif') return 'image/gif'
  if (e === 'webp') return 'image/webp'
  return 'image/png'
}

/** Eine Vorschau-Zelle: optional Miniatur aus eingebettetem Bild + Text. */
function PreviewCell({
  raw,
  imageUrl,
}: {
  raw: unknown
  imageUrl?: string | null
}) {
  const text = renderPreviewCell(raw)
  if (imageUrl) {
    return (
      <div className="flex flex-col items-start gap-1.5">
        <img
          src={imageUrl}
          alt=""
          className="max-h-16 max-w-[120px] rounded border border-border bg-muted/30 object-contain"
        />
        {hasCellText(raw) ? <div className="min-w-0 break-words">{text}</div> : null}
      </div>
    )
  }
  return <>{text}</>
}

function AutoAnalysisSummary({
  parseResult,
  preview,
}: {
  parseResult: BackshopParseResult | null | undefined
  preview: BackshopExcelPreview
}) {
  if (!parseResult) {
    return (
      <Card className="border-dashed bg-muted/40">
        <CardContent className="py-3 text-sm text-muted-foreground">
          Es liegt kein gespeichertes Auto-Parse-Ergebnis vor – Vorschau-Spalten stammen nur aus der
          Heuristik der ersten Zeilen.
        </CardContent>
      </Card>
    )
  }

  const isBlock = parseResult.detectedLayout === 'kassenblatt_blocks'
  const layoutLabel = isBlock
    ? 'Kassenblatt (Block): ein Produkt pro Spalte'
    : 'Klassisch: eine Zeile = ein Produkt'

  return (
    <Card>
      <CardContent className="py-3 space-y-2 text-sm">
        <p className="font-medium text-foreground">Automatische Analyse</p>
        <p>
          <span className="text-muted-foreground">Erkanntes Layout:</span>{' '}
          {layoutLabel}
        </p>
        <p>
          <span className="text-muted-foreground">Ergebnis:</span>{' '}
          {parseResult.totalRows} Produkt{parseResult.totalRows === 1 ? '' : 'e'}
          {parseResult.skippedRows > 0
            ? ` · ${parseResult.skippedRows} Zeile(n) übersprungen`
            : ''}
        </p>
        {!isBlock && (
          <p className="text-xs text-muted-foreground">
            Erkannte Spalten: PLU Spalte {colToLetter(parseResult.pluColumnIndex)}, Name Spalte{' '}
            {colToLetter(parseResult.nameColumnIndex)}
            {parseResult.hasImageColumn ? ', mit Bildspalte' : ', ohne Bildspalte'}
            {preview.headerRowIndex >= 0
              ? ` · vermutete Kopfzeile: Zeile ${preview.headerRowIndex + 1}`
              : ' · keine Kopfzeile wie „PLU“/„Warentext“ erkannt'}
          </p>
        )}
        {isBlock && (
          <p className="text-xs text-muted-foreground">
            Im Block-Layout stehen Name, PLU und Bild in Zeilen untereinander; die Spalten A, B, C …
            sind jeweils eigene Produkte. Zwischen PLU-Zeile und Bild liegt oft eine Zeile mit{' '}
            <code className="rounded bg-muted px-1">*PLU*</code> (Strichcode).
          </p>
        )}
      </CardContent>
    </Card>
  )
}

/** Lädt eingebettete Thumbnails; bei file=null: leere Map, kein Loading. */
function WithXlsxThumbnailsFromFile({
  file,
  render,
}: {
  file: File | null
  render: (cellImageUrls: ReadonlyMap<string, string>, imagesLoading: boolean) => ReactNode
}) {
  if (!file) {
    return <>{render(new Map(), false)}</>
  }
  return <XlsxThumbnailsSession key={`${file.name}-${file.size}-${file.lastModified}`} file={file} render={render} />
}

function XlsxThumbnailsSession({
  file,
  render,
}: {
  file: File
  render: (cellImageUrls: ReadonlyMap<string, string>, imagesLoading: boolean) => ReactNode
}) {
  const [cellImageUrls, setCellImageUrls] = useState(() => new Map<string, string>())
  const [imagesLoading, setImagesLoading] = useState(true)
  const imageBlobUrlsRef = useRef<string[]>([])

  useEffect(() => {
    let cancelled = false
    void extractImagesFromBackshopExcel(file)
      .then((extracted) => {
        if (cancelled) return
        const map = new Map<string, string>()
        const urls: string[] = []
        for (const img of extracted) {
          const key = `${img.row},${img.col}`
          if (map.has(key)) continue
          const mime = mimeFromImageExtension(img.extension)
          const blob = new Blob([img.buffer], { type: mime })
          const url = URL.createObjectURL(blob)
          urls.push(url)
          map.set(key, url)
        }
        if (cancelled) {
          urls.forEach((u) => URL.revokeObjectURL(u))
          return
        }
        imageBlobUrlsRef.current = urls
        setCellImageUrls(map)
      })
      .catch((err) => {
        if (import.meta.env.DEV) console.warn('[Layout-Dialog] Bild-Vorschau fehlgeschlagen:', err)
        if (!cancelled) setCellImageUrls(new Map())
      })
      .finally(() => {
        if (!cancelled) setImagesLoading(false)
      })
    return () => {
      cancelled = true
      imageBlobUrlsRef.current.forEach((u) => URL.revokeObjectURL(u))
      imageBlobUrlsRef.current = []
    }
  }, [file])
  return <>{render(cellImageUrls, imagesLoading)}</>
}

export function BackshopColumnMappingDialog({
  open,
  onOpenChange,
  preview,
  parseResult,
  previewFile = null,
  onConfirm,
}: BackshopColumnMappingDialogProps) {
  const [layoutMode, setLayoutMode] = useState<BackshopManualLayoutMode>('classic')

  // Classic-Modus
  const [pluCol, setPluCol] = useState<number>(0)
  const [nameCol, setNameCol] = useState<number>(1)
  const [imageCol, setImageCol] = useState<number>(-1)
  const [headerRow, setHeaderRow] = useState<number>(0)

  // Block-Modus
  const [nameRow, setNameRow] = useState<number>(0)
  const [pluRow, setPluRow] = useState<number>(1)
  const [imageRow, setImageRow] = useState<number>(-1)
  const [blockSize, setBlockSize] = useState<number>(5)

  const xlsxFileForImages =
    open && previewFile && previewFile.name.toLowerCase().endsWith('.xlsx') ? previewFile : null

  /* Vorschau/Heuristik → manuelle Spaltenfelder (External Sync) */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!preview) return

    const fromAuto = parseResult?.detectedLayout
    if (fromAuto === 'kassenblatt_blocks') {
      setLayoutMode('block')
    } else if (fromAuto === 'classic_rows') {
      setLayoutMode('classic')
    } else {
      const autoBlock = preview.headerRowIndex < 0 && preview.autoPluCol < 0
      setLayoutMode(autoBlock ? 'block' : 'classic')
    }

    setPluCol(preview.autoPluCol >= 0 ? preview.autoPluCol : 0)
    setNameCol(preview.autoNameCol >= 0 ? preview.autoNameCol : 1)
    setImageCol(preview.autoImageCol)
    setHeaderRow(preview.headerRowIndex >= 0 ? preview.headerRowIndex : 0)

    setNameRow(0)
    setPluRow(1)
    setImageRow(preview.rows.length > 3 ? 3 : -1)
    setBlockSize(5)
  }, [preview, parseResult])
  /* eslint-enable react-hooks/set-state-in-effect */

  const colOptions = useMemo(() => {
    if (!preview) return []
    return Array.from({ length: preview.colCount }, (_, i) => ({
      index: i,
      letter: colToLetter(i),
    }))
  }, [preview])

  const rowOptions = useMemo(() => {
    if (!preview) return []
    return preview.rows.map((_, i) => ({ value: i, label: `Zeile ${i + 1}` }))
  }, [preview])

  const handleConfirm = () => {
    if (layoutMode === 'block') {
      onConfirm({
        layoutMode: 'block',
        pluCol: 0,
        nameCol: 0,
        imageCol: -1,
        nameRowIndex: nameRow,
        pluRowIndex: pluRow,
        imageRowIndex: imageRow,
        blockSize,
      })
    } else {
      onConfirm({
        layoutMode: 'classic',
        pluCol,
        nameCol,
        imageCol,
        headerRowIndex: headerRow,
      })
    }
    onOpenChange(false)
  }

  if (!preview) return null

  const highlightClass = (col: number, row: number): string => {
    if (layoutMode === 'classic') {
      if (col === pluCol) return 'bg-blue-100 text-blue-900'
      if (col === nameCol) return 'bg-green-100 text-green-900'
      if (col === imageCol) return 'bg-violet-100 text-violet-900'
      return ''
    }
    if (row === pluRow) return 'bg-blue-100 text-blue-900'
    if (row === nameRow) return 'bg-green-100 text-green-900'
    if (imageRow >= 0 && row === imageRow) return 'bg-violet-100 text-violet-900'
    return ''
  }

  const canConfirm = layoutMode === 'classic' ? pluCol !== nameCol : nameRow !== pluRow

  const blockBandBorder = (r: number): string => {
    if (layoutMode !== 'block') return ''
    if (r < nameRow + blockSize) return ''
    if ((r - nameRow) % blockSize === 0) return 'border-t-2 border-dashed border-primary/35'
    return ''
  }

  return (
    <WithXlsxThumbnailsFromFile
      file={xlsxFileForImages}
      render={(cellImageUrls, imagesLoading) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="flex h-[min(92dvh,920px)] max-h-[92dvh] w-[min(96rem,calc(100vw-1.5rem))] max-w-none flex-col gap-4 overflow-hidden p-6 sm:max-w-none"
        data-tour="backshop-upload-mapping-dialog"
      >
        <DialogHeader className="shrink-0 space-y-1">
          <DialogTitle className="break-words pr-8">
            Excel-Layout anpassen: <span className="font-normal">{preview.fileName}</span>
          </DialogTitle>
          <DialogDescription>
            Prüfe die automatische Analyse, wähle den passenden Modus und die Zuordnung. Vorschau:
            erste {preview.rows.length} Zeilen – horizontal und vertikal scrollbar.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 shrink-0 space-y-3">
          <AutoAnalysisSummary parseResult={parseResult} preview={preview} />

          <div className="grid gap-2 sm:grid-cols-2">
            <RadioCard
              selected={layoutMode === 'classic'}
              onClick={() => setLayoutMode('classic')}
              title="Klassisch"
              description="1 Zeile = 1 Produkt. Spalten für PLU, Name und Bild wählen."
            />
            <RadioCard
              selected={layoutMode === 'block'}
              onClick={() => setLayoutMode('block')}
              title="Kassenblatt (Block)"
              description="Pro Spalte ein Produkt. Namens-Zeile, PLU-Zeile und optional Bild-Zeile."
            />
          </div>
        </div>

        {layoutMode === 'classic' ? (
          <div className="grid shrink-0 gap-3 sm:grid-cols-4">
            <div className="space-y-1">
              <Label className="text-xs">Header-Zeile</Label>
              <Select value={String(headerRow)} onValueChange={(v) => setHeaderRow(Number(v))}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="-1">– keine Kopfzeile</SelectItem>
                  {rowOptions.map((r) => (
                    <SelectItem key={r.value} value={String(r.value)}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">PLU-Spalte</Label>
              <Select value={String(pluCol)} onValueChange={(v) => setPluCol(Number(v))}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {colOptions.map((o) => (
                    <SelectItem key={o.index} value={String(o.index)}>
                      Spalte {o.letter}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Name-Spalte</Label>
              <Select value={String(nameCol)} onValueChange={(v) => setNameCol(Number(v))}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {colOptions.map((o) => (
                    <SelectItem key={o.index} value={String(o.index)}>
                      Spalte {o.letter}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Bild-Spalte (optional)</Label>
              <Select value={String(imageCol)} onValueChange={(v) => setImageCol(Number(v))}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="-1">– keine Bildspalte</SelectItem>
                  {colOptions.map((o) => (
                    <SelectItem key={o.index} value={String(o.index)}>
                      Spalte {o.letter}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : (
          <div className="shrink-0 space-y-2">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Typisch: Zeile 1 = Name, Zeile 2 = PLU, Zeile 3 = Strichcode{' '}
              <span className="whitespace-nowrap">(*81593*)</span>, darunter eine oder mehrere Zeilen mit Bild.
              Die Blockhöhe legt fest, alle wie viele Zeilen sich das Muster nach unten wiederholt (z. B.
              Zeile 6 = wieder Name).
            </p>
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="space-y-1">
                <Label className="text-xs">Namens-Zeile</Label>
                <Select value={String(nameRow)} onValueChange={(v) => setNameRow(Number(v))}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {rowOptions.map((r) => (
                      <SelectItem key={r.value} value={String(r.value)}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">PLU-Zeile</Label>
                <Select value={String(pluRow)} onValueChange={(v) => setPluRow(Number(v))}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {rowOptions.map((r) => (
                      <SelectItem key={r.value} value={String(r.value)}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Bild-Zeile (optional)</Label>
                <Select value={String(imageRow)} onValueChange={(v) => setImageRow(Number(v))}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="-1">– keine Bildzeile</SelectItem>
                    {rowOptions.map((r) => (
                      <SelectItem key={r.value} value={String(r.value)}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Blockhöhe (Zeilen pro Produkt-Block)</Label>
                <Select value={String(blockSize)} onValueChange={(v) => setBlockSize(Number(v))}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[3, 4, 5, 6, 7, 8].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n} Zeilen
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        <div className="flex shrink-0 flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded border border-blue-200 bg-blue-100" /> PLU
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded border border-green-200 bg-green-100" /> Name
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded border border-violet-200 bg-violet-100" /> Bild
          </span>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden rounded-md border">
          {imagesLoading && (
            <div className="flex items-center gap-2 border-b bg-muted/30 px-2 py-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
              Bilder werden geladen…
            </div>
          )}
          <div className="h-full max-h-[min(52vh,480px)] min-h-[200px] overflow-auto">
            <table className="w-max min-w-full border-collapse text-xs">
              <thead className="sticky top-0 z-10 border-b bg-background">
                <tr>
                  <th className="w-12 px-2 py-1 text-left">#</th>
                  {colOptions.map((o) => (
                    <th
                      key={o.index}
                      className={`px-2 py-1 text-left font-mono ${layoutMode === 'classic' ? highlightClass(o.index, -1) : ''}`}
                    >
                      {o.letter}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row, r) => (
                  <tr
                    key={r}
                    className={`border-b ${blockBandBorder(r)} ${
                      layoutMode === 'classic'
                        ? r === headerRow
                          ? 'bg-muted/60 font-semibold'
                          : 'even:bg-muted/20'
                        : 'even:bg-muted/20'
                    }`}
                  >
                    <td className="px-2 py-1 text-muted-foreground">{r + 1}</td>
                    {colOptions.map((o) => (
                      <td
                        key={o.index}
                        className={`max-w-[220px] px-2 py-1 align-top break-words ${highlightClass(o.index, r)}`}
                        style={{ minWidth: 90 }}
                      >
                        <PreviewCell
                          raw={row[o.index]}
                          imageUrl={cellImageUrls.get(`${r},${o.index}`)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <DialogFooter className="shrink-0 gap-2 sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button onClick={handleConfirm} disabled={!canConfirm} data-tour="backshop-upload-mapping-submit">
            Layout übernehmen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
      )}
    />
  )
}
