import { createRoot } from 'react-dom/client'
import { StoreProvider } from '@/contexts/StoreContext'
import { UserPreviewProvider } from '@/contexts/UserPreviewContext'
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
      <UserPreviewProvider>
        <App />
      </UserPreviewProvider>
    </StoreProvider>
  </AuthProvider>,
)
