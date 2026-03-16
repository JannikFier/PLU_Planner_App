/**
 * Zugriff auf den aktuellen Markt-Kontext.
 * Alle Hooks die marktspezifische Daten laden nutzen currentStoreId hieraus.
 */
export { useStoreContext as useCurrentStore } from '@/contexts/StoreContext'
