import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { queryClient } from '@/lib/query-client'
import { Toaster } from '@/components/ui/sonner'
import { KasseBareBootstrapProvider } from '@/contexts/KasseBareBootstrapContext'
import { KasseEntrancePage } from '@/pages/KasseEntrancePage'

function routerBasename(): string | undefined {
  const base = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '')
  return base.length > 0 ? base : undefined
}

/**
 * Minimale Shell nur für öffentlichen Kassen-Link (ohne Auth/Store/volle Routen).
 */
export function KasseEntranceShell() {
  return (
    <KasseBareBootstrapProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter basename={routerBasename()}>
          <Routes>
            <Route path="/kasse/:entranceToken" element={<KasseEntrancePage />} />
          </Routes>
          <Toaster />
        </BrowserRouter>
      </QueryClientProvider>
    </KasseBareBootstrapProvider>
  )
}
