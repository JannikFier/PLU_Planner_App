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
 * Extrahiert das größte eingebettete Bitmap aus einer EMF-Datei.
 * EMF besteht aus Records; EMR_STRETCHDIBITS (0x51) enthält ein DIB (Device Independent Bitmap).
 * Das DIB wird in ein vollständiges BMP umgewandelt, das Browser via createImageBitmap laden können.
 */
function extractBitmapFromEmf(buffer: ArrayBuffer): ArrayBuffer | null {
  const view = new DataView(buffer)
  const len = buffer.byteLength
  if (len < 108) return null
  const EMR_STRETCHDIBITS = 0x51
  let bestDib: { bmiOffset: number; bmiSize: number; bitsOffset: number; bitsSize: number } | null = null
  let offset = 0
  while (offset + 8 <= len) {
    const recType = view.getUint32(offset, true)
    const recSize = view.getUint32(offset + 4, true)
    if (recSize < 8 || offset + recSize > len) break
    if (recType === EMR_STRETCHDIBITS && recSize >= 80) {
      const offBmiSrc = view.getUint32(offset + 48, true)
      const cbBmiSrc = view.getUint32(offset + 52, true)
      const offBitsSrc = view.getUint32(offset + 56, true)
      const cbBitsSrc = view.getUint32(offset + 60, true)
      if (cbBmiSrc > 0 && cbBitsSrc > 0 && offBmiSrc + cbBmiSrc <= recSize && offBitsSrc + cbBitsSrc <= recSize) {
        if (!bestDib || cbBitsSrc > bestDib.bitsSize) {
          bestDib = {
            bmiOffset: offset + offBmiSrc,
            bmiSize: cbBmiSrc,
            bitsOffset: offset + offBitsSrc,
            bitsSize: cbBitsSrc,
          }
        }
      }
    }
    offset += recSize
  }
  if (!bestDib) return null
  const fileHeaderSize = 14
  const totalSize = fileHeaderSize + bestDib.bmiSize + bestDib.bitsSize
  const pixelDataOffset = fileHeaderSize + bestDib.bmiSize
  const bmp = new ArrayBuffer(totalSize)
  const bmpView = new DataView(bmp)
  const bmpBytes = new Uint8Array(bmp)
  bmpView.setUint8(0, 0x42) // 'B'
  bmpView.setUint8(1, 0x4D) // 'M'
  bmpView.setUint32(2, totalSize, true)
  bmpView.setUint32(6, 0, true)
  bmpView.setUint32(10, pixelDataOffset, true)
  bmpBytes.set(new Uint8Array(buffer, bestDib.bmiOffset, bestDib.bmiSize), fileHeaderSize)
  bmpBytes.set(new Uint8Array(buffer, bestDib.bitsOffset, bestDib.bitsSize), pixelDataOffset)
  return bmp
}

/**
 * Versucht, ein EMF/WMF-Bild nach PNG zu konvertieren.
 * 1) Erst: Eingebettetes Bitmap aus EMF-Records extrahieren → BMP → createImageBitmap → PNG
 * 2) Fallback: Direkt createImageBitmap versuchen (funktioniert evtl. auf Windows-Chrome)
 */
