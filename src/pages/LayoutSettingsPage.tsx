// LayoutSettingsPage: Layout-Konfiguration für Super-Admin (mit Live-Vorschau)

import { useState, useEffect, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Check, Loader2 } from 'lucide-react'
import { RadioCard } from '@/components/ui/radio-card'

import { useLayoutSettings, useUpdateLayoutSettings } from '@/hooks/useLayoutSettings'
import { LayoutPreview } from '@/components/plu/LayoutPreview'
import { Skeleton } from '@/components/ui/skeleton'

// ============================================================
// LayoutSettingsPage
// ============================================================

export function LayoutSettingsPage() {
  const { data: settings, isLoading } = useLayoutSettings()
  const updateMutation = useUpdateLayoutSettings()

  // Lokaler State für Formular
  const [form, setForm] = useState({
    sort_mode: 'ALPHABETICAL' as 'ALPHABETICAL' | 'BY_BLOCK',
    display_mode: 'MIXED' as 'MIXED' | 'SEPARATED',
    flow_direction: 'ROW_BY_ROW' as 'ROW_BY_ROW' | 'COLUMN_FIRST',
    font_header_px: 24,
    font_column_px: 16,
    font_product_px: 12,
    mark_red_kw_count: 2,
    mark_yellow_kw_count: 3,
    features_custom_products: true,
    features_hidden_items: true,
    features_blocks: true,
    features_keyword_rules: true,
  })

  // Speicher-Status für die Anzeige
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  // Flag: DB-Werte wurden geladen (verhindert Auto-Save bei Initialisierung)
  const isInitialized = useRef(false)
  // Nur ein Save gleichzeitig (verhindert hängende parallele Supabase-Calls)
  const saveInProgressRef = useRef(false)
  const pendingFormRef = useRef<typeof form | null>(null)

  // Formular mit DB-Werten initialisieren
  useEffect(() => {
    if (settings) {
      setForm({
        sort_mode: settings.sort_mode,
        display_mode: settings.display_mode,
        flow_direction: settings.flow_direction,
        font_header_px: settings.font_header_px,
        font_column_px: settings.font_column_px,
        font_product_px: settings.font_product_px,
        mark_red_kw_count: settings.mark_red_kw_count,
        mark_yellow_kw_count: settings.mark_yellow_kw_count,
        features_custom_products: settings.features_custom_products,
        features_hidden_items: settings.features_hidden_items,
        features_blocks: settings.features_blocks,
        features_keyword_rules: settings.features_keyword_rules,
      })
      // Kleine Verzögerung damit der initiale setForm nicht gleich Auto-Save auslöst
      const timeoutId = setTimeout(() => {
        isInitialized.current = true
      }, 100)
      return () => clearTimeout(timeoutId)
    }
  }, [settings])

  // Auto-Save mit 500ms Debounce
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autoSave = useCallback(
    (newForm: typeof form) => {
      if (!isInitialized.current) return

      setSaveStatus('saving')
      if (debounceRef.current) clearTimeout(debounceRef.current)

      debounceRef.current = setTimeout(async () => {
        if (saveInProgressRef.current) {
          pendingFormRef.current = newForm
          return
        }
        saveInProgressRef.current = true
        try {
          await updateMutation.mutateAsync(newForm)
          setSaveStatus('saved')
          setTimeout(() => setSaveStatus('idle'), 2000)
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Fehler beim Speichern')
          setSaveStatus('idle')
        } finally {
          saveInProgressRef.current = false
          const pending = pendingFormRef.current
          pendingFormRef.current = null
          if (pending) {
            setSaveStatus('saving')
            saveInProgressRef.current = true
            try {
              await updateMutation.mutateAsync(pending)
              setSaveStatus('saved')
              setTimeout(() => setSaveStatus('idle'), 2000)
            } catch {
              toast.error('Fehler beim Speichern')
              setSaveStatus('idle')
            } finally {
              saveInProgressRef.current = false
            }
          }
        }
      }, 500)
    },
    [updateMutation],
  )

  // Form-Änderungen: lokalen State setzen + Auto-Save triggern
  const updateForm = useCallback(
    (updates: Partial<typeof form>) => {
      setForm((prev) => {
        const next = { ...prev, ...updates }
        autoSave(next)
        return next
      })
    },
    [autoSave],
  )

  // Tab wurde sichtbar: Browser throttelt Hintergrund-Tabs – Re-Render erzwingen
  const [, setVisibilityTick] = useState(0)
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible') setVisibilityTick((t) => t + 1)
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [])

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-[400px]" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
            <h2 className="text-2xl font-bold tracking-tight">Layout-Konfiguration</h2>
            <p className="text-sm text-muted-foreground">
              Wie soll die PLU-Liste aufgebaut sein?
            </p>
        </div>

        {/* Zwei-Spalten-Layout: Einstellungen + Vorschau */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* === LINKE SPALTE: Einstellungen === */}
          <div className="space-y-6">
            {/* Anzeige-Modus */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Anzeige-Modus</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <RadioCard
                  selected={form.display_mode === 'MIXED'}
                  onClick={() => updateForm({ display_mode: 'MIXED' })}
                  title="Alle zusammen"
                  description="Stück- und Gewichtsartikel in einer gemeinsamen Liste"
                />
                <RadioCard
                  selected={form.display_mode === 'SEPARATED'}
                  onClick={() => updateForm({ display_mode: 'SEPARATED' })}
                  title="Stück / Gewicht getrennt"
                  description="Separate Bereiche für Stück- und Gewichtsware"
                />
              </CardContent>
            </Card>

            {/* Sortierung */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Sortierung</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <RadioCard
                  selected={form.sort_mode === 'ALPHABETICAL'}
                  onClick={() => updateForm({ sort_mode: 'ALPHABETICAL' })}
                  title="Alphabetisch (A-Z)"
                  description="Artikel nach Namen sortiert mit Buchstaben-Headern"
                />
                <RadioCard
                  selected={form.sort_mode === 'BY_BLOCK'}
                  onClick={() => updateForm({ sort_mode: 'BY_BLOCK' })}
                  title="Nach Warengruppen"
                  description="Gruppiert nach Kategorien (Obst, Gemüse, ...)"
                />
              </CardContent>
            </Card>

            {/* Flussrichtung */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Flussrichtung</CardTitle>
                <CardDescription>Tabelle und PDF</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <RadioCard
                  selected={form.flow_direction === 'ROW_BY_ROW'}
                  onClick={() => updateForm({ flow_direction: 'ROW_BY_ROW' })}
                  title="Zeilenweise"
                  description="Jede Zeile wird voll gefüllt (links → rechts → nächste Zeile)"
                />
                <RadioCard
                  selected={form.flow_direction === 'COLUMN_FIRST'}
                  onClick={() => updateForm({ flow_direction: 'COLUMN_FIRST' })}
                  title="Spaltenweise"
                  description="Linke Spalte wird zuerst gefüllt, dann die rechte"
                />
              </CardContent>
            </Card>

            {/* Schriftgrößen */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Schriftgrößen</CardTitle>
                <CardDescription>Größen in Pixel für Tabelle und PDF.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Header (px)</Label>
                    <Input
                      type="number"
                      min={10}
                      max={48}
                      value={form.font_header_px}
                      onChange={(e) => {
                        const v = parseInt(e.target.value)
                        if (!isNaN(v) && v > 0) updateForm({ font_header_px: v })
                      }}
                      onBlur={(e) => {
                        const v = parseInt(e.target.value)
                        if (isNaN(v) || v < 10) updateForm({ font_header_px: 24 })
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Spalte (px)</Label>
                    <Input
                      type="number"
                      min={8}
                      max={36}
                      value={form.font_column_px}
                      onChange={(e) => {
                        const v = parseInt(e.target.value)
                        if (!isNaN(v) && v > 0) updateForm({ font_column_px: v })
                      }}
                      onBlur={(e) => {
                        const v = parseInt(e.target.value)
                        if (isNaN(v) || v < 8) updateForm({ font_column_px: 16 })
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Produkt (px)</Label>
                    <Input
                      type="number"
                      min={6}
                      max={24}
                      value={form.font_product_px}
                      onChange={(e) => {
                        const v = parseInt(e.target.value)
                        if (!isNaN(v) && v > 0) updateForm({ font_product_px: v })
                      }}
                      onBlur={(e) => {
                        const v = parseInt(e.target.value)
                        if (isNaN(v) || v < 6) updateForm({ font_product_px: 12 })
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Markierungsdauer */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Markierungsdauer</CardTitle>
                <CardDescription>
                  Wie viele Kalenderwochen sollen Farbmarkierungen sichtbar bleiben?
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Rot (PLU geändert)</Label>
                    <Select
                      value={String(form.mark_red_kw_count)}
                      onValueChange={(v) => updateForm({ mark_red_kw_count: parseInt(v) })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4].map((n) => (
                          <SelectItem key={n} value={String(n)}>{n} KW{n > 1 ? 's' : ''}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Gelb (Neues Produkt)</Label>
                    <Select
                      value={String(form.mark_yellow_kw_count)}
                      onValueChange={(v) => updateForm({ mark_yellow_kw_count: parseInt(v) })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4].map((n) => (
                          <SelectItem key={n} value={String(n)}>{n} KW{n > 1 ? 's' : ''}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Feature-Toggles */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Features</CardTitle>
                <CardDescription>Funktionen für alle User ein-/ausschalten.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { key: 'features_custom_products' as const, label: 'Eigene Produkte', desc: 'User können eigene Artikel hinzufügen' },
                  { key: 'features_hidden_items' as const, label: 'Produkte ausblenden', desc: 'User können Artikel aus ihrer Liste entfernen' },
                ].map((feature) => (
                  <div key={feature.key} className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">{feature.label}</div>
                      <div className="text-xs text-muted-foreground">{feature.desc}</div>
                    </div>
                    <Switch
                      checked={form[feature.key]}
                      onCheckedChange={(checked) => updateForm({ [feature.key]: checked })}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Auto-Save Statusanzeige */}
            {saveStatus !== 'idle' && (
              <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
                {saveStatus === 'saving' && (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Speichert...</>
                )}
                {saveStatus === 'saved' && (
                  <><Check className="h-3.5 w-3.5 text-green-600" /> Gespeichert</>
                )}
              </div>
            )}
          </div>

          {/* === RECHTE SPALTE: Live-Vorschau === */}
          <div className="lg:sticky lg:top-6 lg:self-start space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Vorschau
            </h3>
            <LayoutPreview
              sortMode={form.sort_mode}
              displayMode={form.display_mode}
              flowDirection={form.flow_direction}
              fontHeaderPx={form.font_header_px}
              fontColumnPx={form.font_column_px}
              fontProductPx={form.font_product_px}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
