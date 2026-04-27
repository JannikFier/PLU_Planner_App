import { useContext } from 'react'
import { BackshopUploadWizardContext, type BackshopUploadWizardContextValue } from '@/contexts/BackshopUploadWizardContext'

export type { BackshopUploadWizardContextValue }

export function useBackshopUploadWizard(): BackshopUploadWizardContextValue {
  const ctx = useContext(BackshopUploadWizardContext)
  if (!ctx) {
    throw new Error('useBackshopUploadWizard nur innerhalb von BackshopUploadWizardProvider verwenden.')
  }
  return ctx
}