async function tryConvertEmfToPng(buffer: ArrayBuffer): Promise<{ buffer: ArrayBuffer; extension: string } | null> {
  // Versuch 1: Eingebettete Bitmap-Daten aus EMF extrahieren
  const bmpBuffer = extractBitmapFromEmf(buffer)
  if (bmpBuffer) {
    try {
      const blob = new Blob([bmpBuffer], { type: 'image/bmp' })
      const bitmap = await createImageBitmap(blob)
      const w = bitmap.width
      const h = bitmap.height
      if (w > 0 && h > 0) {
        const scale = RESIZE_TARGET / Math.max(w, h, 1)
        const outW = Math.max(1, Math.round(w * scale))
        const outH = Math.max(1, Math.round(h * scale))
        const canvas = new OffscreenCanvas(outW, outH)
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(bitmap, 0, 0, outW, outH)
          bitmap.close()
          const outBlob = await canvas.convertToBlob({ type: 'image/png' })
          if (outBlob && outBlob.size >= 100) {
            return { buffer: await outBlob.arrayBuffer(), extension: 'png' }
          }
        } else { bitmap.close() }
      } else { bitmap.close() }
    } catch { /* BMP-Weg fehlgeschlagen, weiter zu Fallback */ }
  }
  // Versuch 2: Direkt als EMF probieren (Windows-Browser können das manchmal)
  try {
    const blob = new Blob([buffer], { type: 'image/x-emf' })
    const bitmap = await createImageBitmap(blob)
    const w = bitmap.width
    const h = bitmap.height
    if (w <= 0 || h <= 0) { bitmap.close(); return null }
    const scale = RESIZE_TARGET / Math.max(w, h, 1)
    const outW = Math.max(1, Math.round(w * scale))
    const outH = Math.max(1, Math.round(h * scale))
    const canvas = new OffscreenCanvas(outW, outH)
    const ctx = canvas.getContext('2d')
    if (!ctx) { bitmap.close(); return null }
    ctx.drawImage(bitmap, 0, 0, outW, outH)
    bitmap.close()
    const outBlob = await canvas.convertToBlob({ type: 'image/png' })
    if (!outBlob || outBlob.size < 100) return null
    return { buffer: await outBlob.arrayBuffer(), extension: 'png' }
  } catch {
    return null
  }
}

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
 * Konvertiert Excel-Zellreferenz (z. B. A1, B4, AA10) in 0-basierte (row, col).
 * Excel-Zeile in r ist 1-basiert; Spalte A=0, B=1, …, Z=25, AA=26, …
 */
function cellRefToRowCol(cellRef: string): { row: number; col: number } | null {
  const match = cellRef.match(/^([A-Z]+)(\d+)$/i)
  if (!match) return null
  const colStr = match[1].toUpperCase()
  const row1Based = parseInt(match[2], 10)
  if (Number.isNaN(row1Based) || row1Based < 1) return null
  let col1Based = 0
  for (let i = 0; i < colStr.length; i++) {
    col1Based = col1Based * 26 + (colStr.charCodeAt(i) - 64)
  }
  return { row: row1Based - 1, col: col1Based - 1 }
}

/**
 * Cell Images (Excel 365 „Bild in Zelle“): Liest Zellen mit vm-Attribut aus sheet,
 * löst Rich-Data-Relationen auf und lädt Bilder aus xl/media/. Nur PNG/JPEG.
 * Liefert 0-basierte row/col. Wird mit Drawing-Bildern zusammengeführt.
 */
