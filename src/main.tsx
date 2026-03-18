import { createRoot } from 'react-dom/client'
import { StoreProvider } from '@/contexts/StoreContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { initErrorReporting, captureError } from '@/lib/error-reporting'
import './index.css'
import App from './App.tsx'

initErrorReporting()

window.addEventListener('unhandledrejection', (event) => {
  captureError(event.reason, { type: 'unhandledrejection' })
})

window.onerror = (message, source, lineno, colno, error) => {
  captureError(error ?? message, { source, lineno, colno })
}

createRoot(document.getElementById('root')!).render(
  <AuthProvider>
    <StoreProvider>
      <App />
    </StoreProvider>
  </AuthProvider>,
)
