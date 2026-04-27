// Backshop-Version veröffentlichen: Version anlegen, Items schreiben (ohne Benachrichtigungen in Phase 3)

import { PUBLISH_BATCH_SIZE } from '@/lib/constants'
import { fetchStoreNotificationRecipientUserIds } from '@/lib/notification-recipient-ids'
import { reconcileBackshopManualSupplementsAfterPublish } from '@/lib/manual-supplement-publish'
import { supabase } from '@/lib/supabase'
import { normalizeBackshopGroupName, type BackshopExcelSource } from '@/lib/backshop-sources'
import type { BackshopSource, Database } from '@/types/database'
import type { BackshopCompareItem } from '@/types/plu'

export interface PublishBackshopInput {
  kwNummer: number
  jahr: number
  items: BackshopCompareItem[]
  createdBy: string
  storeId: string
  replaceExistingVersion?: boolean
  /** Quelle des Uploads: edeka | harry | aryzta. Default: 'edeka'. */
  source?: BackshopExcelSource
}

export interface PublishBackshopResult {
  versionId: string
  itemCount: number
}

type ActiveBackshopItem = Pick<
  Database['public']['Tables']['backshop_master_plu_items']['Row'],
  'plu' | 'system_name' | 'block_id' | 'source'
>

type FullActiveBackshopItem = Database['public']['Tables']['backshop_master_plu_items']['Row']

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
  // Advisory Lock (Key 2 = Backshop, Key 1 = Obst)
  const { data: lockAcquired, error: lockError } = await supabase.rpc('acquire_publish_lock', { lock_key: 2 } as never)
  if (lockError) {
    throw new Error(`Publish-Lock konnte nicht geprüft werden: ${lockError.message}`)
  }
  if (!lockAcquired) {
    throw new Error('Eine andere Veröffentlichung läuft gerade. Bitte warte einen Moment und versuche es erneut.')
  }

  try {
    return await _doPublishBackshop(input)
  } finally {
    try {
      await supabase.rpc('release_publish_lock', { lock_key: 2 } as never)
    } catch {
      // Lock-Release fehlgeschlagen – wird beim naechsten Publish automatisch freigegeben
    }
  }
}

