// Super-Admin: zentrale Werbung (Obst: Ordersatz Woche + 3-Tage; Backshop: Exit-Excel)

import { useMemo, useState, useRef, useId } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  CampaignReviewTable,
  CampaignPluCombobox,
  type CampaignReviewRow,
} from '@/components/plu/CampaignReviewTable'
import { useActiveVersion } from '@/hooks/useActiveVersion'
import { usePLUData } from '@/hooks/usePLUData'
import { useActiveBackshopVersion } from '@/hooks/useActiveBackshopVersion'
import { useBackshopPLUData } from '@/hooks/useBackshopPLUData'
import { parseExitWerbungExcel } from '@/lib/excel-parser'
import {
  parseObstWerbungPluExcel,
  mergeObstWerbungParseResults,
  type ObstWerbungPluExcelParseResult,
} from '@/lib/obst-werbung-plu-excel'
import { buildObstWerbungMatchRows, type ObstWerbungMatchRow } from '@/lib/obst-werbung-match-rows'
import { rankExitRowMatches } from '@/lib/exit-offer-matching'
import type { MasterPluCandidate } from '@/lib/exit-offer-matching'
import { useSaveObstOfferCampaign, useSaveBackshopOfferCampaign } from '@/hooks/useCentralOfferCampaigns'
import {
  getCampaignWeekSelectOptions,
  getDefaultCampaignTargetWeek,
} from '@/lib/date-kw-utils'
import { formatKWLabel } from '@/lib/plu-helpers'
import type { ParsedExitWerbungRow } from '@/types/plu'
import { toast } from 'sonner'
import { Upload, Loader2 } from 'lucide-react'

export type CentralCampaignListType = 'obst' | 'backshop'

/** Zentrale Obst-Werbung: nur Markierung (Namen-Gelb); kein Aktionspreis aus Excel */
const MARK_ONLY_PROMO_PRICE = 0

type ObstCampaignUploadState = {
  fileName: string
  skippedRows: number
  matchRows: ObstWerbungMatchRow[]
}

function buildObstCampaignUploadState(
  parsed: ObstWerbungPluExcelParseResult,
  masterPluSet: Set<string>,
  masterCandidates: MasterPluCandidate[],
): ObstCampaignUploadState {
  const matchRows = buildObstWerbungMatchRows(parsed.lines, masterPluSet, masterCandidates)
  return {
    fileName: parsed.fileName,
    skippedRows: parsed.skippedRows,
    matchRows,
  }
}

/**
 * Mappt Obst-MatchRows auf die wiederverwendbare CampaignReviewRow-Struktur.
 * Behalten: Excel-PLU und Artikel-Hinweis fuer Anzeige + spaeteres Speichern.
 */
function reviewRowsFromObstMatchRows(matchRows: ObstWerbungMatchRow[]): CampaignReviewRow[] {
  return matchRows.map((mr, idx) => ({
    id: `${mr.line.excelPlu}-${mr.line.rowIndex}-${idx}`,
    rowIndex: mr.line.rowIndex,
    sourcePlu: mr.line.excelPlu,
    sourceArtikel: mr.line.artikelHint || null,
    selectedPlu: mr.selectedPlu || null,
    origin: mr.selectedPlu ? 'excel' : 'unassigned',
  }))
}

/**
 * Baut die Save-Inputs aus MatchRows: Zeilen mit Master-PLU -> origin 'excel',
 * Zeilen ohne Zuordnung -> origin 'unassigned' (bleiben als Review-Archiv erhalten).
 */
function linesFromObstMatchRows(
  matchRows: ObstWerbungMatchRow[],
): Array<{
  plu: string | null
  promo_price: number
  source_plu: string | null
  source_artikel: string | null
  origin: 'excel' | 'unassigned'
}> {
  const seenPlu = new Set<string>()
  const out: Array<{
    plu: string | null
    promo_price: number
    source_plu: string | null
    source_artikel: string | null
    origin: 'excel' | 'unassigned'
  }> = []
  for (const r of matchRows) {
    const source_plu = r.line.excelPlu || null
    const source_artikel = r.line.artikelHint || null
    if (r.selectedPlu) {
      if (seenPlu.has(r.selectedPlu)) continue
      seenPlu.add(r.selectedPlu)
      out.push({
        plu: r.selectedPlu,
        promo_price: MARK_ONLY_PROMO_PRICE,
        source_plu,
        source_artikel,
        origin: 'excel',
      })
    } else {
      out.push({
        plu: null,
        promo_price: MARK_ONLY_PROMO_PRICE,
        source_plu,
        source_artikel,
        origin: 'unassigned',
      })
    }
  }
  return out
}

