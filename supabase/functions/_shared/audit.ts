// Audit-Helper für privilegierte Edge-Function-Aktionen.
// Schreibt einen Eintrag in admin_action_audit (Migration 086).
// Best-Effort: Fehler beim Logging brechen die Hauptaktion NICHT ab — sie werden nur in console.error protokolliert.

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export type LogAdminActionParams = {
  /** Auth-UID des Aufrufers */
  actorUserId: string
  /** Aktuelle Rolle des Aufrufers (super_admin | admin) */
  actorRole: string
  /** Was wurde getan, Format: 'resource.verb' (z.B. 'user.delete', 'kiosk_register.update') */
  actionType: string
  /** Falls die Aktion einen User betrifft (für Companies-Lookup und cross_company-Flag) */
  targetUserId?: string | null
  /** Falls die Aktion eine spezifische Ressource betrifft (z.B. kiosk_register.id) */
  targetResourceId?: string | null
  /** Optional Extra-Kontext, z.B. {old_role, new_role} oder {store_ids: [...]} */
  details?: Record<string, unknown>
}

/**
 * Versucht den Vorgang in admin_action_audit zu loggen.
 * Companies werden via profiles.current_store_id → stores.company_id ermittelt.
 * Schlägt der Insert fehl, wird nur console.error geloggt — die Hauptaktion läuft trotzdem durch.
 */
export async function logAdminAction(
  supabaseAdmin: SupabaseClient,
  params: LogAdminActionParams,
): Promise<void> {
  try {
    const { actorUserId, actorRole, actionType, targetUserId, targetResourceId, details } = params

    // Actor- und Target-Companies via current_store_id ableiten (in einem Round-Trip).
    const userIds = [actorUserId, targetUserId].filter((u): u is string => Boolean(u))
    const profileRes = await supabaseAdmin
      .from('profiles')
      .select('id, current_store_id')
      .in('id', userIds)
    const profiles = (profileRes.data ?? []) as { id: string; current_store_id: string | null }[]
    const profileById = new Map(profiles.map((p) => [p.id, p.current_store_id]))

    const actorStoreId = profileById.get(actorUserId) ?? null
    const targetStoreId = targetUserId ? profileById.get(targetUserId) ?? null : null

    const storeIds = [actorStoreId, targetStoreId].filter((s): s is string => Boolean(s))
    let actorCompanyId: string | null = null
    let targetCompanyId: string | null = null
    if (storeIds.length > 0) {
      const storeRes = await supabaseAdmin
        .from('stores')
        .select('id, company_id')
        .in('id', storeIds)
      const rows = (storeRes.data ?? []) as { id: string; company_id: string }[]
      const storeById = new Map(rows.map((s) => [s.id, s.company_id]))
      actorCompanyId = actorStoreId ? storeById.get(actorStoreId) ?? null : null
      targetCompanyId = targetStoreId ? storeById.get(targetStoreId) ?? null : null
    }

    const crossCompany = Boolean(
      actorCompanyId && targetCompanyId && actorCompanyId !== targetCompanyId,
    )

    await supabaseAdmin.from('admin_action_audit').insert({
      actor_user_id: actorUserId,
      actor_role: actorRole,
      actor_company_id: actorCompanyId,
      action_type: actionType,
      target_user_id: targetUserId ?? null,
      target_company_id: targetCompanyId,
      target_resource_id: targetResourceId ?? null,
      details: details ?? null,
      cross_company: crossCompany,
    })
  } catch (err) {
    console.error('[audit] logAdminAction failed:', err)
  }
}
