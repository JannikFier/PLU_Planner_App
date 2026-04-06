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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { useActiveVersion } from '@/hooks/useActiveVersion'
import { usePLUData } from '@/hooks/usePLUData'
import { useActiveBackshopVersion } from '@/hooks/useActiveBackshopVersion'
import { useBackshopPLUData } from '@/hooks/useBackshopPLUData'
import { parseExitWerbungExcel } from '@/lib/excel-parser'
import { parseObstWerbungPluExcel, filterPluListToMaster } from '@/lib/obst-werbung-plu-excel'
import { rankExitRowMatches } from '@/lib/exit-offer-matching'
import type { MasterPluCandidate } from '@/lib/exit-offer-matching'
import { useSaveObstOfferCampaign, useSaveBackshopOfferCampaign } from '@/hooks/useCentralOfferCampaigns'
import {
  getCampaignWeekSelectOptions,
  getDefaultCampaignTargetWeek,
} from '@/lib/date-kw-utils'
import type { ParsedExitWerbungRow } from '@/types/plu'
import { toast } from 'sonner'
import { Upload, Loader2, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export type CentralCampaignListType = 'obst' | 'backshop'

/** Zentrale Obst-Werbung: nur Markierung (Namen-Gelb); kein Aktionspreis aus Excel */
const MARK_ONLY_PROMO_PRICE = 0

type ObstPluUploadState = {
  plu: string[]
  fileName: string
  droppedNotInMaster: number
  skippedRows: number
}

function ObstPluPreviewTable({
  plu,
  masterNameByPlu,
}: {
  plu: string[]
  masterNameByPlu: Map<string, string>
}) {
  if (plu.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Keine PLU dieser Datei steht in der aktuellen Masterliste – beim Speichern wird die Kampagne für diese
        Variante geleert.
      </p>
    )
  }
  return (
    <div className="rounded-md border overflow-x-auto max-h-[min(60vh,480px)] overflow-y-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-14">Nr.</TableHead>
            <TableHead className="w-28">PLU</TableHead>
            <TableHead>Artikel (Master)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {plu.map((p, i) => (
            <TableRow key={`${p}-${i}`}>
              <TableCell>{i + 1}</TableCell>
              <TableCell className="font-mono text-sm">{p}</TableCell>
              <TableCell className="max-w-md break-words">{masterNameByPlu.get(p) ?? '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
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

/** Durchsuchbare PLU-Auswahl (Command), statt langer Select-Liste ohne Suche */
function CampaignPluCombobox({
  candidates,
  value,
  onChange,
  disabled,
}: {
  candidates: MasterPluCandidate[]
  value: string
  onChange: (plu: string) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const selected = candidates.find((c) => c.plu === value)
  const label = value ? `${value} – ${selected?.label ?? '?'}` : 'PLU wählen…'

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full min-w-[200px] max-w-[420px] justify-between font-normal"
        >
          <span className={cn('truncate text-left', !value && 'text-muted-foreground')}>{label}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(100vw-2rem,420px)] p-0" align="start">
        <Command>
          <CommandInput placeholder="PLU oder Name suchen…" />
          <CommandList>
            <CommandEmpty>Kein Treffer.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__none__"
                onSelect={() => {
                  onChange('')
                  setOpen(false)
                }}
              >
                — Keine —
              </CommandItem>
              {candidates.map((c) => (
                <CommandItem
                  key={c.plu}
                  value={`${c.plu} ${c.label}`}
                  onSelect={() => {
                    onChange(c.plu)
                    setOpen(false)
                  }}
                >
                  <span className="font-mono text-xs mr-2">{c.plu}</span>
                  <span className="truncate">{c.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

/**
 * Obst: zwei Excel-Dateien mit PLU-Spalte (nur Markierung). Backshop: Exit-Excel mit PLU-Zuordnung.
 */
export function CentralCampaignUploadPage({ listType }: CentralCampaignUploadPageProps) {
  const isObst = listType === 'obst'
  const { data: activeObst } = useActiveVersion()
  const { data: activeBackshop } = useActiveBackshopVersion()

  const obstVersionId = isObst ? activeObst?.id : undefined
  const { data: obstMasters = [] } = usePLUData(obstVersionId, {
    enabled: isObst && !!obstVersionId,
  })
  const backshopVersionId = !isObst ? activeBackshop?.id : undefined
  const { data: backshopMasters = [] } = useBackshopPLUData(backshopVersionId, {
    enabled: !isObst && !!backshopVersionId,
  })

  const masterCandidates: MasterPluCandidate[] = useMemo(() => {
    const rows = isObst ? obstMasters : backshopMasters
    return rows.map((r) => ({
      plu: r.plu,
      label: r.display_name ?? r.system_name ?? '',
    }))
  }, [isObst, obstMasters, backshopMasters])

  const weekOptions = useMemo(() => getCampaignWeekSelectOptions(new Date()), [])
  const defaultWeek = useMemo(() => getDefaultCampaignTargetWeek(), [])
  const [targetWeek, setTargetWeek] = useState(defaultWeek)
  const weekSelectId = useId()

  const selectedWeekKey = weekKey(targetWeek.kw, targetWeek.year)

  const [ordWeekUpload, setOrdWeekUpload] = useState<ObstPluUploadState | null>(null)
  const [ord3Upload, setOrd3Upload] = useState<ObstPluUploadState | null>(null)

  const [parsingBackshopFile, setParsingBackshopFile] = useState(false)
  const [parsingWeek, setParsingWeek] = useState(false)
  const [parsing3, setParsing3] = useState(false)

  const ordWeekFileRef = useRef<HTMLInputElement>(null)
  const ord3FileRef = useRef<HTMLInputElement>(null)
  const backshopFileRef = useRef<HTMLInputElement>(null)

  const [backshopFileLabel, setBackshopFileLabel] = useState<string | null>(null)
  const [backshopMatchRows, setBackshopMatchRows] = useState<ExitMatchRow[]>([])

  const saveObst = useSaveObstOfferCampaign()
  const saveBackshop = useSaveBackshopOfferCampaign()

  const allPluOptions = useMemo(() => {
    return [...masterCandidates].sort((a, b) => a.label.localeCompare(b.label, 'de'))
  }, [masterCandidates])

  const masterPluSet = useMemo(
    () => new Set((isObst ? obstMasters : []).map((r) => r.plu)),
    [isObst, obstMasters],
  )
  const masterNameByPlu = useMemo(() => {
    const m = new Map<string, string>()
    for (const row of isObst ? obstMasters : []) {
      m.set(row.plu, row.display_name ?? row.system_name ?? '')
    }
    return m
  }, [isObst, obstMasters])

  const onOrdWeekFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setParsingWeek(true)
    try {
      const parsed = await parseObstWerbungPluExcel(file)
      const { accepted, dropped } = filterPluListToMaster(parsed.plu, masterPluSet)
      setOrdWeekUpload({
        plu: accepted,
        fileName: parsed.fileName,
        droppedNotInMaster: dropped.length,
        skippedRows: parsed.skippedRows,
      })
      toast.success(
        accepted.length > 0
          ? `${accepted.length} PLU(s) für Gesamte Wochenwerbung (Master).`
          : 'Datei gelesen – keine PLU aus der Masterliste.',
      )
      if (dropped.length > 0) {
        toast.info(`${dropped.length} PLU(s) nicht in der Masterliste – übersprungen.`)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Excel konnte nicht gelesen werden')
    } finally {
      setParsingWeek(false)
    }
  }

  const onOrd3FileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setParsing3(true)
    try {
      const parsed = await parseObstWerbungPluExcel(file)
      const { accepted, dropped } = filterPluListToMaster(parsed.plu, masterPluSet)
      setOrd3Upload({
        plu: accepted,
        fileName: parsed.fileName,
        droppedNotInMaster: dropped.length,
        skippedRows: parsed.skippedRows,
      })
      toast.success(
        accepted.length > 0
          ? `${accepted.length} PLU(s) für 3-Tage-Werbung (Do–Sa, Master).`
          : 'Datei gelesen – keine PLU aus der Masterliste.',
      )
      if (dropped.length > 0) {
        toast.info(`${dropped.length} PLU(s) nicht in der Masterliste – übersprungen.`)
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

  const updateBackshopPlu = (rowIndex: number, plu: string) => {
    setBackshopMatchRows((prev) => prev.map((r, i) => (i === rowIndex ? { ...r, selectedPlu: plu } : r)))
  }

  const buildLinesFromExitRows = (rows: ExitMatchRow[]) => {
    const lineMap = new Map<string, { plu: string; promo_price: number; source_art_nr?: string | null }>()
    for (const r of rows) {
      if (!r.selectedPlu) continue
      const price = r.parsed.aktUvp
      if (price == null || Number.isNaN(Number(price))) continue
      lineMap.set(r.selectedPlu, {
        plu: r.selectedPlu,
        promo_price: Number(price),
        source_art_nr: r.parsed.artNr,
      })
    }
    return Array.from(lineMap.values())
  }

  const handleSaveOrdWeek = () => {
    if (!ordWeekUpload) {
      toast.error('Bitte zuerst eine Excel-Datei wählen.')
      return
    }
    const lines = ordWeekUpload.plu.map((plu) => ({ plu, promo_price: MARK_ONLY_PROMO_PRICE }))
    saveObst.mutate({
      kwNummer: targetWeek.kw,
      jahr: targetWeek.year,
      campaignKind: 'ordersatz_week',
      fileName: ordWeekUpload.fileName,
      lines,
    })
  }

  const handleSaveOrd3 = () => {
    if (!ord3Upload) {
      toast.error('Bitte zuerst eine Excel-Datei wählen.')
      return
    }
    const lines = ord3Upload.plu.map((plu) => ({ plu, promo_price: MARK_ONLY_PROMO_PRICE }))
    saveObst.mutate({
      kwNummer: targetWeek.kw,
      jahr: targetWeek.year,
      campaignKind: 'ordersatz_3day',
      fileName: ord3Upload.fileName,
      lines,
    })
  }

  const handleSaveBackshop = () => {
    const lines = buildLinesFromExitRows(backshopMatchRows)
    if (lines.length === 0) {
      toast.error('Keine gültigen PLU-Zuordnungen (PLU wählen, Akt. UVP aus Excel).')
      return
    }
    saveBackshop.mutate({
      kwNummer: targetWeek.kw,
      jahr: targetWeek.year,
      fileName: backshopFileLabel,
      lines,
    })
  }

  const title = isObst ? 'Zentrale Werbung (Obst/Gemüse)' : 'Zentrale Werbung (Backshop)'
  const saving = saveObst.isPending || saveBackshop.isPending
  const noMaster = masterCandidates.length === 0
  const isParsingObst = parsingWeek || parsing3

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
          <p className="text-muted-foreground text-sm">
            {isObst
              ? 'Zwei Excel-Dateien (je eine Spalte „PLU“): Gesamte Wochenwerbung und 3-Tage-Preis (Do–Sa). Es werden nur Markierungen gesetzt (gelber Name; zwei verschiedene Gelbtöne), ohne Aktionspreis aus der Datei. Nur PLUs, die in der aktiven Masterliste stehen, werden übernommen.'
              : 'Exit-Excel (Art. Nr., Artikel, Akt. UVP) laden, PLUs zuordnen und für die KW speichern. Die aktive Masterliste (Backshop) dient als Zuordnungsreferenz.'}
          </p>
        </div>

        {noMaster && (
          <Card className="border-amber-200 bg-amber-50/50">
            <CardHeader>
              <CardTitle className="text-base">Keine Stammdaten</CardTitle>
              <CardDescription>
                Bitte zuerst eine aktive Version mit Master-PLU-Liste veröffentlichen.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {kwCard}

        {isObst ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Gesamte Wochenwerbung (EWK)</CardTitle>
                <CardDescription>
                  Excel mit mindestens einer Spalte „PLU“ (z. B. Stück- und Gewichtsartikel). In der Liste/PDF: eine
                  Gelb-Markierung am Namen für diese Kampagne.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <input
                  ref={ordWeekFileRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={onOrdWeekFileChange}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isParsingObst || noMaster}
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
                        Datei wählen
                      </>
                    )}
                  </Button>
                  {ordWeekUpload && (
                    <span className="text-sm text-muted-foreground">{ordWeekUpload.fileName}</span>
                  )}
                </div>
                {ordWeekUpload && (
                  <div className="space-y-2">
                    {ordWeekUpload.droppedNotInMaster > 0 || ordWeekUpload.skippedRows > 0 ? (
                      <p className="text-xs text-muted-foreground">
                        {ordWeekUpload.droppedNotInMaster > 0
                          ? `${ordWeekUpload.droppedNotInMaster} PLU(s) nicht in der Masterliste. `
                          : null}
                        {ordWeekUpload.skippedRows > 0
                          ? `${ordWeekUpload.skippedRows} Zeile(n) ohne gültige PLU übersprungen.`
                          : null}
                      </p>
                    ) : null}
                    <ObstPluPreviewTable plu={ordWeekUpload.plu} masterNameByPlu={masterNameByPlu} />
                  </div>
                )}
                <Button onClick={handleSaveOrdWeek} disabled={saving || ordWeekUpload === null || noMaster}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Wochenwerbung speichern
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">3-Tage-Preis (Do–Sa)</CardTitle>
                <CardDescription>
                  Zweite Excel-Datei (spalte „PLU“). Andere Gelb-Markierung am Namen als bei der Wochenwerbung.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <input
                  ref={ord3FileRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={onOrd3FileChange}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isParsingObst || noMaster}
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
                        Datei wählen
                      </>
                    )}
                  </Button>
                  {ord3Upload && <span className="text-sm text-muted-foreground">{ord3Upload.fileName}</span>}
                </div>
                {ord3Upload && (
                  <div className="space-y-2">
                    {ord3Upload.droppedNotInMaster > 0 || ord3Upload.skippedRows > 0 ? (
                      <p className="text-xs text-muted-foreground">
                        {ord3Upload.droppedNotInMaster > 0
                          ? `${ord3Upload.droppedNotInMaster} PLU(s) nicht in der Masterliste. `
                          : null}
                        {ord3Upload.skippedRows > 0
                          ? `${ord3Upload.skippedRows} Zeile(n) ohne gültige PLU übersprungen.`
                          : null}
                      </p>
                    ) : null}
                    <ObstPluPreviewTable plu={ord3Upload.plu} masterNameByPlu={masterNameByPlu} />
                  </div>
                )}
                <Button onClick={handleSaveOrd3} disabled={saving || ord3Upload === null || noMaster}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  3-Tage-Werbung speichern
                </Button>
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
                  disabled={parsingBackshopFile || noMaster}
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
                              value={mr.selectedPlu}
                              onChange={(plu) => updateBackshopPlu(idx, plu)}
                              disabled={noMaster}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              <Button onClick={handleSaveBackshop} disabled={saving || backshopMatchRows.length === 0 || noMaster}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Kampagne speichern
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
