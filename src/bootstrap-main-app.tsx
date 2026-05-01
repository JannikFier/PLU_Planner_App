import type { Root } from 'react-dom/client'
import { StoreProvider } from '@/contexts/StoreContext'
import { UserPreviewProvider } from '@/contexts/UserPreviewContext'
import { AuthProvider } from '@/contexts/AuthContext'
import App from '@/App'

/**
 * Volle App mit Auth/Store – dynamisch von main.tsx importiert, damit /kasse/:token
 * den großen App-Bundle nicht mitlädt.
 */
export function renderMainApp(root: Root) {
  root.render(
    <AuthProvider>
      <StoreProvider>
        <UserPreviewProvider>
          <App />
        </UserPreviewProvider>
      </StoreProvider>
    </AuthProvider>,
  )
}
