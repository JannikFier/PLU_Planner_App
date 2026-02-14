// ComingSoon: Generische Platzhalter-Seite für noch nicht implementierte Features

import { useNavigate } from 'react-router-dom'
import { DashboardLayout } from './DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Construction, ArrowLeft } from 'lucide-react'

interface ComingSoonProps {
  /** Titel der Seite */
  title: string
  /** Kurze Beschreibung was hier geplant ist */
  description: string
  /** In welcher Phase das Feature kommt */
  phase: number
}

/**
 * Platzhalter-Seite für Features die noch in Entwicklung sind.
 * Zeigt klar an, dass die Seite noch nicht fertig ist.
 */
export function ComingSoon({ title, description, phase }: ComingSoonProps) {
  const navigate = useNavigate()

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
            <p className="text-muted-foreground">{description}</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-muted-foreground">
              <Construction className="h-5 w-5" />
              In Entwicklung (Phase {phase})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Diese Funktion wird in Phase {phase} implementiert und ist bald verfügbar.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
