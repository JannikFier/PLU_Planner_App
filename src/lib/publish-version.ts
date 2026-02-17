// Publish-Logik: Version veröffentlichen, Items schreiben, Benachrichtigungen erstellen

import { supabase } from '@/lib/supabase'
import type { Database, MasterPLUItem } from '@/types/database'

const BATCH_SIZE = 500

interface PublishInput {
  /** KW-Nummer der neuen Version */
  kwNummer: number
  /** Jahr der neuen Version */
  jahr: number
  /** Alle Items die in die neue Version geschrieben werden */
  items: MasterPLUItem[]
  /** ID des Super-Admins der die Version erstellt */
  createdBy: string
  /** Bei true: bestehende Version für (kwNummer, jahr) zuerst löschen (Überschreiben) */
  replaceExistingVersion?: boolean
}

interface PublishResult {
  versionId: string
  itemCount: number
  notificationCount: number
}

/**
 * Veröffentlicht eine neue KW-Version:
 * 1. Alte aktive Version einfrieren
 * 2. Neue Version als draft anlegen
 * 3. Items in Batches einfügen
 * 4. Version aktivieren
 * 5. Benachrichtigungen für neue Produkte erstellen
 */
export async function publishVersion(input: PublishInput): Promise<PublishResult> {
  const { kwNummer, jahr, items, createdBy, replaceExistingVersion } = input

  // 0. Optional: Bestehende Version für (kwNummer, jahr) löschen (Überschreiben)
  if (replaceExistingVersion) {
    const { data: existingVersion, error: findError } = await supabase
      .from('versions')
      .select('id')
      .eq('kw_nummer', kwNummer)
      .eq('jahr', jahr)
      .maybeSingle()

    if (findError) {
      throw new Error(`Bestehende Version suchen fehlgeschlagen: ${findError.message}`)
    }
    if (existingVersion) {
      const { error: deleteError } = await supabase
        .from('versions')
        .delete()
        .eq('id', (existingVersion as { id: string }).id)

      if (deleteError) {
        throw new Error(`Bestehende Version löschen fehlgeschlagen: ${deleteError.message}`)
      }
    }
  }

  // 1. Alte aktive Version(en) einfrieren
  const { error: freezeError } = await supabase
    .from('versions')
    .update(
    ({
      status: 'frozen',
      frozen_at: new Date().toISOString(),
      delete_after: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    } as Database['public']['Tables']['versions']['Update']) as never
  )
    .eq('status', 'active')

  if (freezeError) {
    throw new Error(`Aktive Version einfrieren fehlgeschlagen: ${freezeError.message}`)
  }

  // 2. Neue Version als draft anlegen
  const { data: newVersion, error: versionError } = await supabase
    .from('versions')
    .insert(
    ({
      kw_nummer: kwNummer,
      jahr,
      status: 'draft',
      created_by: createdBy,
    } as Database['public']['Tables']['versions']['Insert']) as never
  )
    .select()
    .single()

  if (versionError || !newVersion) {
    throw new Error(`Version anlegen fehlgeschlagen: ${versionError?.message ?? 'Keine Daten'}`)
  }

  const versionId = (newVersion as { id: string }).id

  // 3. Items in Batches einfügen
  // version_id auf die neue Version setzen
  const itemsToInsert = items.map((item) => ({
    version_id: versionId,
    plu: item.plu,
    system_name: item.system_name,
    item_type: item.item_type,
    status: item.status,
    old_plu: item.old_plu,
    warengruppe: item.warengruppe,
    block_id: item.block_id,
    is_admin_eigen: item.is_admin_eigen,
    preis: item.preis,
  }))

  for (let i = 0; i < itemsToInsert.length; i += BATCH_SIZE) {
    const batch = itemsToInsert.slice(i, i + BATCH_SIZE)
    const { error: insertError } = await supabase
      .from('master_plu_items')
      .insert((batch as Database['public']['Tables']['master_plu_items']['Insert'][]) as never)

    if (insertError) {
      await supabase.from('versions').delete().eq('id', versionId)
      throw new Error(`Items einfügen fehlgeschlagen (Batch ${Math.floor(i / BATCH_SIZE) + 1}): ${insertError.message}`)
    }
  }

  // 4. Version aktivieren
  const { error: activateError } = await supabase
    .from('versions')
    .update(
    ({
      status: 'active',
      published_at: new Date().toISOString(),
    } as Database['public']['Tables']['versions']['Update']) as never
  )
    .eq('id', versionId)

  if (activateError) {
    await supabase.from('versions').delete().eq('id', versionId)
    throw new Error(`Version aktivieren fehlgeschlagen: ${activateError.message}`)
  }

  // 5. Benachrichtigungen erstellen (version_notifications: pro User pro Version)
  // Alle User laden (alle Rollen), außer dem Uploader
  let notificationCount = 0

  try {
    const { data: allUsers, error: usersError } = await supabase
      .from('profiles')
      .select('id')
      .neq('id', createdBy)

    if (usersError) {
      throw new Error(`Benutzer für Benachrichtigungen laden fehlgeschlagen: ${usersError.message}`)
    }
    if (allUsers && allUsers.length > 0) {
      const notifications = (allUsers as { id: string }[]).map((user) => ({
        user_id: user.id,
        version_id: versionId,
        is_read: false,
      }))

      // Batch-Insert version_notifications
      for (let i = 0; i < notifications.length; i += BATCH_SIZE) {
        const batch = notifications.slice(i, i + BATCH_SIZE)
        const { error: notifError } = await supabase
          .from('version_notifications')
          .insert((batch as Database['public']['Tables']['version_notifications']['Insert'][]) as never)

        if (notifError) {
          console.warn('Version-Notifications einfügen fehlgeschlagen:', notifError)
        } else {
          notificationCount += batch.length
        }
      }
    }
  } catch (err) {
    console.warn('Benachrichtigungen konnten nicht erstellt werden:', err)
    throw err
  }

  // 6. Nur aktuelle KW + 2 zurück behalten (max. 3 Versionen), Rest löschen
  const { data: allVersions, error: listError } = await supabase
    .from('versions')
    .select('id')
    .order('jahr', { ascending: false })
    .order('kw_nummer', { ascending: false })

  if (!listError && allVersions && allVersions.length > 3) {
    const toDelete = (allVersions as { id: string }[]).slice(3)
    for (const v of toDelete) {
      const { error: delError } = await supabase.from('versions').delete().eq('id', v.id)
      if (delError) console.warn('Alte Version löschen fehlgeschlagen:', v.id, delError)
    }
  }

  return {
    versionId,
    itemCount: items.length,
    notificationCount,
  }
}