async function extractCellImagesFromXlsxZip(arrayBuffer: ArrayBuffer): Promise<ExtractedImage[]> {
  const out: ExtractedImage[] = []
  try {
    const zip = await JSZip.loadAsync(arrayBuffer)

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

    // Zellen mit vm-Attribut (value metadata) = Rich Value / Zellbild (r und vm in beliebiger Reihenfolge)
    const cellVmList: { row: number; col: number; vmIndex: number }[] = []
    for (const cellMatch of sheetXml.matchAll(/<c\s[^>]+>/gi)) {
      const tag = cellMatch[0]
      const rMatch = tag.match(/\sr="([^"]+)"/)
      const vmMatch = tag.match(/\svm="(\d+)"/)
      if (!rMatch || !vmMatch) continue
      const vm = parseInt(vmMatch[1], 10)
      if (Number.isNaN(vm)) continue
      const rc = cellRefToRowCol(rMatch[1])
      if (!rc) continue
      cellVmList.push({ row: rc.row, col: rc.col, vmIndex: vm - 1 })
    }
    if (cellVmList.length === 0) return out

    // Rich-Data-Relationen: workbook.xml.rels enthält Verweis auf rdArray oder rdData
    const workbookRelsPath = 'xl/_rels/workbook.xml.rels'
    const workbookRels = await zip.file(workbookRelsPath)?.async('string')
    if (!workbookRels) return out
    const rdTargetMatch = workbookRels.match(
      /Target="(richData\/[^"]+\.xml)"|Target="([^"]*richData[^"]*\.xml)"/
    )
    const rdTarget = rdTargetMatch?.[1] ?? rdTargetMatch?.[2]
    if (!rdTarget) return out
    const rdDir = rdTarget.includes('/') ? rdTarget.replace(/\/[^/]+$/, '/') : ''
    const rdFileName = rdTarget.split('/').pop() ?? 'rdArray.xml'
    const rdRelsPath = 'xl/' + rdDir + '_rels/' + rdFileName + '.rels'
    let rdRels = await zip.file(rdRelsPath)?.async('string')
    // Falls rdArray.xml.rels nur auf rdData verweist: rdData.xml.rels für Medien nutzen
    if (rdRels) {
      const rdDataMatch = rdRels.match(/Target="([^"]*rdData[^"]*\.xml)"|Target="(richData\/rdData\.xml)"/)
      const rdDataTarget = rdDataMatch?.[1] ?? rdDataMatch?.[2]
      if (rdDataTarget) {
        const rdDataDir = rdDataTarget.includes('/') ? rdDataTarget.replace(/\/[^/]+$/, '/') : ''
        const rdDataFileName = rdDataTarget.split('/').pop() ?? 'rdData.xml'
        const rdDataRelsPath = 'xl/' + rdDir + rdDataDir + '_rels/' + rdDataFileName + '.rels'
        const rdDataRels = await zip.file(rdDataRelsPath)?.async('string')
        if (rdDataRels) rdRels = rdDataRels
      }
    }

    // Zusätzlich: richValueRel.xml direkt prüfen (Hauptweg für Excel 365 Cell Images)
    const richValueRelPath = 'xl/richData/richValueRel.xml'
    const richValueRelRelsPath = 'xl/richData/_rels/richValueRel.xml.rels'
    const richValueRelXml = await zip.file(richValueRelPath)?.async('string')
    const richValueRelRels = await zip.file(richValueRelRelsPath)?.async('string')

    // richValueRel.xml.rels bevorzugen (Hauptweg für Excel 365 Cell Images)
    const effectiveRels = richValueRelRels ?? rdRels
    if (!effectiveRels) return out

    const rIdToTarget: Record<string, string> = {}
    for (const rel of effectiveRels.matchAll(/Id="(rId\d+)"[^>]+Target="([^"]+)"/g)) rIdToTarget[rel[1]] = rel[2]
    for (const rel of effectiveRels.matchAll(/Target="([^"]+)"[^>]+Id="(rId\d+)"/g)) rIdToTarget[rel[2]] = rel[1]

    // Document-Order aus richValueRel.xml verwenden (nicht rId-Sortierung),
    // da vm-Index auf die Position im XML verweist, nicht auf die rId-Nummer.
    const imageTargets: string[] = []
    if (richValueRelXml) {
      for (const relMatch of richValueRelXml.matchAll(/<rel\s[^>]*r:id="(rId\d+)"[^>]*\/?>/gi)) {
        const t = rIdToTarget[relMatch[1]] ?? ''
        if (t) imageTargets.push(t)
      }
    }
    if (imageTargets.length === 0) {
      const rIds = Object.keys(rIdToTarget).sort((a, b) => {
        const na = parseInt(a.replace(/rId/, ''), 10)
        const nb = parseInt(b.replace(/rId/, ''), 10)
        return na - nb
      })
      for (const rId of rIds) {
        const t = rIdToTarget[rId] ?? ''
        if (t) imageTargets.push(t)
      }
    }
    if (imageTargets.length === 0) return out

    for (const { row, col, vmIndex } of cellVmList) {
      if (vmIndex < 0 || vmIndex >= imageTargets.length) continue
      const target = imageTargets[vmIndex]
      const mediaRelative = target.replace(/^\.\.\/media\//, '').replace(/^media\//, '').replace(/^\.\.\//, '') || target.split('/').pop() || 'image.png'
      const mediaPath = target.startsWith('xl/') ? target : 'xl/media/' + mediaRelative
      const file = zip.file(mediaPath) ?? zip.file('xl/media/' + mediaRelative)
      if (!file) continue
      const ext = (mediaPath.split('.').pop() || 'png').toLowerCase().replace(/jpeg/, 'jpg')
      const buffer = await file.async('arraybuffer')
      if (ext === 'emf' || ext === 'wmf') {
        const converted = await tryConvertEmfToPng(buffer)
        if (converted) out.push({ row, col, buffer: converted.buffer, extension: converted.extension })
        continue
      }
      const extension = ext === 'jpg' || ext === 'jpeg' || ext === 'png' ? ext : 'png'
      out.push({ row, col, buffer, extension: extension === 'jpeg' ? 'jpg' : extension })
    }
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[Backshop-Bilder] Cell-Images ZIP Fehler:', e)
  }
  return out
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
      const ext = (mediaPath.split('.').pop() || 'png').toLowerCase().replace(/jpeg/, 'jpg')
      if (ext === 'emf' || ext === 'wmf') {
        const emfBuffer = await file.async('arraybuffer')
        const converted = await tryConvertEmfToPng(emfBuffer)
        if (converted) out.push({ row, col, buffer: converted.buffer, extension: converted.extension })
        continue
      }
      const buffer = await file.async('arraybuffer')
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
    // ExcelJS nativeRow/nativeCol sind 0-basiert (wie OOXML Drawing) – keine Verschiebung nötig
    for (const img of images) {
      const row = Math.max(0, Math.floor(Number(img.range?.tl?.nativeRow ?? img.range?.tl?.row ?? 0)))
      const col = Math.max(0, Math.floor(Number(img.range?.tl?.nativeCol ?? img.range?.tl?.col ?? 0)))
      const imageId = typeof img.imageId === 'string' ? parseInt(img.imageId, 10) : img.imageId
      if (Number.isNaN(imageId) || imageId < 0) continue
      const mediaItem = media[imageId]
      if (!mediaItem?.buffer) continue
      const rawExt = (mediaItem.extension && mediaItem.extension.toLowerCase().replace(/^\./, '')) || ''
      if (rawExt === 'emf' || rawExt === 'wmf') {
        const { buffer: rawBuf } = mediaItemToBufferAndExt(mediaItem)
        const converted = await tryConvertEmfToPng(rawBuf)
        if (converted) out.push({ row, col, buffer: converted.buffer, extension: converted.extension })
        continue
      }
      const { buffer, extension } = mediaItemToBufferAndExt(mediaItem)
      out.push({ row, col, buffer, extension })
    }
  }

  if (out.length === 0) {
    const zipFallback = await extractImagesFromXlsxZip(arrayBuffer)
    if (zipFallback.length > 0) {
      if (import.meta.env.DEV) console.log('[Backshop-Bilder] Fallback (ZIP/XML):', zipFallback.length, 'Bilder extrahiert (Position aus Drawing)')
      for (const e of zipFallback) out.push(e)
    }
    if (out.length === 0 && media && Array.isArray(media) && media.length > 0 && parsedRows && parsedRows.length > 0) {
      const rowsWithPos = parsedRows
        .filter((r): r is typeof r & { imageSheetRow0: number; imageSheetCol0: number } =>
          r.imageSheetRow0 != null && r.imageSheetCol0 != null)
        .sort((a, b) => (a.imageSheetRow0 - b.imageSheetRow0) || (a.imageSheetCol0 - b.imageSheetCol0))
      const n = Math.min(rowsWithPos.length, media.length)
      for (let i = 0; i < n; i++) {
        const row = rowsWithPos[i]
        const mediaItem = media[i]
        if (!mediaItem?.buffer) continue
        const rawExt = (mediaItem.extension && mediaItem.extension.toLowerCase().replace(/^\./, '')) || ''
        if (rawExt === 'emf' || rawExt === 'wmf') {
          const { buffer: rawBuf } = mediaItemToBufferAndExt(mediaItem)
          const converted = await tryConvertEmfToPng(rawBuf)
          if (converted) out.push({ row: row.imageSheetRow0, col: row.imageSheetCol0, buffer: converted.buffer, extension: converted.extension })
          continue
        }
        const { buffer, extension } = mediaItemToBufferAndExt(mediaItem)
        out.push({
          row: row.imageSheetRow0,
          col: row.imageSheetCol0,
          buffer,
          extension,
        })
      }
      if (out.length > 0 && import.meta.env.DEV) {
        console.log('[Backshop-Bilder] Fallback (media ohne getImages):', out.length, 'Bilder an Parser-Zeilen (Reihenfolge) zugeordnet')
      }
    }
  }

  // Cell Images (Excel 365 „Bild in Zelle“): ergänzen, ohne bestehende (row,col) zu überschreiben
  const cellImages = await extractCellImagesFromXlsxZip(arrayBuffer)
  const outKeys = new Set(out.map((e) => `${e.row},${e.col}`))
  for (const img of cellImages) {
    const key = `${img.row},${img.col}`
    if (outKeys.has(key)) continue
    out.push(img)
    outKeys.add(key)
  }
  if (cellImages.length > 0 && import.meta.env.DEV) {
    console.log('[Backshop-Bilder] Cell Images:', cellImages.length, 'ergänzt')
  }

  return out
}

