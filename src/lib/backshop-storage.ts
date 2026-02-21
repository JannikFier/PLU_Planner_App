// Backshop: Einzelbild-Upload in Storage (Eigene Produkte, Umbenennen)

import { supabase } from '@/lib/supabase'

const BUCKET = 'backshop-images'
/** Gültigkeit signierter URLs (1 Jahr) */
const SIGNED_URL_EXPIRES_IN = 60 * 60 * 24 * 365

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

/**
 * Lädt eine Bilddatei in den Bucket backshop-images hoch.
 * @param file - Bilddatei (JPEG, PNG, WebP, GIF)
 * @param pathPrefix - Pfad-Präfix z. B. "custom/{userId}" oder "renamed/{versionId}"
 * @returns Öffentliche oder signierte URL des hochgeladenen Bildes
 */
export async function uploadBackshopImage(file: File, pathPrefix: string): Promise<string> {
  const mime = file.type?.toLowerCase()
  if (!ALLOWED_TYPES.includes(mime)) {
    throw new Error('Nur Bilddateien (JPEG, PNG, WebP, GIF) sind erlaubt.')
  }
  const ext = EXT_BY_MIME[mime] ?? 'jpg'
  const unique = crypto.randomUUID()
  const path = `${pathPrefix}/${unique}.${ext}`

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: mime,
    upsert: true,
  })

  if (error) throw error

  const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_EXPIRES_IN)
  if (signed?.signedUrl) return signed.signedUrl
  const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return publicData.publicUrl
}
