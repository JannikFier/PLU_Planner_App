// Backshop-Version veröffentlichen: Version anlegen, Items schreiben (ohne Benachrichtigungen in Phase 3)

import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'
import type { BackshopCompareItem } from '@/types/plu'

const BATCH_SIZE = 500

export interface PublishBackshopInput {
  kwNummer: number
  jahr: number
  items: BackshopCompareItem[]
  createdBy: string
  replaceExistingVersion?: boolean
}

export interface PublishBackshopResult {
  versionId: string
  itemCount: number
}

/**
 * Veröffentlicht eine neue Backshop-KW-Version:
 * 1. Optional: bestehende Version für (kwNummer, jahr) löschen
 * 2. Alte aktive Backshop-Version einfrieren
 * 3. Neue Backshop-Version als draft anlegen
 * 4. Items in backshop_master_plu_items einfügen (inkl. image_url)
 * 5. Version aktivieren
 * Benachrichtigungen (A8) kommen in Phase 5.
 */
export async function publishBackshopVersion(input: PublishBackshopInput): Promise<PublishBackshopResult> {
  const { kwNummer, jahr, items, createdBy, replaceExistingVersion } = input

  if (replaceExistingVersion) {
    const { data: existing, error: findErr } = await supabase
      .from('backshop_versions')
      .select('id')
      .eq('kw_nummer', kwNummer)
      .eq('jahr', jahr)
      .maybeSingle()

    if (findErr) throw new Error(`Bestehende Backshop-Version suchen fehlgeschlagen: ${findErr.message}`)
    if (existing) {
      const { error: delErr } = await supabase
        .from('backshop_versions')
        .delete()
        .eq('id', (existing as { id: string }).id)
      if (delErr) throw new Error(`Bestehende Backshop-Version löschen fehlgeschlagen: ${delErr.message}`)
    }
  }

  const { error: freezeErr } = await supabase
    .from('backshop_versions')
    .update(
    ({
      status: 'frozen',
      frozen_at: new Date().toISOString(),
      delete_after: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    } as Database['public']['Tables']['backshop_versions']['Update']) as never
  )
    .eq('status', 'active')

  if (freezeErr) throw new Error(`Aktive Backshop-Version einfrieren fehlgeschlagen: ${freezeErr.message}`)

  const { data: newVersion, error: versionErr } = await supabase
    .from('backshop_versions')
    .insert(
    ({
      kw_nummer: kwNummer,
      jahr,
      status: 'draft',
      created_by: createdBy,
    } as Database['public']['Tables']['backshop_versions']['Insert']) as never
  )
    .select()
    .single()

  if (versionErr || !newVersion) {
    throw new Error(`Backshop-Version anlegen fehlgeschlagen: ${versionErr?.message ?? 'Keine Daten'}`)
  }

  const versionId = (newVersion as { id: string }).id

  const rows = items.map((item) => ({
    version_id: versionId,
    plu: item.plu,
    system_name: item.system_name,
    display_name: item.display_name ?? null,
    status: item.status as 'UNCHANGED' | 'NEW_PRODUCT_YELLOW' | 'PLU_CHANGED_RED',
    old_plu: item.old_plu ?? null,
    warengruppe: null,
    block_id: null,
    is_manually_renamed: false,
    image_url: item.image_url ?? null,
  }))

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE)
    const { error: insertErr } = await supabase
      .from('backshop_master_plu_items')
      .insert((batch as Database['public']['Tables']['backshop_master_plu_items']['Insert'][]) as never)

    if (insertErr) {
      await supabase.from('backshop_versions').delete().eq('id', versionId)
      throw new Error(`Backshop-Items einfügen fehlgeschlagen (Batch ${Math.floor(i / BATCH_SIZE) + 1}): ${insertErr.message}`)
    }
  }

  const { error: activateErr } = await supabase
    .from('backshop_versions')
    .update(
    ({
      status: 'active',
      published_at: new Date().toISOString(),
    } as Database['public']['Tables']['backshop_versions']['Update']) as never
  )
    .eq('id', versionId)

  if (activateErr) {
    await supabase.from('backshop_versions').delete().eq('id', versionId)
    throw new Error(`Backshop-Version aktivieren fehlgeschlagen: ${activateErr.message}`)
  }

  // Benachrichtigungen: pro User (außer Uploader) eine ungelesene Notification
  let notificationCount = 0
  try {
    const { data: allUsers, error: usersErr } = await supabase
      .from('profiles')
      .select('id')
      .neq('id', createdBy)
    if (!usersErr && allUsers && allUsers.length > 0) {
      const notifications = (allUsers as { id: string }[]).map((user) => ({
        user_id: user.id,
        version_id: versionId,
        is_read: false,
      }))
      for (let i = 0; i < notifications.length; i += BATCH_SIZE) {
        const batch = notifications.slice(i, i + BATCH_SIZE)
        const { error: notifErr } = await supabase
          .from('backshop_version_notifications')
          .insert((batch as Database['public']['Tables']['backshop_version_notifications']['Insert'][]) as never)
        if (!notifErr) notificationCount += batch.length
      }
    }
  } catch {
    // Nicht kritisch – Upload war erfolgreich
  }

  return { versionId, itemCount: items.length }
}