/** Produkt ohne automatisch zugeordnetes Bild (für manuelle Zuordnung in der UI). */
export interface UnmatchedProduct {
  plu: string
  name: string
  /** Erwartete Bildzeile (0-basiert) – für Sortierung „nahe zuerst“ im Dialog. */
  expectedRow?: number
  /** Erwartete Bildspalte (0-basiert) – für Sortierung „nahe zuerst“ im Dialog. */
  expectedCol?: number
  availableImages: { dataUrl: string; row: number; col: number }[]
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
    onProgress?: (uploaded: number, total: number) => void
    onDiagnostic?: (rowsWithoutUrl: number, imagesUnassigned: number, extractedCount: number) => void
    /** Optional: wird aufgerufen wenn Produkte ohne Bild existieren (für manuelle Zuordnung in der UI). */
    onUnmatchedProducts?: (products: UnmatchedProduct[]) => void
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

  const findImageAt = (row0: number, col0: number): ExtractedImage | null => {
    const exact = extracted.find((e) => e.row === row0 && e.col === col0 && !used.has(byKey(e.row, e.col)))
    if (exact) return exact
    for (const dr of [-2, -1, 1, 2]) {
      const e = extracted.find(
        (x) => x.row === row0 + dr && x.col === col0 && !used.has(byKey(x.row, x.col))
      )
      if (e) return e
    }
    // Kein Fallback auf Nachbarspalte (±1): führt zu falschen Zuordnungen (z. B. Avocado bekommt Börek-Bild).
    // Produkte ohne Treffer erscheinen im Dialog „Bilder manuell zuordnen“.
    return null
  }
  const pathPrefix =
    options.fileIndex != null
      ? `${options.versionIdOrUploadId}/${options.fileIndex}`
      : options.versionIdOrUploadId

