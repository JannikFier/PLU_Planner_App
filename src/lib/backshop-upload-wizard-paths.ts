// Routen-Strings für den mehrstufigen Backshop-Upload (ohne React, für Fast-Refresh taugliche Imports)

import type { BackshopExcelSource } from '@/lib/backshop-sources'

export const BACKSHOP_UPLOAD_WIZARD_BASE = '/super-admin/backshop-upload'

export function backshopUploadWizardPath(
  source: BackshopExcelSource,
  segment?: 'review' | 'assign' | 'preview' | 'done',
): string {
  const s = segment ? `/${segment}` : ''
  return `${BACKSHOP_UPLOAD_WIZARD_BASE}/${source}${s}`
}
