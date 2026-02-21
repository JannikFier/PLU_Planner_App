// BackshopRulesPage: Bezeichnungsregeln + Warengruppen für Backshop

import { useState, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Plus, ArrowRight, ExternalLink, Info, Settings, Trash2, Loader2 } from 'lucide-react'

import { useBackshopBezeichnungsregeln } from '@/hooks/useBackshopBezeichnungsregeln'
import { useBackshopLayoutSettings } from '@/hooks/useBackshopLayoutSettings'
import { useActiveBackshopVersion } from '@/hooks/useActiveBackshopVersion'
import { useBackshopPLUData } from '@/hooks/useBackshopPLUData'
import {
  useBackshopBlocks,
  useBackshopBlockRules,
  useCreateBackshopBlockRule,
  useDeleteBackshopBlockRule,
  useAssignBackshopProducts,
} from '@/hooks/useBackshopBlocks'
import { BackshopSchlagwortManager } from '@/components/plu/BackshopSchlagwortManager'
import { BackshopWarengruppenPanel } from '@/components/plu/BackshopWarengruppenPanel'
import { applyBackshopBlockRules } from '@/lib/apply-backshop-block-rules'

export function BackshopRulesPage() {
  const navigate = useNavigate()
  const { data: regeln = [] } = useBackshopBezeichnungsregeln()
  const { data: layoutSettings } = useBackshopLayoutSettings()
  const { data: activeVersion } = useActiveBackshopVersion()
  const { data: masterItems = [] } = useBackshopPLUData(activeVersion?.id)
  const { data: blocks = [] } = useBackshopBlocks()
  const { data: blockRules = [] } = useBackshopBlockRules()
  const createBlockRule = useCreateBackshopBlockRule()
  const deleteBlockRule = useDeleteBackshopBlockRule()
  const assignProducts = useAssignBackshopProducts()

  const [showSchlagwortManager, setShowSchlagwortManager] = useState(false)
  const [showAddBlockRuleDialog, setShowAddBlockRuleDialog] = useState(false)
  const [newRuleKeyword, setNewRuleKeyword] = useState('')
  const [newRuleBlockId, setNewRuleBlockId] = useState<string>('')
  const [applyOnlyUnassigned, setApplyOnlyUnassigned] = useState(true)
  const [isApplying, setIsApplying] = useState(false)

  const nameContainsRules = blockRules.filter((r) => r.rule_type === 'NAME_CONTAINS')
  const sortedBlocks = [...blocks].sort((a, b) => a.order_index - b.order_index)

  const handleAddBlockRule = useCallback(async () => {
    if (!newRuleKeyword.trim() || !newRuleBlockId) return
    try {
      await createBlockRule.mutateAsync({
        block_id: newRuleBlockId,
        rule_type: 'NAME_CONTAINS',
        value: newRuleKeyword.trim(),
        case_sensitive: false,
      })
      setNewRuleKeyword('')
      setNewRuleBlockId(sortedBlocks[0]?.id ?? '')
      setShowAddBlockRuleDialog(false)
      toast.success('Zuordnungsregel angelegt')
    } catch {
      toast.error('Fehler beim Anlegen')
    }
  }, [newRuleKeyword, newRuleBlockId, createBlockRule, sortedBlocks])

  const handleDeleteBlockRule = useCallback(
    async (id: string) => {
      try {
        await deleteBlockRule.mutateAsync(id)
        toast.success('Regel gelöscht')
      } catch {
        toast.error('Fehler beim Löschen')
      }
    },
    [deleteBlockRule],
  )

  const handleApplyBlockRules = useCallback(async () => {
    if (nameContainsRules.length === 0) {
      toast.error('Keine Zuordnungsregeln vorhanden.')
      return
    }
    setIsApplying(true)
    try {
      const changes = applyBackshopBlockRules(masterItems, blockRules, applyOnlyUnassigned)
      if (changes.size === 0) {
        toast.info('Keine Produkte wurden durch die Regeln zugeordnet.')
        return
      }
      const byBlock = new Map<string, string[]>()
      for (const [itemId, blockId] of changes) {
        const list = byBlock.get(blockId) ?? []
        list.push(itemId)
        byBlock.set(blockId, list)
      }
      for (const [blockId, itemIds] of byBlock) {
        await assignProducts.mutateAsync({ itemIds, blockId })
      }
      toast.success(`${changes.size} Produkt(e) zugeordnet`)
    } catch {
      toast.error('Fehler beim Anwenden der Regeln')
    } finally {
      setIsApplying(false)
    }
  }, [masterItems, blockRules, applyOnlyUnassigned, nameContainsRules.length, assignProducts])

  const isByBlock = layoutSettings?.sort_mode === 'BY_BLOCK'
  const unassignedCount = masterItems.filter((i) => i.block_id == null).length

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
            <h2 className="text-2xl font-bold tracking-tight">Inhalt & Regeln (Backshop)</h2>
            <p className="text-sm text-muted-foreground">
              Bezeichnungsregeln und Warengruppen für die Backshop-Liste.
            </p>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Bezeichnungsregeln</CardTitle>
              <CardDescription>
                Automatische Namensanpassungen (z.B. &quot;Bio&quot; immer vorne).
              </CardDescription>
            </div>
            <Button size="sm" onClick={() => setShowSchlagwortManager(true)}>
              <Plus className="h-4 w-4 mr-1" /> Regel
            </Button>
          </CardHeader>
          <CardContent>
            {regeln.length === 0 ? (
              <p className="text-sm text-muted-foreground">Noch keine Regeln angelegt.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {regeln.map((regel) => (
                  <Badge
                    key={regel.id}
                    variant={regel.is_active ? 'default' : 'secondary'}
                    className="flex items-center gap-1.5 px-2.5 py-1 cursor-pointer"
                    onClick={() => setShowSchlagwortManager(true)}
                  >
                    <span className="font-medium">{regel.keyword}</span>
                    <ArrowRight className="h-3 w-3" />
                    <span className="text-xs">{regel.position === 'PREFIX' ? 'Vorne' : 'Hinten'}</span>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Zuordnung nach Schlagwort</CardTitle>
              <CardDescription>
                Regeln: Wenn der Produktname ein Schlagwort enthält, wird die Warengruppe automatisch zugewiesen. Mit &quot;Regeln jetzt anwenden&quot; ausführen.
              </CardDescription>
            </div>
            <Button size="sm" onClick={() => { setNewRuleKeyword(''); setNewRuleBlockId(sortedBlocks[0]?.id ?? ''); setShowAddBlockRuleDialog(true) }}>
              <Plus className="h-4 w-4 mr-1" /> Regel
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {nameContainsRules.length === 0 ? (
              <p className="text-sm text-muted-foreground">Noch keine Zuordnungsregeln. Leg eine Regel an (Schlagwort → Warengruppe) und wende sie an.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {nameContainsRules.map((rule) => {
                  const block = blocks.find((b) => b.id === rule.block_id)
                  return (
                    <Badge
                      key={rule.id}
                      variant="secondary"
                      className="flex items-center gap-1.5 px-2.5 py-1"
                    >
                      <span className="font-medium">&quot;{rule.value}&quot;</span>
                      <ArrowRight className="h-3 w-3" />
                      <span className="text-xs">{block?.name ?? '?'}</span>
                      <button
                        type="button"
                        className="ml-1 rounded hover:bg-muted p-0.5"
                        onClick={() => handleDeleteBlockRule(rule.id)}
                        aria-label="Regel löschen"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </Badge>
                  )
                })}
              </div>
            )}
            <div className="flex flex-col gap-2 pt-2 border-t border-border">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={applyOnlyUnassigned}
                  onCheckedChange={(v) => setApplyOnlyUnassigned(v === true)}
                />
                Nur unzugeordnete Produkte zuordnen (bestehende Zuordnung bleibt)
              </label>
              <Button
                size="sm"
                onClick={handleApplyBlockRules}
                disabled={nameContainsRules.length === 0 || isApplying}
              >
                {isApplying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Regeln jetzt anwenden
              </Button>
            </div>
          </CardContent>
        </Card>

        {isByBlock ? (
          <div className="space-y-6">
            {unassignedCount > 0 && (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
                <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <p className="text-sm">
                  <strong>{unassignedCount} Artikel</strong> sind noch keiner Warengruppe zugeordnet. Bitte unten im Bereich Warengruppen die Zuordnung vornehmen.
                </p>
              </div>
            )}
            <Card>
              <CardHeader>
                <CardTitle>Warengruppen</CardTitle>
                <CardDescription>
                  Produkte in logische Gruppen einteilen und zuweisen.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BackshopWarengruppenPanel />
              </CardContent>
            </Card>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate('/super-admin/backshop-block-sort')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Liste interaktiv bearbeiten
            </Button>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Warengruppen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border border-border">
                <Info className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Warengruppen werden nur angezeigt, wenn die Sortierung auf{' '}
                    <strong>&quot;Nach Warengruppen&quot;</strong> eingestellt ist.
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/super-admin/backshop-layout">
                      <Settings className="h-4 w-4 mr-2" />
                      Zu den Layout-Einstellungen
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={showAddBlockRuleDialog} onOpenChange={setShowAddBlockRuleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Zuordnungsregel (Schlagwort → Warengruppe)</DialogTitle>
            <DialogDescription>
              Wenn der Produktname das Schlagwort enthält, wird die Warengruppe zugewiesen.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Schlagwort</Label>
              <Input
                value={newRuleKeyword}
                onChange={(e) => setNewRuleKeyword(e.target.value)}
                placeholder="z.B. Croissant"
              />
            </div>
            <div className="space-y-2">
              <Label>Warengruppe</Label>
              <Select value={newRuleBlockId} onValueChange={setNewRuleBlockId}>
                <SelectTrigger>
                  <SelectValue placeholder="Warengruppe wählen" />
                </SelectTrigger>
                <SelectContent>
                  {sortedBlocks.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddBlockRuleDialog(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={handleAddBlockRule}
              disabled={createBlockRule.isPending || !newRuleKeyword.trim() || !newRuleBlockId}
            >
              {createBlockRule.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Anlegen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BackshopSchlagwortManager open={showSchlagwortManager} onOpenChange={setShowSchlagwortManager} />
    </DashboardLayout>
  )
}