  // Phase 1a: Nur strenge Zuordnung (exakt oder ±2 Zeilen, gleiche Spalte).
  // Keine 1b/1c: Produkte ohne Treffer bekommen bewusst KEIN Bild und erscheinen im
  // Dialog zur manuellen Zuordnung – so wird nie ein falsches Bild (z. B. Schokobrötchen bei Heidelbeer) zugeordnet.
  const jobs: { row: ParsedBackshopRow; image: ExtractedImage }[] = []
  for (const row of parsedRows) {
    const row0 = row.imageSheetRow0
    const col0 = row.imageSheetCol0
    if (row0 == null || col0 == null) continue
    const image = findImageAt(row0, col0)
    if (!image) continue
    used.add(byKey(image.row, image.col))
    jobs.push({ row, image })
  }

  const withPos = parsedRows.filter((r) => r.imageSheetRow0 != null && r.imageSheetCol0 != null)
  const productsWithoutImage = withPos.filter((r) => !jobs.some((j) => j.row.plu === r.plu))
  if (productsWithoutImage.length > 0 && options.onUnmatchedProducts) {
    const remainingImages = extracted.filter((e) => !used.has(byKey(e.row, e.col)))
    const availableImages = remainingImages.map((e) => {
      const mime = e.extension === 'jpg' ? 'image/jpeg' : `image/${e.extension}`
      const dataUrl = URL.createObjectURL(new Blob([e.buffer], { type: mime }))
      return { dataUrl, row: e.row, col: e.col }
    })
    options.onUnmatchedProducts(
      productsWithoutImage.map((r) => ({
        plu: r.plu,
        name: r.systemName,
        expectedRow: r.imageSheetRow0 ?? undefined,
        expectedCol: r.imageSheetCol0 ?? undefined,
        availableImages,
      }))
    )
  }

