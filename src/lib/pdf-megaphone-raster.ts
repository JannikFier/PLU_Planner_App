/**
 * Megafon für PDF: einmal als PNG rasterisieren (Lucide-Pfade wie in der App).
 * Viele Viewer zeigen dünne jsPDF-Linien falsch oder gar nicht; eingebettetes Bild ist zuverlässig.
 */

export type MegaphonePdfRaster = {
  dataUrl: string
  /** Quadratisch (Breite = Höhe) für addImage */
  sizePx: number
}

let cache: MegaphonePdfRaster | null | undefined

/** Lucide "megaphone" (v0.563) – dieselben path-d wie im UI-Icon */
const LUCIDE_MEGAPHONE_PATHS = [
  'M11 6a13 13 0 0 0 8.4-2.8A1 1 0 0 1 21 4v12a1 1 0 0 1-1.6.8A13 13 0 0 0 11 14H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z',
  'M6 14a12 12 0 0 0 2.4 7.2 2 2 0 0 0 3.2-2.4A8 8 0 0 1 10 14',
  'M8 6v8',
] as const

const VIEWBOX = 24
const RASTER_PX = 64

/**
 * Liefert Data-URL (PNG) oder null (SSR / kein Canvas / Fehler) – dann Vektor-Fallback im PDF.
 */
export function loadMegaphoneIconRaster(): MegaphonePdfRaster | null {
  if (cache !== undefined) return cache
  if (typeof document === 'undefined') {
    cache = null
    return null
  }
  try {
    const canvas = document.createElement('canvas')
    canvas.width = RASTER_PX
    canvas.height = RASTER_PX
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      cache = null
      return null
    }
    const scale = RASTER_PX / VIEWBOX
    ctx.clearRect(0, 0, RASTER_PX, RASTER_PX)
    ctx.scale(scale, scale)
    ctx.strokeStyle = 'rgb(153, 27, 27)'
    ctx.lineWidth = 1.35
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    for (const d of LUCIDE_MEGAPHONE_PATHS) {
      const p = new Path2D(d)
      ctx.stroke(p)
    }
    const dataUrl = canvas.toDataURL('image/png')
    cache = { dataUrl, sizePx: RASTER_PX }
    return cache
  } catch {
    cache = null
    return null
  }
}
