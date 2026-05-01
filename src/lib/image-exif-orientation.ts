/**
 * EXIF-Orientierung für Backshop-Bilder: Browser-Vorschau und PDF sollen übereinstimmen.
 * createImageBitmap(..., { imageOrientation: 'from-image' }) wendet EXIF an; jsPDF nutzt die Pixel daraus.
 */

const JPEG_QUALITY = 0.85

async function bitmapToJpegBlob(source: ImageBitmap): Promise<Blob | null> {
  const canvas = document.createElement('canvas')
  canvas.width = source.width
  canvas.height = source.height
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(source, 0, 0)
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), 'image/jpeg', JPEG_QUALITY)
  })
}

/** Fallback ohne createImageBitmap (oder nach dessen Fehler): Data-URL wie früher. */
async function blobToDataUrlViaImageElement(
  blob: Blob,
): Promise<{ dataUrl: string; width: number; height: number } | null> {
  try {
    const dataUrl = await new Promise<string | null>((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string | null)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
    if (!dataUrl) return null
    const { width, height } = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
      img.onerror = () => reject(new Error('Image load failed'))
      img.src = dataUrl
    })
    return { dataUrl, width, height }
  } catch {
    return null
  }
}

/**
 * Bildbytes mit EXIF-Orientierung in quadratisch zeichenbare Pixel bringen; PNG für jsPDF.addImage.
 */
export async function blobToOrientationCorrectedPngDataUrl(
  blob: Blob,
): Promise<{ dataUrl: string; width: number; height: number } | null> {
  try {
    if (typeof createImageBitmap === 'function') {
      const bmp = await createImageBitmap(blob, { imageOrientation: 'from-image' })
      try {
        const canvas = document.createElement('canvas')
        canvas.width = bmp.width
        canvas.height = bmp.height
        const ctx = canvas.getContext('2d')
        if (!ctx) return blobToDataUrlViaImageElement(blob)
        ctx.drawImage(bmp, 0, 0)
        const dataUrl = canvas.toDataURL('image/png')
        return { dataUrl, width: canvas.width, height: canvas.height }
      } finally {
        bmp.close()
      }
    }
  } catch {
    // Fallback
  }
  return blobToDataUrlViaImageElement(blob)
}

/**
 * Vor dem Storage-Upload: EXIF ausrichten und als JPEG speichern (üblich für Handy-Fotos).
 * Schlägt die Normalisierung fehl, wird die Originaldatei zurückgegeben.
 */
export async function normalizeImageFileForBackshopUpload(file: File): Promise<File> {
  const mime = file.type?.toLowerCase() ?? ''
  if (!mime.startsWith('image/')) return file
  try {
    if (typeof createImageBitmap !== 'function') return file
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
    try {
      const jpegBlob = await bitmapToJpegBlob(bmp)
      if (!jpegBlob) return file
      const base = file.name.replace(/\.[^.]+$/, '') || 'image'
      return new File([jpegBlob], `${base}.jpg`, { type: 'image/jpeg', lastModified: Date.now() })
    } finally {
      bmp.close()
    }
  } catch {
    return file
  }
}
