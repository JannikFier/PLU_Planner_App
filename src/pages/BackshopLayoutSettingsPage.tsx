// BackshopLayoutSettingsPage: Layout-Konfiguration für Backshop (Super-Admin)

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
import { Skeleton } from '@/components/ui/skeleton'

import { useBackshopLayoutSettings, useUpdateBackshopLayoutSettings } from '@/hooks/useBackshopLayoutSettings'
import { BackshopLayoutPreview } from '@/components/plu/BackshopLayoutPreview'

export function BackshopLayoutSettingsPage() {
  const { data: settings, isLoading } = useBackshopLayoutSettings()
  const updateMutation = useUpdateBackshopLayoutSettings()

  const [form, setForm] = useState({
    sort_mode: 'ALPHABETICAL' as 'ALPHABETICAL' | 'BY_BLOCK',
    display_mode: 'MIXED' as 'MIXED' | 'SEPARATED',
    flow_direction: 'ROW_BY_ROW' as 'ROW_BY_ROW' | 'COLUMN_FIRST',
    font_header_px: 32,
    font_column_px: 18,
    font_product_px: 18,
    mark_red_kw_count: 2,
    mark_yellow_kw_count: 3,
    features_custom_products: true,
    features_hidden_items: true,
    features_blocks: true,
    features_keyword_rules: true,
    page_break_per_block: false,
  })

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const isInitialized = useRef(false)
  const saveInProgressRef = useRef(false)
  const pendingFormRef = useRef<typeof form | null>(null)

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
        page_break_per_block: settings.page_break_per_block ?? false,
      })
      const timeoutId = setTimeout(() => {
        isInitialized.current = true
      }, 100)
      return () => clearTimeout(timeoutId)
    }
  }, [settings])

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
        <div>
            <h2 className="text-2xl font-bold tracking-tight">Layout (Backshop)</h2>
            <p className="text-sm text-muted-foreground">
              Sortierung, Anzeige und Schriftgrößen für die Backshop-Liste.
            </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Anzeige</CardTitle>
              <CardDescription>Wie soll die Backshop-Liste gegliedert sein? Innerhalb immer alphabetisch (A–Z).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <RadioCard
                selected={form.sort_mode === 'ALPHABETICAL'}
                onClick={() => updateForm({ sort_mode: 'ALPHABETICAL', display_mode: 'MIXED' })}
                title="Alle zusammen (alphabetisch)"
                description="Alle Backshop-Artikel in einer gemeinsamen Liste A–Z"
              />
              <RadioCard
                selected={form.sort_mode === 'BY_BLOCK'}
                onClick={() => updateForm({ sort_mode: 'BY_BLOCK', display_mode: 'MIXED' })}
                title="Nach Warengruppen (alphabetisch)"
                description="Gruppiert nach Kategorien (Brötchen, Brot, …), innerhalb jeder Gruppe A–Z"
              />
            </CardContent>
          </Card>

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
                description="Links → rechts → nächste Zeile"
              />
              <RadioCard
                selected={form.flow_direction === 'COLUMN_FIRST'}
                onClick={() => updateForm({ flow_direction: 'COLUMN_FIRST' })}
                title="Spaltenweise"
                description="Linke Spalte zuerst, dann rechte"
              />
            </CardContent>
          </Card>

          {form.sort_mode === 'BY_BLOCK' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">PDF</CardTitle>
                <CardDescription>Seitenumbruch bei Warengruppen</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">Jede Warengruppe auf eigener Seite</div>
                    <div className="text-xs text-muted-foreground">Jede Warengruppe beginnt im PDF auf einer neuen Seite</div>
                  </div>
                  <Switch
                    checked={form.page_break_per_block}
                    onCheckedChange={(checked) => updateForm({ page_break_per_block: checked })}
                  />
                </div>
              </CardContent>
            </Card>
          )}

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
                      if (isNaN(v) || v < 10) updateForm({ font_header_px: 32 })
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
                      if (isNaN(v) || v < 8) updateForm({ font_column_px: 18 })
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
                      if (isNaN(v) || v < 6) updateForm({ font_product_px: 18 })
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Markierungsdauer</CardTitle>
              <CardDescription>Wie viele Kalenderwochen sollen Farbmarkierungen sichtbar bleiben?</CardDescription>
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

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Features</CardTitle>
              <CardDescription>Funktionen für die Backshop-Liste ein-/ausschalten.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: 'features_custom_products' as const, label: 'Eigene Produkte', desc: 'User können eigene Backshop-Artikel hinzufügen' },
                { key: 'features_hidden_items' as const, label: 'Produkte ausblenden', desc: 'User können Artikel aus ihrer Liste entfernen' },
                { key: 'features_keyword_rules' as const, label: 'Bezeichnungsregeln', desc: 'Automatische Namensanpassungen' },
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

          <div className="space-y-4">
            <BackshopLayoutPreview
              sortMode={form.sort_mode}
              flowDirection={form.flow_direction}
              fontHeaderPx={form.font_header_px}
              fontColumnPx={form.font_column_px}
              fontProductPx={form.font_product_px}
              pageBreakPerBlock={form.sort_mode === 'BY_BLOCK' ? form.page_break_per_block : false}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
