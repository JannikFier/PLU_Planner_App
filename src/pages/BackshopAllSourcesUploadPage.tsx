// Super-Admin: Übersicht der drei Backshop-Quellen – je eigener Wizard unter …/upload/:source

import { Link } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowRight, Upload } from 'lucide-react'
import {
  BACKSHOP_SOURCES,
  BACKSHOP_SOURCE_META,
  type BackshopExcelSource,
} from '@/lib/backshop-sources'
import { BACKSHOP_UPLOAD_WIZARD_BASE, backshopUploadWizardPath } from '@/lib/backshop-upload-wizard-paths'

export function BackshopAllSourcesUploadPage() {
  return (
    <DashboardLayout>
      <div className="w-full max-w-7xl mx-auto space-y-8 pb-10" data-tour="backshop-upload-overview-page">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">Backshop Upload</h2>
          <p className="text-muted-foreground mt-1 max-w-2xl">
            Wähle die Quelle (Kassenblatt Edeka, Harry oder Aryzta). Jede Quelle hat einen{' '}
            <strong className="font-medium text-foreground">eigenen Assistenten</strong>: Vergleich, Warengruppen,
            Vorschau und Einspielen – jeweils auf einer eigenen Seite, damit du dich nicht verläufst.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {BACKSHOP_SOURCES.map((source: BackshopExcelSource, idx: number) => {
            const meta = BACKSHOP_SOURCE_META[source]
            const uploadHref = backshopUploadWizardPath(source)
            const isFirst = idx === 0
            return (
              <Card
                key={source}
                className={`flex flex-col border-2 transition-shadow hover:shadow-md ${meta.borderClass}`}
                {...(isFirst ? { 'data-tour': 'backshop-upload-source-first-card' } : {})}
              >
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold border ${meta.bgClass} ${meta.textClass} ${meta.borderClass}`}
                    >
                      {meta.short} · {meta.label}
                    </span>
                    <Upload className="h-5 w-5 text-muted-foreground" aria-hidden />
                  </div>
                  <CardTitle className="text-lg pt-2">{meta.label} hochladen</CardTitle>
                  <CardDescription>
                    Excel (.xlsx/.xls) einspielen, mit der aktuellen Liste vergleichen und veröffentlichen.
                  </CardDescription>
                </CardHeader>
                <CardContent className="mt-auto pt-0">
                  <Button asChild className="w-full">
                    <Link
                      to={uploadHref}
                      {...(isFirst ? { 'data-tour': 'backshop-upload-source-start-button' } : {})}
                    >
                      {meta.label}-Upload starten
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <p className="text-xs text-muted-foreground">
          Technische URL pro Quelle:{' '}
          <code className="rounded bg-muted px-1 py-0.5">{BACKSHOP_UPLOAD_WIZARD_BASE}/edeka</code> (analog{' '}
          <code className="rounded bg-muted px-1 py-0.5">harry</code>, <code className="rounded bg-muted px-1 py-0.5">aryzta</code>).
        </p>
      </div>
    </DashboardLayout>
  )
}
