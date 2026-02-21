// Backshop: Bilder aus Excel extrahieren (ExcelJS, Fallback: ZIP/XML für MS-Excel-Dateien)

import ExcelJS from 'exceljs'
import JSZip from 'jszip'
import { supabase } from '@/lib/supabase'
import type { ParsedBackshopRow } from '@/types/plu'

const BUCKET = 'backshop-images'
/** Gültigkeit signierter URLs (1 Jahr), damit gespeicherte URLs lange funktionieren */
const SIGNED_URL_EXPIRES_IN = 60 * 60 * 24 * 365
/** Zielgröße für Skalierung (mind. so viele Pixel für schärfere Anzeige bei 96px). */
const RESIZE_TARGET = 192

/**
 * Skaliert ein Bild auf RESIZE_TARGET (längere Kante), erhält Seitenverhältnis.
 * Nutzt Canvas API; bei Fehler wird der Original-Buffer zurückgegeben.
 */
async function resizeImageToTarget(
  buffer: ArrayBuffer,
  extension: string
): Promise<{ buffer: ArrayBuffer; extension: string }> {
  const mime = extension === 'jpg' ? 'image/jpeg' : `image/${extension}`
  try {
    const blob = new Blob([buffer], { type: mime })
    const bitmap = await createImageBitmap(blob)
    const w = bitmap.width
    const h = bitmap.height
    if (w <= 0 || h <= 0) return { buffer, extension }

    const scale = RESIZE_TARGET / Math.max(w, h, 1)
    const outW = Math.max(1, Math.round(w * scale))
    const outH = Math.max(1, Math.round(h * scale))
    const canvas = new OffscreenCanvas(outW, outH)
    const ctx = canvas.getContext('2d')
    if (!ctx) return { buffer, extension }
    ctx.drawImage(bitmap, 0, 0, outW, outH)
    bitmap.close()

    const outBlob = await new Promise<Blob | null>((resolve) => {
      canvas.convertToBlob({ type: mime, quality: 0.9 }).then(resolve).catch(() => resolve(null))
    })
    if (!outBlob) return { buffer, extension }
    const outBuffer = await outBlob.arrayBuffer()
    return { buffer: outBuffer, extension }
  } catch {
    return { buffer, extension }
  }
}

export interface ExtractedImage {
  row: number
  col: number
  buffer: ArrayBuffer
  extension: string
}

/**
 * Fallback: Liest Bilder direkt aus der .xlsx als ZIP (xl/media + Drawing-XML).
 * Wird genutzt, wenn ExcelJS bei manchen MS-Excel-Dateien 0 Bilder liefert.
 * Liefert 0-basierte row/col wie der Hauptweg.
 */
