// RulesPage: Bezeichnungsregeln + Warengruppen verwalten

import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Plus, ArrowRight, Info, Settings, ExternalLink } from 'lucide-react'

import { useBezeichnungsregeln } from '@/hooks/useBezeichnungsregeln'
import { useLayoutSettings } from '@/hooks/useLayoutSettings'
import { SchlagwortManager } from '@/components/plu/SchlagwortManager'
import { WarengruppenPanel } from '@/components/plu/WarengruppenPanel'

export function RulesPage() {
  const navigate = useNavigate()
  const { data: regeln = [] } = useBezeichnungsregeln()
  const { data: layoutSettings } = useLayoutSettings()
  const [showSchlagwortManager, setShowSchlagwortManager] = useState(false)

  const isByBlock = layoutSettings?.sort_mode === 'BY_BLOCK'

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/super-admin')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Inhalt & Regeln</h2>
            <p className="text-sm text-muted-foreground">
              Bezeichnungsregeln und Warengruppen verwalten.
            </p>
          </div>
        </div>

        {/* === BEZEICHNUNGSREGELN === */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Bezeichnungsregeln</CardTitle>
              <CardDescription>
                Automatische Namensanpassungen (z.B. "Bio" immer vorne).
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

        {/* === WARENGRUPPEN === */}
        {isByBlock ? (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Warengruppen</CardTitle>
                <CardDescription>
                  Produkte in logische Gruppen einteilen und zuweisen.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <WarengruppenPanel />
              </CardContent>
            </Card>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate('/super-admin/block-sort')}
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
                    Warengruppen werden nur angezeigt wenn die Sortierung auf{' '}
                    <strong>"Nach Warengruppen"</strong> eingestellt ist.
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/super-admin/layout">
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

      {/* Schlagwort-Manager Dialog */}
      <SchlagwortManager
        open={showSchlagwortManager}
        onOpenChange={setShowSchlagwortManager}
      />
    </DashboardLayout>
  )
}
