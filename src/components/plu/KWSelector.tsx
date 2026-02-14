// KWSelector: Dropdown zur KW-Auswahl

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import type { Version } from '@/types/database'

interface KWSelectorProps {
  /** Alle verfügbaren Versionen */
  versions: Version[]
  /** Aktuell ausgewählte Version-ID */
  selectedId: string | undefined
  /** Callback wenn eine andere Version gewählt wird */
  onSelect: (versionId: string) => void
  /** Deaktiviert den Selector */
  disabled?: boolean
}

/** Status-Label für die Version */
function getStatusLabel(status: Version['status']) {
  switch (status) {
    case 'active':
      return <Badge variant="default" className="ml-2 text-xs">Aktiv</Badge>
    case 'draft':
      return <Badge variant="secondary" className="ml-2 text-xs">Entwurf</Badge>
    case 'frozen':
      return <Badge variant="outline" className="ml-2 text-xs">Archiv</Badge>
    default:
      return null
  }
}

/**
 * Dropdown zur Auswahl einer Kalenderwoche (Version).
 * Zeigt das KW-Label und den Status als Badge.
 */
export function KWSelector({ versions, selectedId, onSelect, disabled }: KWSelectorProps) {
  if (versions.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        Keine Versionen vorhanden
      </div>
    )
  }

  return (
    <Select value={selectedId ?? ''} onValueChange={onSelect} disabled={disabled}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="KW auswählen..." />
      </SelectTrigger>
      <SelectContent>
        {versions.map((version) => (
          <SelectItem key={version.id} value={version.id}>
            <span className="flex items-center">
              {version.kw_label}
              {getStatusLabel(version.status)}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