  // Phase 2: Resize + Upload parallel in Batches
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
          if (import.meta.env.DEV) console.warn(`Backshop-Bild Upload fehlgeschlagen für PLU ${row.plu}:`, uploadErr.message)
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

  const withoutUrl = withPos.filter((r) => !pluToUrl.has(r.plu))
  const unassignedImagesFinal = extracted.filter((e) => !used.has(byKey(e.row, e.col)))
  options.onDiagnostic?.(withoutUrl.length, unassignedImagesFinal.length, extracted.length)

  if (import.meta.env.DEV) {
    console.log('[Backshop-Bilder]', pluToUrl.size, 'PLUs mit Bild-URL zugeordnet')
    if (withoutUrl.length > 0) {
      const firstMissing = withoutUrl.slice(0, 10).map((r) => `${r.plu}@(${r.imageSheetRow0},${r.imageSheetCol0})`)
      console.log('[Backshop-Bilder Diagnose] Parser-Zeilen ohne Bild-URL:', withoutUrl.length, '| erste 10:', firstMissing)
    }
    if (unassignedImagesFinal.length > 0) {
      const firstUnassigned = unassignedImagesFinal.slice(0, 10).map((e) => `(${e.row},${e.col})`)
      console.log('[Backshop-Bilder Diagnose] Extrahierte Bilder keiner PLU zugeordnet:', unassignedImagesFinal.length, '| erste 10 Positionen:', firstUnassigned)
    }
  }
  return pluToUrl
}

/**
 * Lädt ein manuell zugeordnetes Bild (dataUrl/blob) in Supabase Storage hoch.
 * Wird von der UI aufgerufen, wenn der User ein Bild für ein Produkt ohne automatisches Bild auswählt.
 */
export async function uploadManualImage(
  dataUrl: string,
  plu: string,
  uploadId: string,
  fileIndex: number
): Promise<string | null> {
  try {
    const resp = await fetch(dataUrl)
    const blob = await resp.blob()
    const rawBuffer = await blob.arrayBuffer()
    const ext = blob.type === 'image/jpeg' ? 'jpg' : 'png'
    const { buffer: resized, extension: resizedExt } = await resizeImageToTarget(rawBuffer, ext)

    const safePlu = plu.replace(/[^a-zA-Z0-9_-]/g, '_')
    const path = `${uploadId}/${fileIndex}/${safePlu}.${resizedExt}`
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, resized, {
        contentType: resizedExt === 'jpg' ? 'image/jpeg' : `image/${resizedExt}`,
        upsert: true,
      })
    if (error) {
      if (import.meta.env.DEV) console.warn(`Manuelles Bild-Upload fehlgeschlagen für PLU ${plu}:`, error.message)
      return null
    }
    const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_EXPIRES_IN)
    if (signed?.signedUrl) return signed.signedUrl
    const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(path)
    return publicData.publicUrl
  } catch (err) {
    if (import.meta.env.DEV) console.warn('Manuelles Bild-Upload Fehler:', err)
    return null
  }
}