function countUsableObstLines(matchRows: ObstWerbungMatchRow[]): number {
  const seen = new Set<string>()
  for (const r of matchRows) {
    if (!r.selectedPlu) continue
    seen.add(r.selectedPlu)
  }
  return seen.size
}

interface CentralCampaignUploadPageProps {
  listType: CentralCampaignListType
}

type ExitMatchRow = {
  parsed: ParsedExitWerbungRow
  selectedPlu: string
}

function weekKey(kw: number, year: number) {
  return `${year}-${kw}`
}

/** Nummerierter Schritt-Titel innerhalb einer Karte (1 Dateien → 2 Kontrollieren → 3 Speichern) */
function StepHeadline({ num, label }: { num: number; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
      <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-muted text-[11px] font-semibold text-foreground">
        {num}
      </span>
      <span>{label}</span>
    </div>
  )
}

/**
 * Obst: pro Kampagne eine oder zwei PLU-Excel-Dateien (nur Markierung). Backshop: Exit-Excel mit PLU-Zuordnung.
 */
export function CentralCampaignUploadPage({ listType }: CentralCampaignUploadPageProps) {
  const isObst = listType === 'obst'
  const { data: activeObst, isPending: isActiveVersionPending } = useActiveVersion()
  const { data: activeBackshop, isPending: isBackshopActivePending } = useActiveBackshopVersion()
  const obstVersionId = isObst ? activeObst?.id : undefined
  const {
    data: obstMasters = [],
    isPending: isObstPluPending,
  } = usePLUData(obstVersionId, {
    enabled: isObst && !!obstVersionId,
  })
  const backshopVersionId = !isObst ? activeBackshop?.id : undefined
  const {
    data: backshopMasters = [],
    isPending: isBackshopPluPending,
  } = useBackshopPLUData(backshopVersionId, {
    enabled: !isObst && !!backshopVersionId,
  })

  const masterCandidates: MasterPluCandidate[] = useMemo(() => {
    if (isObst) {
      return obstMasters.map((r) => ({
        plu: r.plu,
        label: r.display_name ?? r.system_name ?? '',
      }))
    }
    return backshopMasters.map((r) => ({
      plu: r.plu,
      label: r.display_name ?? r.system_name ?? '',
      source: r.source,
    }))
  }, [isObst, obstMasters, backshopMasters])

  const weekOptions = useMemo(() => getCampaignWeekSelectOptions(new Date()), [])
  const defaultWeek = useMemo(() => getDefaultCampaignTargetWeek(), [])
  const [targetWeek, setTargetWeek] = useState(defaultWeek)
  const weekSelectId = useId()

  const selectedWeekKey = weekKey(targetWeek.kw, targetWeek.year)

  const [ordWeekUpload, setOrdWeekUpload] = useState<ObstCampaignUploadState | null>(null)
  const [ord3Upload, setOrd3Upload] = useState<ObstCampaignUploadState | null>(null)

  const [parsingBackshopFile, setParsingBackshopFile] = useState(false)
  const [parsingWeek, setParsingWeek] = useState(false)
  const [parsing3, setParsing3] = useState(false)

  const ordWeekFileRef = useRef<HTMLInputElement>(null)
  const ord3FileRef = useRef<HTMLInputElement>(null)
  const backshopFileRef = useRef<HTMLInputElement>(null)

  const [backshopFileLabel, setBackshopFileLabel] = useState<string | null>(null)
  const [backshopMatchRows, setBackshopMatchRows] = useState<ExitMatchRow[]>([])

  const resetOrdWeekForm = () => {
    setOrdWeekUpload(null)
    if (ordWeekFileRef.current) ordWeekFileRef.current.value = ''
  }
  const resetOrd3Form = () => {
    setOrd3Upload(null)
    if (ord3FileRef.current) ord3FileRef.current.value = ''
  }
  const resetBackshopForm = () => {
    setBackshopMatchRows([])
    setBackshopFileLabel(null)
    if (backshopFileRef.current) backshopFileRef.current.value = ''
  }

  const saveObst = useSaveObstOfferCampaign()
  const saveBackshop = useSaveBackshopOfferCampaign()

  const allPluOptions = useMemo(() => {
    return [...masterCandidates].sort((a, b) => a.label.localeCompare(b.label, 'de'))
  }, [masterCandidates])

  const masterPluSet = useMemo(
    () => new Set((isObst ? obstMasters : []).map((r) => r.plu)),
    [isObst, obstMasters],
  )
  const onOrdWeekFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFiles = e.target.files
    const fileArr = rawFiles ? Array.from(rawFiles) : []
    e.target.value = ''
    if (!fileArr.length) return
    if (fileArr.length > 2) {
      toast.error('Bitte maximal zwei Dateien wählen – meistens Stück- und Gewichtsliste.')
      return
    }
    setParsingWeek(true)
    try {
      const parsedList: ObstWerbungPluExcelParseResult[] = []
      for (const f of fileArr) {
        parsedList.push(await parseObstWerbungPluExcel(f))
      }
      const merged = mergeObstWerbungParseResults(parsedList)
      const state = buildObstCampaignUploadState(merged, masterPluSet, masterCandidates)
      setOrdWeekUpload(state)
      const nLines = merged.lines.length
      toast.success(
        nLines > 0
          ? `${nLines} Artikel für Wochenwerbung eingelesen – bitte PLU-Zuordnung prüfen.`
          : 'Datei(en) gelesen – keine PLU-Zeilen.',
      )
      if (state.skippedRows > 0) {
        toast.info(`${state.skippedRows} Zeile(n) ohne gültige PLU übersprungen.`)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Excel konnte nicht gelesen werden')
    } finally {
      setParsingWeek(false)
    }
  }

  const onOrd3FileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFiles = e.target.files
    const fileArr = rawFiles ? Array.from(rawFiles) : []
    e.target.value = ''
    if (!fileArr.length) return
    if (fileArr.length > 2) {
      toast.error('Bitte maximal zwei Dateien wählen – meistens Stück- und Gewichtsliste.')
      return
    }
    setParsing3(true)
    try {
      const parsedList: ObstWerbungPluExcelParseResult[] = []
      for (const f of fileArr) {
        parsedList.push(await parseObstWerbungPluExcel(f))
      }
      const merged = mergeObstWerbungParseResults(parsedList)
      const state = buildObstCampaignUploadState(merged, masterPluSet, masterCandidates)
      setOrd3Upload(state)
      const nLines = merged.lines.length
      toast.success(
        nLines > 0
          ? `${nLines} Artikel für 3-Tagespreis eingelesen – bitte PLU-Zuordnung prüfen.`
          : 'Datei(en) gelesen – keine PLU-Zeilen.',
      )
      if (state.skippedRows > 0) {
        toast.info(`${state.skippedRows} Zeile(n) ohne gültige PLU übersprungen.`)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Excel konnte nicht gelesen werden')
    } finally {
      setParsing3(false)
    }
  }

  const onBackshopFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setParsingBackshopFile(true)
    try {
      const parsed = await parseExitWerbungExcel(file)
      const rows: ExitMatchRow[] = parsed.rows.map((row) => {
        const cands = rankExitRowMatches(row.artikel, masterCandidates, 12)
        const selectedPlu = cands[0]?.plu ?? ''
        return { parsed: row, selectedPlu }
      })
      setBackshopMatchRows(rows)
      setBackshopFileLabel(parsed.fileName)
      toast.success(`${rows.length} Zeilen aus Excel gelesen`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Excel konnte nicht gelesen werden')
    } finally {
      setParsingBackshopFile(false)
    }
  }

  const updateBackshopPlu = (rowIndex: number, plu: string | null) => {
    setBackshopMatchRows((prev) =>
      prev.map((r, i) => (i === rowIndex ? { ...r, selectedPlu: plu ?? '' } : r)),
    )
  }

  const updateOrdWeekMatchPlu = (rowIndex: number, plu: string | null) => {
    setOrdWeekUpload((prev) => {
      if (!prev) return prev
      const matchRows = prev.matchRows.map((r, i) =>
        i === rowIndex ? { ...r, selectedPlu: plu ?? '' } : r,
      )
      return { ...prev, matchRows }
    })
  }

  const updateOrd3MatchPlu = (rowIndex: number, plu: string | null) => {
    setOrd3Upload((prev) => {
      if (!prev) return prev
      const matchRows = prev.matchRows.map((r, i) =>
        i === rowIndex ? { ...r, selectedPlu: plu ?? '' } : r,
      )
      return { ...prev, matchRows }
    })
  }

  /**
   * Baut Save-Inputs fuer Backshop-Exit: zugeordnete Zeilen mit Preis (origin 'excel'),
   * Rest als 'unassigned' (ohne Preis, nicht in Marktliste) – dient nur der Nachbearbeitung.
   */
  const buildLinesFromExitRows = (rows: ExitMatchRow[]): Array<{
    plu: string | null
    promo_price: number
    source_art_nr: string | null
    source_plu: string | null
    source_artikel: string | null
    origin: 'excel' | 'unassigned'
  }> => {
    const seen = new Set<string>()
    const out: Array<{
      plu: string | null
      promo_price: number
      source_art_nr: string | null
      source_plu: string | null
      source_artikel: string | null
      origin: 'excel' | 'unassigned'
    }> = []
    for (const r of rows) {
      const source_artikel = r.parsed.artikel || null
      const source_art_nr = r.parsed.artNr || null
      const price = r.parsed.aktUvp
      if (r.selectedPlu && price != null && !Number.isNaN(Number(price))) {
        if (seen.has(r.selectedPlu)) continue
        seen.add(r.selectedPlu)
        out.push({
          plu: r.selectedPlu,
          promo_price: Number(price),
          source_art_nr,
          source_plu: null,
          source_artikel,
          origin: 'excel',
        })
      } else {
        out.push({
          plu: null,
          promo_price: Number(price ?? 0),
          source_art_nr,
          source_plu: null,
          source_artikel,
          origin: 'unassigned',
        })
      }
    }
    return out
  }

  const hasBackshopAssignments = (rows: ExitMatchRow[]) =>
    rows.some((r) => !!r.selectedPlu && r.parsed.aktUvp != null && !Number.isNaN(Number(r.parsed.aktUvp)))

  const handleSaveOrdWeek = () => {
    if (!ordWeekUpload) {
      toast.error('Bitte zuerst eine oder zwei Excel-Dateien wählen.')
      return
    }
    const lines = linesFromObstMatchRows(ordWeekUpload.matchRows)
    saveObst.mutate(
      {
        kwNummer: targetWeek.kw,
        jahr: targetWeek.year,
        campaignKind: 'ordersatz_week',
        fileName: ordWeekUpload.fileName,
        lines,
      },
      { onSuccess: () => resetOrdWeekForm() },
    )
  }

  const handleSaveOrd3 = () => {
    if (!ord3Upload) {
      toast.error('Bitte zuerst eine oder zwei Excel-Dateien wählen.')
      return
    }
    const lines = linesFromObstMatchRows(ord3Upload.matchRows)
    saveObst.mutate(
      {
        kwNummer: targetWeek.kw,
        jahr: targetWeek.year,
        campaignKind: 'ordersatz_3day',
        fileName: ord3Upload.fileName,
        lines,
      },
      { onSuccess: () => resetOrd3Form() },
    )
  }

  const handleSaveBackshop = () => {
    if (!hasBackshopAssignments(backshopMatchRows)) {
      toast.error('Keine gültigen PLU-Zuordnungen (PLU wählen, Akt. UVP aus Excel).')
      return
    }
    const lines = buildLinesFromExitRows(backshopMatchRows)
    saveBackshop.mutate(
      {
        kwNummer: targetWeek.kw,
        jahr: targetWeek.year,
        fileName: backshopFileLabel,
        lines,
      },
      { onSuccess: () => resetBackshopForm() },
    )
  }

  const title = isObst ? 'Zentrale Obst- & Gemüse-Werbung' : 'Zentrale Werbung (Backshop)'
  const saving = saveObst.isPending || saveBackshop.isPending
  /** Solange Version oder PLU-Liste lädt, war masterCandidates leer und Upload wirkte „tot“ ohne Hinweis. */
  const isObstMasterLoading =
    isObst && (isActiveVersionPending || (!!obstVersionId && isObstPluPending))
  const isBackshopMasterLoading =
    !isObst && (isBackshopActivePending || (!!backshopVersionId && isBackshopPluPending))
  const noMasterItems = masterCandidates.length === 0
  const obstObOhneMaster = isObst && !isObstMasterLoading && noMasterItems
  const backshopOhneMaster = !isObst && !isBackshopMasterLoading && noMasterItems
  const showKeineStammdatenKarte = obstObOhneMaster || backshopOhneMaster
  const disableObstUploads = isObst && (isObstMasterLoading || noMasterItems)
  const disableBackshopUpload = !isObst && (isBackshopMasterLoading || noMasterItems)
  const isParsingObst = parsingWeek || parsing3

  /** Anzahl tatsächlich speicherbarer Zuordnungen pro Kampagne (Master-PLU gesetzt, dedupliziert). */
  const ordWeekUsableLines = useMemo(
    () => (ordWeekUpload ? countUsableObstLines(ordWeekUpload.matchRows) : 0),
    [ordWeekUpload],
  )
  const ord3UsableLines = useMemo(
    () => (ord3Upload ? countUsableObstLines(ord3Upload.matchRows) : 0),
    [ord3Upload],
  )
  const ordWeekReviewRows = useMemo<CampaignReviewRow[]>(
    () => (ordWeekUpload ? reviewRowsFromObstMatchRows(ordWeekUpload.matchRows) : []),
    [ordWeekUpload],
  )
  const ord3ReviewRows = useMemo<CampaignReviewRow[]>(
    () => (ord3Upload ? reviewRowsFromObstMatchRows(ord3Upload.matchRows) : []),
    [ord3Upload],
  )
  /** row-id -> index lookup, damit onChangePlu auf den bestehenden State mappt */
  const ordWeekRowIdToIndex = useMemo(() => {
    const m = new Map<string, number>()
    ordWeekReviewRows.forEach((r, i) => m.set(r.id, i))
    return m
  }, [ordWeekReviewRows])
  const ord3RowIdToIndex = useMemo(() => {
    const m = new Map<string, number>()
    ord3ReviewRows.forEach((r, i) => m.set(r.id, i))
    return m
  }, [ord3ReviewRows])

  /** KW-Label für dynamische Button-Beschriftung, z. B. "KW17/2026". */
  const kwLabel = formatKWLabel(targetWeek.kw, targetWeek.year)

  const kwCard = (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Kalenderwoche</CardTitle>
        <CardDescription>
          Nur ISO-KW im Bereich ±2 Wochen (wie bei Uploads). Vorauswahl: nächste KW. Eine bestehende Kampagne
          desselben Typs für diese KW wird vollständig ersetzt.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-4 items-end">
        <div className="space-y-2 min-w-[220px]">
          <Label htmlFor={weekSelectId}>Werbungs-KW</Label>
          <Select
            value={selectedWeekKey}
            onValueChange={(v) => {
              const opt = weekOptions.find((o) => weekKey(o.kw, o.year) === v)
              if (opt) setTargetWeek({ kw: opt.kw, year: opt.year })
            }}
          >
            <SelectTrigger id={weekSelectId} className="w-full min-w-[220px]">
              <SelectValue placeholder="KW wählen" />
            </SelectTrigger>
            <SelectContent>
              {weekOptions.map((o) => (
                <SelectItem key={weekKey(o.kw, o.year)} value={weekKey(o.kw, o.year)}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
          <p className="text-muted-foreground text-sm max-w-prose">
            {isObst
              ? 'Hier pflegst du die zentrale Werbung für Obst & Gemüse. Die Artikel erscheinen danach automatisch in allen Marktlisten und PDFs – gelb markiert am Artikelnamen. Wochenwerbung und 3-Tagespreis werden getrennt gepflegt.'
              : 'Exit-Excel (Art. Nr., Artikel, Akt. UVP) laden, PLUs zuordnen und für die KW speichern. Die aktive Masterliste (Backshop) dient als Zuordnungsreferenz.'}
          </p>
        </div>

        {showKeineStammdatenKarte && (
          <Card className="border-amber-200 bg-amber-50/50">
            <CardHeader>
              <CardTitle className="text-base">Keine Stammdaten</CardTitle>
              <CardDescription>
                Bitte zuerst eine aktive Version mit Master-PLU-Liste veröffentlichen.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {isObst && isObstMasterLoading && (
          <p className="text-sm text-muted-foreground">
            Masterliste wird geladen – Datei-Upload ist danach aktiv.
          </p>
        )}
        {!isObst && isBackshopMasterLoading && (
          <p className="text-sm text-muted-foreground">
            Backshop-Masterliste wird geladen – Datei-Upload ist danach aktiv.
          </p>
        )}

        {kwCard}

        {isObst ? (
          <>
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <CardTitle className="text-lg">Wochenwerbung (Ordersatz, Mo–Sa)</CardTitle>
                    <CardDescription>
                      Ein oder zwei Excel-Dateien der Zentrale hochladen (Stück-/Gewichtsliste). Artikel werden anhand
                      der PLU der Masterliste zugeordnet. In der Marktliste und im PDF erscheinen diese Artikel mit
                      gelber Markierung am Namen.
                    </CardDescription>
                  </div>
                  {ordWeekUpload && (
                    <Badge variant="secondary" className="shrink-0">
                      {ordWeekUpload.matchRows.length} Artikel geladen
                      {ordWeekUpload.skippedRows > 0 ? ` · ${ordWeekUpload.skippedRows} ohne PLU übersprungen` : ''}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <input
                  ref={ordWeekFileRef}
                  type="file"
                  accept=".xlsx,.xls"
                  multiple
                  className="hidden"
                  onChange={onOrdWeekFileChange}
                />
                <div className="space-y-2">
                  <StepHeadline num={1} label="Dateien wählen" />
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isParsingObst || disableObstUploads}
                      onClick={() => ordWeekFileRef.current?.click()}
                    >
                      {parsingWeek ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Liest…
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Datei(en) hochladen (max. 2)
                        </>
                      )}
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      {ordWeekUpload ? ordWeekUpload.fileName : 'Keine Datei gewählt'}
                    </span>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <StepHeadline num={2} label="Kontrollieren" />
                  {ordWeekUpload ? (
                    <CampaignReviewTable
                      rows={ordWeekReviewRows}
                      candidates={allPluOptions}
                      onChangePlu={(rowId, plu) => {
                        const idx = ordWeekRowIdToIndex.get(rowId)
                        if (idx != null) updateOrdWeekMatchPlu(idx, plu)
                      }}
                      disabled={disableObstUploads}
                    />
                  ) : (
                    <div className="rounded-md border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                      Noch keine Datei hochgeladen. Nach dem Upload erscheinen die Artikel hier zur Kontrolle.
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-2">
                  <StepHeadline num={3} label="Speichern" />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={handleSaveOrdWeek}
                      variant={ordWeekUpload && ordWeekUsableLines > 0 ? 'default' : 'secondary'}
                      disabled={
                        saving || ordWeekUpload === null || ordWeekUsableLines === 0 || disableObstUploads
                      }
                    >
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Wird gespeichert…
                        </>
                      ) : (
                        `Wochenwerbung für ${kwLabel} speichern`
                      )}
                    </Button>
                    {ordWeekUpload && (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={saving || disableObstUploads}
                        onClick={resetOrdWeekForm}
                      >
                        Abbrechen
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <CardTitle className="text-lg">3-Tagespreis (Do–Sa)</CardTitle>
                    <CardDescription>
                      Ein oder zwei Excel-Dateien für die Do–Sa-Aktion hochladen. Zuordnung wie bei der Wochenwerbung.
                      In Marktliste und PDF erscheinen diese Artikel mit einem eigenen Gelbton.
                    </CardDescription>
                  </div>
                  {ord3Upload && (
                    <Badge variant="secondary" className="shrink-0">
                      {ord3Upload.matchRows.length} Artikel geladen
                      {ord3Upload.skippedRows > 0 ? ` · ${ord3Upload.skippedRows} ohne PLU übersprungen` : ''}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <input
                  ref={ord3FileRef}
                  type="file"
                  accept=".xlsx,.xls"
                  multiple
                  className="hidden"
                  onChange={onOrd3FileChange}
                />
                <div className="space-y-2">
                  <StepHeadline num={1} label="Dateien wählen" />
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isParsingObst || disableObstUploads}
                      onClick={() => ord3FileRef.current?.click()}
                    >
                      {parsing3 ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Liest…
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Datei(en) hochladen (max. 2)
                        </>
                      )}
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      {ord3Upload ? ord3Upload.fileName : 'Keine Datei gewählt'}
                    </span>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <StepHeadline num={2} label="Kontrollieren" />
                  {ord3Upload ? (
                    <CampaignReviewTable
                      rows={ord3ReviewRows}
                      candidates={allPluOptions}
                      onChangePlu={(rowId, plu) => {
                        const idx = ord3RowIdToIndex.get(rowId)
                        if (idx != null) updateOrd3MatchPlu(idx, plu)
                      }}
                      disabled={disableObstUploads}
                    />
                  ) : (
                    <div className="rounded-md border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                      Noch keine Datei hochgeladen. Nach dem Upload erscheinen die Artikel hier zur Kontrolle.
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-2">
                  <StepHeadline num={3} label="Speichern" />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={handleSaveOrd3}
                      variant={ord3Upload && ord3UsableLines > 0 ? 'default' : 'secondary'}
                      disabled={
                        saving || ord3Upload === null || ord3UsableLines === 0 || disableObstUploads
                      }
                    >
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Wird gespeichert…
                        </>
                      ) : (
                        `3-Tagespreis für ${kwLabel} speichern`
                      )}
                    </Button>
                    {ord3Upload && (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={saving || disableObstUploads}
                        onClick={resetOrd3Form}
                      >
                        Abbrechen
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Exit-Excel</CardTitle>
              <CardDescription>
                Spalten „Art. Nr.“ und „Akt. UVP“ werden erkannt. Zeilen ohne gültigen Preis werden beim Import
                übersprungen.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <input
                ref={backshopFileRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={onBackshopFileChange}
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={parsingBackshopFile || disableBackshopUpload}
                  onClick={() => backshopFileRef.current?.click()}
                >
                  {parsingBackshopFile ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Liest…
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Datei wählen
                    </>
                  )}
                </Button>
                {backshopFileLabel && <span className="text-sm text-muted-foreground">{backshopFileLabel}</span>}
              </div>

              {backshopMatchRows.length > 0 && (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-24">Zeile</TableHead>
                        <TableHead>Artikel</TableHead>
                        <TableHead className="w-24">Akt. UVP</TableHead>
                        <TableHead className="min-w-[240px]">PLU (suchen &amp; wählen)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {backshopMatchRows.map((mr, idx) => (
                        <TableRow key={`${mr.parsed.rowIndex}-${idx}`}>
                          <TableCell>{mr.parsed.rowIndex}</TableCell>
                          <TableCell className="max-w-xs break-words">{mr.parsed.artikel}</TableCell>
                          <TableCell>{mr.parsed.aktUvp?.toFixed(2)}</TableCell>
                          <TableCell>
                            <CampaignPluCombobox
                              candidates={allPluOptions}
                              value={mr.selectedPlu || null}
                              onChange={(plu) => updateBackshopPlu(idx, plu)}
                              disabled={disableBackshopUpload}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={handleSaveBackshop}
                  disabled={saving || backshopMatchRows.length === 0 || disableBackshopUpload}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Kampagne speichern
                </Button>
                {(backshopFileLabel != null || backshopMatchRows.length > 0) && (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={saving || disableBackshopUpload}
                    onClick={resetBackshopForm}
                  >
                    Abbrechen
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
