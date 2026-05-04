import { useState } from 'react'
import { KeyRound, Trash2 } from 'lucide-react'
import type { KioskRegister } from '@/hooks/useStoreKioskRegisters'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export type KioskRegisterRowEditorProps = {
  register: KioskRegister
  onSavePassword: (pw: string) => void
  onToggleActive: (active: boolean) => void
  onDelete: () => void
  saving: boolean
}

/**
 * Eine Kassen-Zeile wie im Kassenmodus: Deaktivieren, Passwort setzen, Löschen.
 */
export function KioskRegisterRowEditor({
  register,
  onSavePassword,
  onToggleActive,
  onDelete,
  saving,
}: KioskRegisterRowEditorProps) {
  const [pw, setPw] = useState('')
  const [pwOpen, setPwOpen] = useState(false)

  const cancelPasswordEdit = () => {
    setPw('')
    setPwOpen(false)
  }

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium">{register.display_label}</span>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={saving}
            onClick={() => onToggleActive(!register.active)}
          >
            {register.active ? 'Deaktivieren' : 'Aktivieren'}
          </Button>
          {!pwOpen && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={saving}
              onClick={() => setPwOpen(true)}
            >
              <KeyRound className="h-4 w-4 mr-1" aria-hidden />
              Passwort ändern
            </Button>
          )}
          <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {!register.active && <p className="text-xs text-muted-foreground">Deaktiviert – erscheint nicht an der Kasse.</p>}
      {pwOpen && (
        <div className="rounded-md border bg-muted/30 p-3 space-y-3">
          <p className="text-sm text-muted-foreground">
            Neues Passwort für diese Kasse setzen (mindestens 6 Zeichen).
          </p>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
            <div className="flex-1 space-y-1 min-w-0">
              <Label htmlFor={`kiosk-pw-${register.id}`}>Neues Passwort</Label>
              <Input
                id={`kiosk-pw-${register.id}`}
                type="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                autoComplete="new-password"
                disabled={saving}
              />
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <Button
                type="button"
                size="sm"
                disabled={saving || pw.length < 6}
                onClick={() => {
                  onSavePassword(pw)
                  cancelPasswordEdit()
                }}
              >
                Passwort speichern
              </Button>
              <Button type="button" variant="ghost" size="sm" disabled={saving} onClick={cancelPasswordEdit}>
                Abbrechen
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