async function extractImagesFromXlsxZip(arrayBuffer: ArrayBuffer): Promise<ExtractedImage[]> {
  const out: ExtractedImage[] = []
  try {
    const zip = await JSZip.loadAsync(arrayBuffer)
    // Erstes Worksheet finden (typisch sheet1.xml)
    const sheetNames = Object.keys(zip.files).filter((n) => n.match(/^xl\/worksheets\/sheet\d+\.xml$/))
    sheetNames.sort((a, b) => {
      const na = parseInt(a.replace(/^xl\/worksheets\/sheet(\d+)\.xml$/, '$1'), 10)
      const nb = parseInt(b.replace(/^xl\/worksheets\/sheet(\d+)\.xml$/, '$1'), 10)
      return na - nb
    })
    const sheetPath = sheetNames[0]
    if (!sheetPath) return out

    const sheetXml = await zip.file(sheetPath)?.async('string')
    if (!sheetXml) return out

    // Drawing-Relation: <drawing r:id="rId1"/> (oder mit anderem Präfix)
    const drawingIdMatch = sheetXml.match(/<drawing[^>]+r:id="(rId\d+)"|r:id='(rId\d+)'/) ?? sheetXml.match(/<drawing[^>]+id="(rId\d+)"/)
    const drawingRId = drawingIdMatch?.[1] ?? drawingIdMatch?.[2]
    if (!drawingRId) return out

    const sheetRelsPath = sheetPath.replace(/sheet\d+\.xml$/, '_rels/') + sheetPath.split('/').pop() + '.rels'
    const sheetRels = await zip.file(sheetRelsPath)?.async('string')
    if (!sheetRels) return out

    const drawingTargetMatch = sheetRels.match(new RegExp(`Id="${drawingRId}"[^>]+Target="([^"]+)"`)) ?? sheetRels.match(new RegExp(`Target="([^"]+)"[^>]+Id="${drawingRId}"`))
    const drawingTarget = drawingTargetMatch?.[1]
    if (!drawingTarget) return out
    const drawingPath = drawingTarget.startsWith('..') ? 'xl/drawings/' + drawingTarget.replace(/^\.\.\/drawings\//, '') : (drawingTarget.startsWith('xl/') ? drawingTarget : 'xl/drawings/' + drawingTarget)
    const drawingXml = await zip.file(drawingPath)?.async('string')
    if (!drawingXml) return out

    const drawingRelsPath = drawingPath.replace(/drawing\d+\.xml$/, '_rels/') + drawingPath.split('/').pop() + '.rels'
    const drawingRels = await zip.file(drawingRelsPath)?.async('string')
    if (!drawingRels) return out

    const rIdToTarget: Record<string, string> = {}
    for (const rel of drawingRels.matchAll(/Id="(rId\d+)"[^>]+Target="([^"]+)"/g)) rIdToTarget[rel[1]] = rel[2]
    for (const rel of drawingRels.matchAll(/Target="([^"]+)"[^>]+Id="(rId\d+)"/g)) rIdToTarget[rel[2]] = rel[1]

    const anchorBlocks: string[] = []
    for (const m of drawingXml.matchAll(/<xdr:oneCellAnchor>([\s\S]*?)<\/xdr:oneCellAnchor>/gi)) anchorBlocks.push(m[1])
    for (const m of drawingXml.matchAll(/<xdr:twoCellAnchor>([\s\S]*?)<\/xdr:twoCellAnchor>/gi)) anchorBlocks.push(m[1])
    for (const block of anchorBlocks) {
      const rowMatch = block.match(/<xdr:row>(\d+)<\/xdr:row>/) ?? block.match(/<row>(\d+)<\/row>/)
      const colMatch = block.match(/<xdr:col>(\d+)<\/xdr:col>/) ?? block.match(/<col>(\d+)<\/col>/)
      const embedMatch = block.match(/r:embed="(rId\d+)"|embed="(rId\d+)"/)
      if (!rowMatch || !colMatch || !embedMatch) continue
      const row = Math.max(0, parseInt(rowMatch[1], 10))
      const col = Math.max(0, parseInt(colMatch[1], 10))
      const rId = embedMatch[1] ?? embedMatch[2]
      const target = rIdToTarget[rId] ?? ''
      const mediaRelative = target.replace(/^\.\.\/media\//, '').replace(/^media\//, '') || target.split('/').pop() || 'image.png'
      const mediaPath = target.startsWith('xl/') ? target : 'xl/media/' + mediaRelative
      const file = zip.file(mediaPath) ?? zip.file('xl/media/' + mediaRelative)
      if (!file) continue
      const buffer = await file.async('arraybuffer')
      const ext = (mediaPath.split('.').pop() || 'png').toLowerCase().replace(/jpeg/, 'jpg')
      const extension = ext === 'jpg' || ext === 'jpeg' || ext === 'png' ? ext : 'png'
      out.push({ row, col, buffer, extension: extension === 'jpeg' ? 'jpg' : extension })
    }
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[Backshop-Bilder] ZIP-Fallback Fehler:', e)
  }
  return out
}

/**
 * Hilfsfunktion: Media-Buffer in ArrayBuffer + Extension umwandeln.
 */
function mediaItemToBufferAndExt(
  mediaItem: { buffer: ArrayBuffer | Uint8Array | { buffer: ArrayBuffer }; extension: string }
): { buffer: ArrayBuffer; extension: string } {
  const raw = mediaItem.buffer
  const buf: ArrayBufferLike =
    raw instanceof ArrayBuffer
      ? raw
      : raw instanceof Uint8Array
        ? raw.buffer
        : typeof (raw as { buffer?: ArrayBuffer }).buffer !== 'undefined'
          ? (raw as { buffer: ArrayBuffer }).buffer
          : new Uint8Array((raw as Uint8Array) as ArrayLike<number>).buffer
  const extension = (mediaItem.extension && mediaItem.extension.toLowerCase().replace(/^\./, '')) || 'png'
  const ext = extension === 'jpeg' || extension === 'jpg' ? 'jpg' : extension === 'png' ? 'png' : 'png'
  return { buffer: buf as ArrayBuffer, extension: ext }
}

/**
 * Liest eingebettete Bilder aus einer Backshop-Excel-Datei.
 * 1) ExcelJS (getImages + model.media);
 * 2) Fallback: model.media vorhanden, aber getImages() leer (z. B. .xls→.xlsx) → Medien an Parser-Zeilen (Reihenfolge) zuordnen;
 * 3) Fallback: direkte ZIP/XML-Extraktion.
 * @param parsedRows - Optional; für Fallback 2 nötig (Zuordnung Medien ↔ Zeilen).
 */
export async function extractImagesFromBackshopExcel(
  file: File,
  parsedRows?: ParsedBackshopRow[]
): Promise<ExtractedImage[]> {
  const arrayBuffer = await file.arrayBuffer()
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(arrayBuffer as never)

  const sheet = workbook.worksheets[0]
  if (import.meta.env.DEV) {
    console.log('[Backshop-Bilder Diagnose] Sheet:', sheet ? 'vorhanden' : 'fehlt')
  }
  if (!sheet) return []

  const images = sheet.getImages()
  const out: ExtractedImage[] = []

  if (import.meta.env.DEV) {
    console.log('[Backshop-Bilder Diagnose] getImages().length:', images?.length ?? 0)
  }

  const wb = workbook as unknown as {
    model?: { media?: Array<{ buffer: ArrayBuffer | Uint8Array | { buffer: ArrayBuffer }; extension: string }> }
    media?: Array<{ buffer: ArrayBuffer | Uint8Array | { buffer: ArrayBuffer }; extension: string }>
  }
  const media = (wb.model?.media?.length ? wb.model.media : wb.media) ?? null
  if (import.meta.env.DEV) {
    console.log('[Backshop-Bilder Diagnose] Media-Quelle:', wb.model?.media?.length != null ? 'model.media' : 'workbook.media', '| media.length:', Array.isArray(media) ? media.length : 'nicht vorhanden')
  }

  if (media && Array.isArray(media) && images.length > 0) {
    if (import.meta.env.DEV) {
      const first = images[0]
      const imageId = typeof first.imageId === 'string' ? parseInt(first.imageId, 10) : first.imageId
      console.log('[Backshop-Bilder Diagnose] Erstes Bild: nativeRow=', first.range?.tl?.nativeRow, 'nativeCol=', first.range?.tl?.nativeCol, 'imageId=', imageId, 'media[imageId] vorhanden=', media[imageId] != null)
    }
    for (const img of images) {
      const row = Math.max(0, Math.floor(Number(img.range?.tl?.nativeRow ?? img.range?.tl?.row ?? 0)))
      const col = Math.max(0, Math.floor(Number(img.range?.tl?.nativeCol ?? img.range?.tl?.col ?? 0)))
      const imageId = typeof img.imageId === 'string' ? parseInt(img.imageId, 10) : img.imageId
      if (Number.isNaN(imageId) || imageId < 0) continue
      const mediaItem = media[imageId]
      if (!mediaItem?.buffer) continue
      const { buffer, extension } = mediaItemToBufferAndExt(mediaItem)
      out.push({ row, col, buffer, extension })
    }
  }

  if (out.length === 0) {
    const zipFallback = await extractImagesFromXlsxZip(arrayBuffer)
    if (zipFallback.length > 0) {
      if (import.meta.env.DEV) console.log('[Backshop-Bilder] Fallback (ZIP/XML):', zipFallback.length, 'Bilder extrahiert (Position aus Drawing)')
      return zipFallback
    }
    if (media && Array.isArray(media) && media.length > 0 && parsedRows && parsedRows.length > 0) {
      const rowsWithPos = parsedRows
        .filter((r) => r.imageSheetRow0 != null && r.imageSheetCol0 != null)
        .sort((a, b) => (a.imageSheetRow0! - b.imageSheetRow0!) || (a.imageSheetCol0! - b.imageSheetCol0!))
      const n = Math.min(rowsWithPos.length, media.length)
      for (let i = 0; i < n; i++) {
        const row = rowsWithPos[i]
        const mediaItem = media[i]
        if (!mediaItem?.buffer) continue
        const { buffer, extension } = mediaItemToBufferAndExt(mediaItem)
        out.push({
          row: row.imageSheetRow0!,
          col: row.imageSheetCol0!,
          buffer,
          extension,
        })
      }
      if (out.length > 0 && import.meta.env.DEV) {
        console.log('[Backshop-Bilder] Fallback (media ohne getImages):', out.length, 'Bilder an Parser-Zeilen (Reihenfolge) zugeordnet')
      }
    }
  }

  return out
}

/**
 * Extrahiert Bilder aus der Excel-Datei, lädt sie in Supabase Storage hoch
 * und gibt eine Map PLU → URL zurück (öffentliche oder signierte URL je nach Bucket).
 * @param options.fileIndex - Optional; bei mehreren Dateien pro Batch, damit Pfade nicht kollidieren (z. B. uploadId/0/plu.png).
 */
export async function uploadBackshopImagesAndAssignUrls(
  parsedRows: ParsedBackshopRow[],
  file: File,
  options: {
    versionIdOrUploadId: string
    fileIndex?: number
    /** Optional: wird nach jedem Batch mit (hochgeladen, gesamt) aufgerufen (für Fortschrittsanzeige). */
    onProgress?: (uploaded: number, total: number) => void
    /** Optional: wird am Ende mit (Zeilen ohne Bild-URL, Bilder keiner Zeile zugeordnet, Anzahl aus Datei extrahierter Bilder) aufgerufen (für Toast/Diagnose). */
    onDiagnostic?: (rowsWithoutUrl: number, imagesUnassigned: number, extractedCount: number) => void
  }
): Promise<Map<string, string>> {
  const pluToUrl = new Map<string, string>()
  const extracted = await extractImagesFromBackshopExcel(file, parsedRows)
  if (import.meta.env.DEV) {
    console.log('[Backshop-Bilder]', extracted.length, 'Bilder aus Excel extrahiert')
    const withPos = parsedRows.filter((r) => r.imageSheetRow0 != null && r.imageSheetCol0 != null)
    if (withPos.length > 0 && extracted.length > 0) {
      const parsedKeys = withPos.slice(0, 5).map((r) => `${r.imageSheetRow0},${r.imageSheetCol0}`)
      const extractedKeys = extracted.slice(0, 5).map((e) => `${e.row},${e.col}`)
      console.log('[Backshop-Bilder Diagnose] Erste 5 Parser-Positionen (row,col):', parsedKeys)
      console.log('[Backshop-Bilder Diagnose] Erste 5 Bild-Positionen (row,col):', extractedKeys)
    }
  }
  if (extracted.length === 0) {
    const parsedWithPos = parsedRows.filter((r) => r.imageSheetRow0 != null && r.imageSheetCol0 != null).length
    if (parsedWithPos > 0) options.onDiagnostic?.(parsedWithPos, 0, 0)
    return pluToUrl
  }

  const byKey = (r: number, c: number) => `${r},${c}`
  const used = new Set<string>()
  /** Findet ein Bild bei (row0, col0) – exakt oder Toleranz nur in der Zeile (gleiche Spalte).
   * Kein dc≠0: Bild aus Nachbarspalte wird nie zugeordnet (Log-Befund: 100% Roggen col2→col3, Heidelbeer col17→col18). */
  const findImageAt = (row0: number, col0: number): ExtractedImage | null => {
    const exact = extracted.find((e) => e.row === row0 && e.col === col0 && !used.has(byKey(e.row, e.col)))
    if (exact) return exact
    for (const dr of [-2, -1, 1, 2]) {
      const e = extracted.find(
        (x) => x.row === row0 + dr && x.col === col0 && !used.has(byKey(x.row, x.col))
      )
      if (e) return e
    }
    return null
  }
  /** Fallback: nächstes freies Bild in gleicher Spalte (Kassenblatt: Bilder in verschiedenen Zeilen-Bändern).
   * Toleranz ±50 Zeilen, damit auch Bilder weiter unten (z. B. Zeile 25, 30) noch zugeordnet werden. */
  const findNearestImageSameCol = (row0: number, col0: number): ExtractedImage | null => {
    const candidates = extracted.filter(
      (e) => e.col === col0 && !used.has(byKey(e.row, e.col)) && Math.abs(e.row - row0) <= 50
    )
    if (candidates.length === 0) return null
    candidates.sort((a, b) => Math.abs(a.row - row0) - Math.abs(b.row - row0))
    return candidates[0] ?? null
  }
  /** Letzter Fallback: nur gleiche Spalte (beliebige Zeile). Kein Bild aus anderer Spalte (verhindert Fehlzuordnung). */
  const findAnyUnusedForCol = (col0: number): ExtractedImage | null => {
    return extracted.find((e) => e.col === col0 && !used.has(byKey(e.row, e.col))) ?? null
  }
  const pathPrefix =
    options.fileIndex != null
      ? `${options.versionIdOrUploadId}/${options.fileIndex}`
      : options.versionIdOrUploadId

  // Phase 1: Zuordnungen sammeln (wie bisher, damit kein Bild doppelt vergeben wird)
  const jobs: { row: ParsedBackshopRow; image: ExtractedImage }[] = []
  for (const row of parsedRows) {
    const row0 = row.imageSheetRow0
    const col0 = row.imageSheetCol0
    if (row0 == null || col0 == null) continue

    let image = findImageAt(row0, col0)
    if (!image) image = findNearestImageSameCol(row0, col0)
    if (!image) image = findAnyUnusedForCol(col0)
    if (!image) continue

    used.add(byKey(image.row, image.col))
    jobs.push({ row, image })
  }

  // Phase 2: Resize + Upload parallel in Batches (schneller bei vielen Bildern)
  options.onProgress?.(0, jobs.length)
  const CONCURRENCY = 8
  for (let i = 0; i < jobs.length; i += CONCURRENCY) {
    const batch = jobs.slice(i, i + CONCURRENCY)
    const results = await Promise.all(
      batch.map(async ({ row, image }): Promise<{ plu: string; url: string } | null> => {
        const { buffer: uploadBuffer, extension: uploadExt } = await resizeImageToTarget(
          image.buffer,
          image.extension
        )
        const safePlu = row.plu.replace(/[^a-zA-Z0-9_-]/g, '_')
        const fileName = `${safePlu}.${uploadExt}`
        const path = `${pathPrefix}/${fileName}`

        const { error: uploadErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, uploadBuffer, {
            contentType: uploadExt === 'jpg' ? 'image/jpeg' : `image/${uploadExt}`,
            upsert: true,
          })

        if (uploadErr) {
          console.warn(`Backshop-Bild Upload fehlgeschlagen für PLU ${row.plu}:`, uploadErr.message)
          return null
        }

        const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_EXPIRES_IN)
        if (signed?.signedUrl) return { plu: row.plu, url: signed.signedUrl }
        const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(path)
        return { plu: row.plu, url: publicData.publicUrl }
      })
    )
    for (const r of results) {
      if (r) pluToUrl.set(r.plu, r.url)
    }
    options.onProgress?.(pluToUrl.size, jobs.length)
  }

  const withPos = parsedRows.filter((r) => r.imageSheetRow0 != null && r.imageSheetCol0 != null)
  const withoutUrl = withPos.filter((r) => !pluToUrl.has(r.plu))
  const unassignedImages = extracted.filter((e) => !used.has(byKey(e.row, e.col)))
  options.onDiagnostic?.(withoutUrl.length, unassignedImages.length, extracted.length)

  if (import.meta.env.DEV) {
    console.log('[Backshop-Bilder]', pluToUrl.size, 'PLUs mit Bild-URL zugeordnet')
    if (withoutUrl.length > 0) {
      const firstMissing = withoutUrl.slice(0, 10).map((r) => `${r.plu}@(${r.imageSheetRow0},${r.imageSheetCol0})`)
      console.log('[Backshop-Bilder Diagnose] Parser-Zeilen ohne Bild-URL:', withoutUrl.length, '| erste 10:', firstMissing)
    }
    if (unassignedImages.length > 0) {
      const firstUnassigned = unassignedImages.slice(0, 10).map((e) => `(${e.row},${e.col})`)
      console.log('[Backshop-Bilder Diagnose] Extrahierte Bilder keiner PLU zugeordnet:', unassignedImages.length, '| erste 10 Positionen:', firstUnassigned)
    }
  }
  return pluToUrl
}
