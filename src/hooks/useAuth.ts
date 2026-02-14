/**
 * Re-Export: Auth-State kommt aus AuthContext (gemeinsamer State für die gesamte App).
 * Verhindert Rollen-Flash bei Navigation (Profile bleibt erhalten).
 */
export { useAuth, type AuthState } from '@/contexts/AuthContext'
