// RulesPage: Bezeichnungsregeln (Obst/Gemüse) – Warengruppen nur noch unter „Warengruppen (Obst & Gemüse)“

import { useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, ArrowRight } from 'lucide-react'

import { useBezeichnungsregeln } from '@/hooks/useBezeichnungsregeln'
import { SchlagwortManager } from '@/components/plu/SchlagwortManager'

export function RulesPage() {
  const { data: regeln = [] } = useBezeichnungsregeln()
  const [showSchlagwortManager, setShowSchlagwortManager] = useState(false)

  return (
    <DashboardLayout>
      <div className="space-y-6" data-tour="obst-konfig-rules-page">
        {/* Header */}
        <div>
            <h2 className="text-2xl font-bold tracking-tight">Inhalt & Regeln</h2>
            <p className="text-sm text-muted-foreground">
              Bezeichnungsregeln für Produktnamen verwalten.
            </p>
        </div>

        {/* === BEZEICHNUNGSREGELN === */}
        <Card data-tour="obst-konfig-rules-keywords-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Bezeichnungsregeln</CardTitle>
              <CardDescription>
                Automatische Namensanpassungen (z.B. "Bio" immer vorne).
              </CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => setShowSchlagwortManager(true)}
              data-tour="obst-konfig-rules-add-button"
            >
              <Plus className="h-4 w-4 mr-1" /> Regel
            </Button>
          </CardHeader>
          <CardContent>
            {regeln.length === 0 ? (
              <p className="text-sm text-muted-foreground">Noch keine Regeln angelegt.</p>
            ) : (
              <div className="flex flex-wrap gap-2" data-tour="obst-konfig-rules-badge-list">
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
      </div>

      {/* Schlagwort-Manager Dialog */}
      <SchlagwortManager
        open={showSchlagwortManager}
        onOpenChange={setShowSchlagwortManager}
      />
    </DashboardLayout>
  )
}
