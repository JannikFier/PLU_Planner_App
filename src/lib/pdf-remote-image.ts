// Gemeinsame Remote-Bild-Ladung für PDF-Exporte (CORS, EXIF-Ausrichtung)

import { blobToOrientationCorrectedPngDataUrl } from '@/lib/image-exif-orientation'

/** Lädt ein Bild per URL und liefert PNG-Data-URL plus Pixelmaße; bei Fehler null. */
export async function loadRemoteImageForPdf(
  url: string,
): Promise<{ dataUrl: string; width: number; height: number } | null> {
  try {
    const res = await fetch(url, { mode: 'cors', credentials: 'omit' })
    if (!res.ok) return null
    const blob = await res.blob()
    return await blobToOrientationCorrectedPngDataUrl(blob)
  } catch {
    return null
  }
}
