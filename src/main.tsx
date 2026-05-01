import { createRoot } from 'react-dom/client'
import { initErrorReporting, captureError } from '@/lib/error-reporting'
import { isBareKasseEntrancePath } from '@/lib/kasse-bare-entry'
import { KasseEntranceShell } from '@/components/KasseEntranceShell'
import './index.css'

initErrorReporting()

// Supabase-Origin früh verbinden (weniger Latenz beim ersten RPC nach App-Start)
try {
  const raw = import.meta.env.VITE_SUPABASE_URL as string | undefined
  if (raw && typeof document !== 'undefined') {
    const origin = new URL(raw).origin
    if (!document.querySelector(`link[rel="preconnect"][href="${origin}"]`)) {
      const link = document.createElement('link')
      link.rel = 'preconnect'
      link.href = origin
      document.head.appendChild(link)
    }
  }
} catch {
  /* ignore */
}

window.addEventListener('unhandledrejection', (event) => {
  captureError(event.reason, { type: 'unhandledrejection' })
})

window.onerror = (message, source, lineno, colno, error) => {
  captureError(error ?? message, { source, lineno, colno })
}

const rootEl = document.getElementById('root')!
const root = createRoot(rootEl)

if (isBareKasseEntrancePath()) {
  root.render(<KasseEntranceShell />)
} else {
  void import('@/bootstrap-main-app').then(({ renderMainApp }) => {
    renderMainApp(root)
  })
}
