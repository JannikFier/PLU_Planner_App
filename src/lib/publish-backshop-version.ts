// Backshop-Version veröffentlichen: Version anlegen, Items schreiben (ohne Benachrichtigungen in Phase 3)

import { PUBLISH_BATCH_SIZE } from '@/lib/constants'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'
import type { BackshopCompareItem } from '@/types/plu'

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

type ActiveBackshopItem = Pick<
  Database['public']['Tables']['backshop_master_plu_items']['Row'],
  'plu' | 'system_name' | 'block_id'
>

function normalizeName(name: string): string {
  return name.trim().toLowerCase()
}

// Umbenennungen sind jetzt global (backshop_renamed_items) – werden nicht mehr pro Version übernommen

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

  // Vor dem Einfrieren die aktuell aktive Version und ihre Items laden,
  // damit Warengruppen-Zuordnungen in die neue KW übernommen werden können.
  // Umbenennungen sind global (backshop_renamed_items) und werden nicht pro Version übernommen.
  const { data: activeVersionRow, error: activeVersionErr } = await supabase
    .from('backshop_versions')
    .select('id')
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()
  if (activeVersionErr) {
    throw new Error(`Aktive Backshop-Version suchen fehlgeschlagen: ${activeVersionErr.message}`)
  }
  const activeVersionId = (activeVersionRow as { id: string } | null)?.id ?? null

  let activeItems: ActiveBackshopItem[] = []
  if (activeVersionId) {
    const { data: activeItemRows, error: activeItemsErr } = await supabase
      .from('backshop_master_plu_items')
      .select('plu, system_name, block_id')
      .eq('version_id', activeVersionId)
    if (activeItemsErr) {
      throw new Error(`Aktive Backshop-Items laden fehlgeschlagen: ${activeItemsErr.message}`)
    }
    activeItems = (activeItemRows ?? []) as ActiveBackshopItem[]
  }

  const activeByPlu = new Map<string, ActiveBackshopItem>()
  for (const it of activeItems) activeByPlu.set(it.plu, it)

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
    block_id: (item.block_id ?? null) as string | null,
    is_manually_renamed: item.is_manually_renamed ?? false,
    image_url: item.image_url ?? null,
  }))

  // Übernahme: block_id aus aktiver Version (PLU-Match oder eindeutiger Name-Match).
  // display_name/is_manually_renamed kommen aus backshop_renamed_items (global), nicht aus alter Version.
  const activeUniqueByName = new Map<string, ActiveBackshopItem | null>()
  const counts = new Map<string, number>()
  for (const it of activeItems) {
    const key = normalizeName(it.system_name)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  for (const it of activeItems) {
    const key = normalizeName(it.system_name)
    activeUniqueByName.set(key, (counts.get(key) ?? 0) === 1 ? it : null)
  }
  for (const row of rows) {
    const fromPlu = activeByPlu.get(row.plu) ?? null
    const fromName = fromPlu ? null : (activeUniqueByName.get(normalizeName(row.system_name)) ?? null)
    const source = fromPlu ?? fromName
    if (source) {
      row.block_id = source.block_id ?? null
    }
  }

  for (let i = 0; i < rows.length; i += PUBLISH_BATCH_SIZE) {
    const batch = rows.slice(i, i + PUBLISH_BATCH_SIZE)
    const { error: insertErr } = await supabase
      .from('backshop_master_plu_items')
      .insert((batch as Database['public']['Tables']['backshop_master_plu_items']['Insert'][]) as never)

    if (insertErr) {
      await supabase.from('backshop_versions').delete().eq('id', versionId)
      throw new Error(`Backshop-Items einfügen fehlgeschlagen (Batch ${Math.floor(i / PUBLISH_BATCH_SIZE) + 1}): ${insertErr.message}`)
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
      for (let i = 0; i < notifications.length; i += PUBLISH_BATCH_SIZE) {
        const batch = notifications.slice(i, i + PUBLISH_BATCH_SIZE)
        await supabase
          .from('backshop_version_notifications')
          .insert((batch as Database['public']['Tables']['backshop_version_notifications']['Insert'][]) as never)
      }
    }
  } catch {
    // Nicht kritisch – Upload war erfolgreich
  }

  return { versionId, itemCount: items.length }
}
