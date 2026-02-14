import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from '@/contexts/AuthContext'
import './index.css'
import App from './App.tsx'

// #region agent log – globale Fehler-Erfassung für proaktives Monitoring
const DEBUG_INGEST = 'http://127.0.0.1:7244/ingest/d1646c8f-788c-4220-8020-ca825d2ef16e'
function logError(location: string, message: string, data: Record<string, unknown>) {
  fetch(DEBUG_INGEST, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ location, message, data, timestamp: Date.now() }),
  }).catch(() => {})
}
window.onerror = (msg, src, line, col, err) => {
  logError('window.onerror', String(msg), { src, line, col, stack: err?.stack })
}
window.onunhandledrejection = (ev) => {
  const err = ev.reason
  logError('unhandledrejection', err?.message ?? String(err), { stack: err?.stack })
}
// #endregion

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
