import { createRoot } from 'react-dom/client'
import { StoreProvider } from '@/contexts/StoreContext'
import { AuthProvider } from '@/contexts/AuthContext'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StoreProvider>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StoreProvider>,
)
