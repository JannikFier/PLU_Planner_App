// Layout: Provider, Schritt-Leiste, Outlet für die einzelnen Wizard-Seiten.

import { Outlet, Navigate, useLocation, useParams, Link } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { BackshopUploadWizardProvider } from '@/contexts/BackshopUploadWizardContext'
import { useBackshopUploadWizard } from '@/hooks/useBackshopUploadWizard'
import { BACKSHOP_UPLOAD_WIZARD_BASE, backshopUploadWizardPath } from '@/lib/backshop-upload-wizard-paths'
import { BACKSHOP_SOURCE_META, isBackshopExcelSource } from '@/lib/backshop-sources'
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'
import type { BackshopExcelSource } from '@/lib/backshop-sources'

const WIZARD_STEPS: { segment: '' | 'review' | 'assign' | 'preview' | 'done'; label: string; stepIndex: number }[] = [
  { segment: '', label: 'Datei & KW', stepIndex: 1 },
  { segment: 'review', label: 'Vergleich', stepIndex: 2 },
  { segment: 'assign', label: 'Warengruppen', stepIndex: 3 },
  { segment: 'preview', label: 'Vorschau', stepIndex: 4 },
  { segment: 'done', label: 'Erfolg', stepIndex: 5 },
]

function WizardStepperInner({ source }: { source: BackshopExcelSource }) {
  const { step, publishResult, reset } = useBackshopUploadWizard()
  const { pathname } = useLocation()
  const afterSuccess = publishResult != null && step >= 5

  return (
    <nav aria-label="Upload-Schritte" className="w-full overflow-x-auto pb-2" data-tour="backshop-upload-wizard-stepper">
      <ol className="flex flex-wrap items-center gap-2 sm:gap-1 min-w-0">
        {WIZARD_STEPS.map((s, i) => {
          const href = s.segment ? backshopUploadWizardPath(source, s.segment) : backshopUploadWizardPath(source)
          const isActive =
            (s.segment === '' && (pathname.endsWith(`/${source}`) || pathname.endsWith(`/${source}/`))) ||
            (s.segment !== '' && pathname.includes(`/${source}/${s.segment}`))
          const isDone = step > s.stepIndex
          const canVisit = afterSuccess
            ? s.segment === 'done' || s.segment === ''
            : s.stepIndex <= step
          const content = (
            <>
              <span
                className={cn(
                  'flex h-5 w-5 items-center justify-center rounded-full text-[10px]',
                  isActive && 'bg-primary text-primary-foreground',
                  !isActive && isDone && 'bg-green-600 text-white',
                  !isActive && !isDone && 'bg-muted-foreground/20 text-muted-foreground',
                )}
              >
                {isDone && !isActive ? <Check className="h-3 w-3" /> : s.stepIndex}
              </span>
              <span className="whitespace-nowrap">{s.label}</span>
            </>
          )
          const pillClass = cn(
            'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors sm:px-3',
            isActive && 'border-primary bg-primary/10 text-primary ring-1 ring-primary/20',
            !isActive && isDone && canVisit && 'border-green-200 bg-green-50 text-green-800',
            !isActive && !isDone && canVisit && 'border-border bg-muted/40 text-muted-foreground hover:bg-muted/60',
            !canVisit && 'border-dashed border-border bg-muted/20 text-muted-foreground cursor-not-allowed opacity-70',
          )
          return (
            <li key={s.segment || 'upload'} className="flex items-center gap-1 sm:gap-2 shrink-0">
              {i > 0 && <span className="text-muted-foreground/50 hidden sm:inline" aria-hidden>|</span>}
              {canVisit ? (
                <Link
                  to={href}
                  className={pillClass}
                  onClick={
                    afterSuccess && s.segment === ''
                      ? () => {
                          reset()
                        }
                      : undefined
                  }
                >
                  {content}
                </Link>
              ) : (
                <span className={pillClass} aria-disabled title="Schritt noch nicht erreicht">
                  {content}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

function WizardShell({ source }: { source: BackshopExcelSource }) {
  const meta = BACKSHOP_SOURCE_META[source]
  return (
    <div
      className="flex flex-col w-full space-y-6 min-h-[calc(100vh-8rem)] max-w-7xl mx-auto px-1"
      data-tour="backshop-upload-wizard"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-2xl font-bold tracking-tight">
            {meta.label} · Backshop-Upload
          </h2>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border ${meta.bgClass} ${meta.textClass} ${meta.borderClass}`}
          >
            {meta.short} · {meta.label}
          </span>
        </div>
        <Link
          to={BACKSHOP_UPLOAD_WIZARD_BASE}
          className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline shrink-0"
        >
          Zurück zur Quellen-Übersicht
        </Link>
      </div>
      <WizardStepperInner source={source} />
      <Outlet />
    </div>
  )
}

export function BackshopUploadWizardLayout() {
  const { source: raw } = useParams<{ source: string }>()
  if (!raw || !isBackshopExcelSource(raw)) {
    return <Navigate to={BACKSHOP_UPLOAD_WIZARD_BASE} replace />
  }
  const source = raw
  return (
    <BackshopUploadWizardProvider source={source}>
      <DashboardLayout>
        <WizardShell source={source} />
      </DashboardLayout>
    </BackshopUploadWizardProvider>
  )
}