async function _doPublishBackshop(input: PublishBackshopInput): Promise<PublishBackshopResult> {
  const { kwNummer, jahr, items, createdBy, storeId, replaceExistingVersion } = input
  const source: BackshopExcelSource = input.source ?? 'edeka'

  // Vor dem Einfrieren die aktuell aktive Version und ihre Items laden,
  // damit Warengruppen-Zuordnungen in die neue KW übernommen werden können
  // und Items ANDERER Quellen in die neue Version übernommen werden.
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
  // Items anderer Quellen werden komplett übernommen (mit allen Feldern).
  let activeItemsOtherSources: FullActiveBackshopItem[] = []
  if (activeVersionId) {
    const { data: activeItemRows, error: activeItemsErr } = await supabase
      .from('backshop_master_plu_items')
      .select('*')
      .eq('version_id', activeVersionId)
    if (activeItemsErr) {
      throw new Error(`Aktive Backshop-Items laden fehlgeschlagen: ${activeItemsErr.message}`)
    }
    const all = (activeItemRows ?? []) as FullActiveBackshopItem[]
    activeItems = all
      .filter((it) => (it.source ?? 'edeka') === source)
      .map((it) => ({ plu: it.plu, system_name: it.system_name, block_id: it.block_id, source: it.source ?? 'edeka' }))
    activeItemsOtherSources = all.filter((it) => (it.source ?? 'edeka') !== source)
  }

  // Ziel-KW laden (vor replaceExistingVersion-Löschung): Merge (plu, source) aus Active + Ziel, Ziel hat Vorrang —
  // so bleiben andere Marken bit-genau erhalten, wenn die Ziel-KW nicht die aktive Version ist.
  const { data: targetVersionRow, error: targetVerErr } = await supabase
    .from('backshop_versions')
    .select('id')
    .eq('kw_nummer', kwNummer)
    .eq('jahr', jahr)
    .maybeSingle()
  if (targetVerErr) {
    throw new Error(`Ziel-Backshop-Version suchen fehlgeschlagen: ${targetVerErr.message}`)
  }
  const targetVersionId = (targetVersionRow as { id: string } | null)?.id ?? null

  let targetOtherRows: FullActiveBackshopItem[] = []
  if (targetVersionId && targetVersionId !== activeVersionId) {
    const { data: targetItemRows, error: targetItemsErr } = await supabase
      .from('backshop_master_plu_items')
      .select('*')
      .eq('version_id', targetVersionId)
    if (targetItemsErr) {
      throw new Error(`Ziel-KW Backshop-Items laden fehlgeschlagen: ${targetItemsErr.message}`)
    }
    targetOtherRows = ((targetItemRows ?? []) as FullActiveBackshopItem[]).filter(
      (it) => (it.source ?? 'edeka') !== source,
    )
  }

  const mergedByKey = new Map<string, FullActiveBackshopItem>()
  for (const it of activeItemsOtherSources) {
    mergedByKey.set(`${it.plu}|${it.source ?? 'edeka'}`, it)
  }
  for (const it of targetOtherRows) {
    mergedByKey.set(`${it.plu}|${it.source ?? 'edeka'}`, it)
  }
  const mergedOtherSources = Array.from(mergedByKey.values())

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
    source,
    is_manual_supplement: item.is_manual_supplement ?? false,
  }))

  // Items anderer Quellen 1:1 in die neue Version mitnehmen, damit sie erhalten bleiben.
  const otherSourceRows = mergedOtherSources.map((it) => ({
    version_id: versionId,
    plu: it.plu,
    system_name: it.system_name,
    display_name: it.display_name ?? null,
    status: it.status,
    old_plu: it.old_plu ?? null,
    warengruppe: it.warengruppe ?? null,
    block_id: it.block_id ?? null,
    is_manually_renamed: it.is_manually_renamed ?? false,
    image_url: it.image_url ?? null,
    source: it.source ?? 'edeka',
    is_manual_supplement: it.is_manual_supplement ?? false,
  }))

  // Übernahme: fehlende block_id aus aktiver Version (PLU-Match oder eindeutiger Name-Match).
  // Bereits gesetzte Gruppe aus dem Upload bleibt erhalten (Wizard hat Vorrang).
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
    const carryOver = fromPlu ?? fromName
    if (carryOver) {
      const incomingBlock = row.block_id ?? null
      const carryBlock = carryOver.block_id ?? null
      // Upload-/Wizard-Zuordnung hat Vorrang; Carry-over füllt nur, wenn noch keine Gruppe gesetzt ist.
      row.block_id = incomingBlock ?? carryBlock
    }
  }

  // Rows + Items anderer Quellen gemeinsam einfügen
  const allRows = [...rows, ...otherSourceRows]
  for (let i = 0; i < allRows.length; i += PUBLISH_BATCH_SIZE) {
    const batch = allRows.slice(i, i + PUBLISH_BATCH_SIZE)
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

  const publishMetaRow: Database['public']['Tables']['backshop_version_source_publish']['Insert'] = {
    version_id: versionId,
    source,
    published_at: new Date().toISOString(),
    published_by: createdBy,
    row_count: rows.length,
  }
  const { error: publishMetaErr } = await supabase
    .from('backshop_version_source_publish')
    .upsert(publishMetaRow as never, { onConflict: 'version_id,source' })
  if (publishMetaErr) {
    if (import.meta.env.DEV) {
      console.warn('backshop_version_source_publish upsert:', publishMetaErr.message)
    }
  }

  try {
    const allPlu = allRows.map((r) => r.plu)
    await reconcileBackshopManualSupplementsAfterPublish(supabase, activeVersionId, allPlu)
  } catch (e) {
    if (import.meta.env.DEV) console.warn('Manuelle Backshop-Supplemente bereinigen:', e)
  }

  if (activeVersionId) {
    const { error: carryDelErr } = await supabase
      .from('store_list_carryover')
      .delete()
      .eq('list_type', 'backshop')
      .eq('for_version_id', activeVersionId)
    if (carryDelErr && import.meta.env.DEV) {
      console.warn('Backshop-Carryover für vorherige Version löschen:', carryDelErr.message)
    }
  }

  // Automatisches Gruppen-Matching: Items mit gleichem normalisierten Namen aus
  // unterschiedlichen Quellen werden zu einer Produktgruppe verbunden.
  try {
    await syncProductGroupsAfterPublish(versionId)
  } catch (err) {
    // Nicht kritisch – Publish war erfolgreich. Super-Admin kann später manuell korrigieren.
    if (import.meta.env.DEV) console.warn('Produktgruppen-Sync fehlgeschlagen:', err)
  }

  // Benachrichtigungen: Admin + User am Markt (ohne Viewer, ohne Uploader)
  try {
    const recipientIds = await fetchStoreNotificationRecipientUserIds(supabase, storeId, createdBy)
    if (recipientIds.length > 0) {
      const notifications = recipientIds.map((userId) => ({
        user_id: userId,
        version_id: versionId,
        is_read: false,
        store_id: storeId,
      }))
      for (let i = 0; i < notifications.length; i += PUBLISH_BATCH_SIZE) {
        const batch = notifications.slice(i, i + PUBLISH_BATCH_SIZE)
        const { error: notifErr } = await supabase
          .from('backshop_version_notifications')
          .insert((batch as Database['public']['Tables']['backshop_version_notifications']['Insert'][]) as never)
        if (notifErr && import.meta.env.DEV) {
          console.warn('Backshop-Benachrichtigungen konnten nicht erstellt werden:', notifErr.message)
        }
      }
    }
  } catch {
    // Nicht kritisch – Upload war erfolgreich
  }

  return { versionId, itemCount: items.length }
}

