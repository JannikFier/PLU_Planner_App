// Super-Admin: zentrale Exit-Werbung (Obst/Gemüse oder Backshop) pro KW hochladen und speichern

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

interface CentralCampaignUploadPageProps {
  listType: CentralCampaignListType
}

type MatchRow = {
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
 * Exit-Excel parsen, PLUs aus der aktiven Masterliste zuordnen, Kampagne für KW speichern.
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

  const [fileLabel, setFileLabel] = useState<string | null>(null)
  const [matchRows, setMatchRows] = useState<MatchRow[]>([])
  const [isParsing, setIsParsing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const saveObst = useSaveObstOfferCampaign()
  const saveBackshop = useSaveBackshopOfferCampaign()

  const allPluOptions = useMemo(() => {
    return [...masterCandidates].sort((a, b) => a.label.localeCompare(b.label, 'de'))
  }, [masterCandidates])

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setIsParsing(true)
    try {
      const parsed = await parseExitWerbungExcel(file)
      const rows: MatchRow[] = parsed.rows.map((row) => {
        const cands = rankExitRowMatches(row.artikel, masterCandidates, 12)
        const selectedPlu = cands[0]?.plu ?? ''
        return { parsed: row, selectedPlu }
      })
      setMatchRows(rows)
      setFileLabel(parsed.fileName)
      toast.success(`${rows.length} Zeilen aus Excel gelesen`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Excel konnte nicht gelesen werden')
    } finally {
      setIsParsing(false)
    }
  }

  const updatePlu = (rowIndex: number, plu: string) => {
    setMatchRows((prev) => prev.map((r, i) => (i === rowIndex ? { ...r, selectedPlu: plu } : r)))
  }

  const handleSave = () => {
    const lineMap = new Map<string, { plu: string; promo_price: number; source_art_nr?: string | null }>()
    for (const r of matchRows) {
      if (!r.selectedPlu) continue
      const price = r.parsed.aktUvp
      if (price == null || Number.isNaN(Number(price))) continue
      lineMap.set(r.selectedPlu, {
        plu: r.selectedPlu,
        promo_price: Number(price),
        source_art_nr: r.parsed.artNr,
      })
    }
    const lines = Array.from(lineMap.values())
    if (lines.length === 0) {
      toast.error('Keine gültigen PLU-Zuordnungen (PLU wählen, Akt. UVP aus Excel).')
      return
    }
    const payload = {
      kwNummer: targetWeek.kw,
      jahr: targetWeek.year,
      fileName: fileLabel,
      lines,
    }
    if (isObst) saveObst.mutate(payload)
    else saveBackshop.mutate(payload)
  }

  const title = isObst ? 'Zentrale Werbung (Obst/Gemüse)' : 'Zentrale Werbung (Backshop)'
  const saving = saveObst.isPending || saveBackshop.isPending
  const noMaster = masterCandidates.length === 0

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
          <p className="text-muted-foreground text-sm">
            Exit-Excel (Art. Nr., Artikel, Akt. UVP) laden, PLUs zuordnen und für die KW speichern. Die
            aktive Masterliste ({isObst ? 'Obst/Gemüse' : 'Backshop'}) dient als Zuordnungsreferenz.
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

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Kalenderwoche</CardTitle>
            <CardDescription>
              Nur ISO-KW im Bereich ±2 Wochen (wie bei Uploads). Vorauswahl: nächste KW. Eine bestehende
              Kampagne für diese KW wird vollständig ersetzt.
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
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={onFileChange}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isParsing || noMaster}
                onClick={() => fileInputRef.current?.click()}
              >
                {isParsing ? (
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
              {fileLabel && <span className="text-sm text-muted-foreground">{fileLabel}</span>}
            </div>

            {matchRows.length > 0 && (
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
                    {matchRows.map((mr, idx) => (
                      <TableRow key={`${mr.parsed.rowIndex}-${idx}`}>
                        <TableCell>{mr.parsed.rowIndex}</TableCell>
                        <TableCell className="max-w-xs break-words">{mr.parsed.artikel}</TableCell>
                        <TableCell>{mr.parsed.aktUvp?.toFixed(2)}</TableCell>
                        <TableCell>
                          <CampaignPluCombobox
                            candidates={allPluOptions}
                            value={mr.selectedPlu}
                            onChange={(plu) => updatePlu(idx, plu)}
                            disabled={noMaster}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <Button onClick={handleSave} disabled={saving || matchRows.length === 0 || noMaster}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Kampagne speichern
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
