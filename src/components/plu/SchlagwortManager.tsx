// SchlagwortManager: Dialog für Bezeichnungsregeln mit Live-Preview

import { useState, useMemo, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Pencil, Trash2, Plus, Loader2, Tag, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

import {
  useBezeichnungsregeln,
  useCreateBezeichnungsregel,
  useUpdateBezeichnungsregel,
  useDeleteBezeichnungsregel,
  useApplyAllRules,
} from '@/hooks/useBezeichnungsregeln'
import { useActiveVersion } from '@/hooks/useActiveVersion'
import { usePLUData } from '@/hooks/usePLUData'
import { useAuth } from '@/hooks/useAuth'
import {
  normalizeKeywordInName,
  isAlreadyCorrect,
  nameContainsKeyword,
} from '@/lib/keyword-rules'
import type { Bezeichnungsregel } from '@/types/database'

interface SchlagwortManagerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SchlagwortManager({ open, onOpenChange }: SchlagwortManagerProps) {
  const { user } = useAuth()
  const { data: regeln = [] } = useBezeichnungsregeln()
  const { data: activeVersion } = useActiveVersion()
  const { data: items = [] } = usePLUData(activeVersion?.id)
  const createMutation = useCreateBezeichnungsregel()
  const updateMutation = useUpdateBezeichnungsregel()
  const deleteMutation = useDeleteBezeichnungsregel()
  const applyAllMutation = useApplyAllRules()

  // Formular-State
  const [keyword, setKeyword] = useState('')
  const [position, setPosition] = useState<'PREFIX' | 'SUFFIX'>('PREFIX')
  const [editingId, setEditingId] = useState<string | null>(null)

  // Live-Feedback: Produkte die das Keyword enthalten
  const matchingItems = useMemo(() => {
    if (!keyword.trim()) return []
    return items.filter((item) => nameContainsKeyword(item.system_name, keyword.trim()))
  }, [items, keyword])

  // Davon: welche werden tatsächlich geändert (sind noch nicht korrekt positioniert)
  const changedItems = useMemo(() => {
    if (!keyword.trim()) return []
    return matchingItems.filter(
      (item) => !isAlreadyCorrect(item.system_name, keyword.trim(), position),
    )
  }, [matchingItems, keyword, position])

  // Vorher → Nachher Preview
  const previewList = useMemo(() => {
    if (!keyword.trim()) return []
    return matchingItems.map((item) => ({
      item,
      before: item.system_name,
      after: normalizeKeywordInName(item.system_name, keyword.trim(), position),
      changed: !isAlreadyCorrect(item.system_name, keyword.trim(), position),
    }))
  }, [matchingItems, keyword, position])

  const resetForm = useCallback(() => {
    setKeyword('')
    setPosition('PREFIX')
    setEditingId(null)
  }, [])

  const handleAddOrUpdate = async () => {
    if (!keyword.trim()) return
    try {
      if (editingId) {
        await updateMutation.mutateAsync({
          id: editingId,
          keyword: keyword.trim(),
          position,
        })
        toast.success('Regel aktualisiert')
      } else {
        await createMutation.mutateAsync({
          keyword: keyword.trim(),
          position,
          created_by: user?.id ?? null,
        })
        toast.success('Regel hinzugefügt')
      }
      // Regeln sofort anwenden
      await applyAllMutation.mutateAsync()
      resetForm()
    } catch {
      toast.error('Fehler beim Speichern der Regel')
    }
  }

  const handleEdit = (regel: Bezeichnungsregel) => {
    setKeyword(regel.keyword)
    setPosition(regel.position)
    setEditingId(regel.id)
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id)
      toast.success('Regel gelöscht')
      if (editingId === id) resetForm()
    } catch {
      toast.error('Fehler beim Löschen')
    }
  }

  const handleApplyAll = async () => {
    try {
      const result = await applyAllMutation.mutateAsync()
      toast.success(`${result.updatedCount} Produkte aktualisiert`)
    } catch {
      toast.error('Fehler beim Anwenden')
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending || applyAllMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Schlagwort-Manager
          </DialogTitle>
          <DialogDescription>
            Definiere globale Regeln, um Schlagwörter einheitlich am Anfang oder Ende anzuzeigen.
          </DialogDescription>
        </DialogHeader>

        {/* Aktive Regeln als Badges */}
        {regeln.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Aktive Regeln:</Label>
            <div className="flex flex-wrap gap-2">
              {regeln.map((regel) => (
                <Badge
                  key={regel.id}
                  variant={regel.is_active ? 'default' : 'secondary'}
                  className="flex items-center gap-1.5 px-2.5 py-1"
                >
                  <span className="font-medium">{regel.keyword}</span>
                  <ArrowRight className="h-3 w-3" />
                  <span className="text-xs">{regel.position === 'PREFIX' ? 'Vorne' : 'Hinten'}</span>
                  <button
                    onClick={() => handleEdit(regel)}
                    className="ml-1 hover:text-primary-foreground/80"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => handleDelete(regel.id)}
                    className="hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* Neue Regel erstellen / bearbeiten */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">
            {editingId ? 'Regel bearbeiten' : 'Neue Regel erstellen'}
          </h4>

          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-2">
              <Label>Schlagwort eingeben</Label>
              <Input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder='z.B. "Bio" oder "Pilze"'
              />
            </div>
            <Button
              onClick={handleAddOrUpdate}
              disabled={isSaving || !keyword.trim()}
              size="sm"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : editingId ? (
                'Aktualisieren'
              ) : (
                <><Plus className="h-4 w-4 mr-1" /> Hinzufügen</>
              )}
            </Button>
            {editingId && (
              <Button variant="ghost" size="sm" onClick={resetForm}>
                Abbrechen
              </Button>
            )}
          </div>

          {/* Live-Feedback */}
          {keyword.trim() && (
            <div className="space-y-2">
              <div className="flex gap-4 text-sm">
                <span>
                  <strong>{matchingItems.length}</strong> Produkte enthalten{' '}
                  <span className="font-mono text-xs bg-muted px-1 py-0.5 rounded">
                    {keyword.trim()}
                  </span>
                </span>
                <span>
                  <strong>{changedItems.length}</strong> davon werden geändert
                </span>
              </div>

              {/* Position-Auswahl */}
              <div className="space-y-2">
                <Label className="text-xs">Position des Schlagworts:</Label>
                <div className="flex gap-2">
                  <Button
                    variant={position === 'PREFIX' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPosition('PREFIX')}
                  >
                    Vorne anzeigen
                  </Button>
                  <Button
                    variant={position === 'SUFFIX' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPosition('SUFFIX')}
                  >
                    Hinten anzeigen
                  </Button>
                </div>
              </div>

              {/* Vorher → Nachher Liste */}
              {previewList.length > 0 && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Alle {previewList.length} Änderungen:
                  </Label>
                  <ScrollArea className="h-[320px] rounded border border-border">
                    <div className="p-2 space-y-1 min-w-0">
                      {previewList.map((entry) => (
                        <div
                          key={entry.item.id}
                          className={cn(
                            'flex items-start gap-2 text-xs px-2 py-1.5 rounded',
                            entry.changed ? 'bg-amber-50 dark:bg-amber-950/20' : 'bg-muted/30',
                          )}
                        >
                          <span className="flex-1 min-w-0 break-words font-mono">{entry.before}</span>
                          <ArrowRight className="h-3 w-3 shrink-0 mt-0.5 text-muted-foreground" />
                          <span
                            className={cn(
                              'flex-1 min-w-0 break-words font-mono',
                              entry.changed ? 'font-semibold text-amber-700 dark:text-amber-400' : '',
                            )}
                          >
                            {entry.after}
                          </span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Schließen
          </Button>
          <Button
            onClick={handleApplyAll}
            disabled={applyAllMutation.isPending || regeln.length === 0}
          >
            {applyAllMutation.isPending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Wird angewandt...</>
            ) : (
              'Alle Regeln anwenden'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
