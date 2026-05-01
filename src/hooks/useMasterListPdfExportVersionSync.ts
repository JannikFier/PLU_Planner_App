import { useEffect, type Dispatch, type SetStateAction } from 'react'

/**
 * Setzt die im PDF-Dialog gewählte Version beim Öffnen (Snapshot vs. Live).
 */
export function useMasterListPdfExportVersionSync(options: {
  showPDFDialog: boolean
  isSnapshot: boolean
  resolvedVersionId: string | undefined
  activeVersionId: string | undefined
  setPdfExportVersionId: Dispatch<SetStateAction<string | undefined>>
}) {
  const { showPDFDialog, isSnapshot, resolvedVersionId, activeVersionId, setPdfExportVersionId } = options

  useEffect(() => {
    if (!showPDFDialog) {
      setPdfExportVersionId(undefined)
      return
    }
    if (isSnapshot && resolvedVersionId) {
      setPdfExportVersionId((prev) => prev ?? resolvedVersionId)
      return
    }
    if (activeVersionId) {
      setPdfExportVersionId((prev) => prev ?? activeVersionId)
    }
  }, [showPDFDialog, isSnapshot, resolvedVersionId, activeVersionId, setPdfExportVersionId])
}