type GroupCandidateItem = {
  plu: string
  system_name: string
  source: BackshopSource
  block_id: string | null
}

/**
 * Synchronisiert automatisch erzeugte Produktgruppen mit dem aktuellen Stand der Version.
 * Regel: Gleicher normalisierter Artikelname + unterschiedliche Quellen → Gruppe.
 * Bestehende manuell angelegte Gruppen (origin='manual') werden nicht verändert, neue
 * Members können aber hinzugefügt werden, wenn die PLU zu einem vorhandenen Member passt.
 */
async function syncProductGroupsAfterPublish(versionId: string): Promise<void> {
  const { data: rawItems, error: itemsErr } = await supabase
    .from('backshop_master_plu_items')
    .select('plu, system_name, source, block_id')
    .eq('version_id', versionId)
  if (itemsErr || !rawItems) return
  const items: GroupCandidateItem[] = (rawItems as Array<{
    plu: string
    system_name: string
    source: BackshopSource | null
    block_id: string | null
  }>).map((it) => ({
    plu: it.plu,
    system_name: it.system_name,
    source: (it.source ?? 'edeka') as BackshopSource,
    block_id: it.block_id,
  }))

  // Bestehende Members laden (global, nicht nur Version)
  const { data: existingMembers } = await supabase
    .from('backshop_product_group_members')
    .select('group_id, plu, source')
  const memberByKey = new Map<string, string>()
  for (const m of (existingMembers ?? []) as Array<{ group_id: string; plu: string; source: BackshopSource }>) {
    memberByKey.set(`${m.plu}|${m.source}`, m.group_id)
  }

  // Nach normalisiertem Namen gruppieren
  const byNorm = new Map<string, GroupCandidateItem[]>()
  for (const it of items) {
    if ((it.source ?? 'edeka') === 'manual') continue
    const key = normalizeBackshopGroupName(it.system_name)
    if (!key) continue
    const arr = byNorm.get(key)
    if (arr) arr.push(it)
    else byNorm.set(key, [it])
  }

  for (const [, groupItems] of byNorm) {
    const distinctSources = new Set(groupItems.map((it) => it.source))
    if (distinctSources.size < 2) continue

    // Existiert schon eine Gruppe für eines dieser Items?
    let groupId: string | null = null
    for (const it of groupItems) {
      const existing = memberByKey.get(`${it.plu}|${it.source}`)
      if (existing) {
        groupId = existing
        break
      }
    }

    if (!groupId) {
      const displayName = groupItems[0].system_name
      const blockId = groupItems.find((it) => it.block_id)?.block_id ?? null
      const { data: newGroup, error: insertErr } = await supabase
        .from('backshop_product_groups')
        .insert(({
          display_name: displayName,
          origin: 'auto',
          needs_review: false,
          block_id: blockId,
        } as Database['public']['Tables']['backshop_product_groups']['Insert']) as never)
        .select('id')
        .single()
      if (insertErr || !newGroup) continue
      groupId = (newGroup as { id: string }).id
    }

    const memberRows = groupItems.map((it) => ({
      group_id: groupId!,
      plu: it.plu,
      source: it.source,
    }))
    await supabase
      .from('backshop_product_group_members')
      .upsert(
        (memberRows as Database['public']['Tables']['backshop_product_group_members']['Insert'][]) as never,
        { onConflict: 'group_id,plu,source' }
      )

    for (const m of memberRows) {
      memberByKey.set(`${m.plu}|${m.source}`, groupId!)
    }
  }
}
