// Supabase Edge Function: Rolle eines Benutzers ändern (Super-Admin oder Admin)
// Wird von der App aufgerufen wenn Super-Admin oder Admin einen User hoch-/runterstuft.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { logAdminAction } from '../_shared/audit.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const ALLOWED_ROLES = ['user', 'admin', 'viewer'] as const

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const authHeader = req.headers.get('Authorization') ?? req.headers.get('authorization')
    const jwt = authHeader?.replace(/^Bearer\s+/i, '').trim()
    if (!jwt) {
      return new Response(
        JSON.stringify({ error: 'Authorization-Header fehlt' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(jwt)

    if (authError || !caller) {
      return new Response(
        JSON.stringify({ error: authError?.message ?? 'Nicht authentifiziert' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single()

    if (!callerProfile || (callerProfile.role !== 'super_admin' && callerProfile.role !== 'admin')) {
      return new Response(
        JSON.stringify({ error: 'Nur Super-Admins und Admins dürfen Rollen ändern.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { userId, newRole } = await req.json()

    if (!userId || typeof userId !== 'string') {
      return new Response(
        JSON.stringify({ error: 'userId ist erforderlich.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!ALLOWED_ROLES.includes(newRole)) {
      return new Response(
        JSON.stringify({ error: 'Ungültige Rolle. Erlaubt: user, admin, viewer.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Aufrufer darf sich nicht selbst aendern
    if (userId === caller.id) {
      return new Response(
        JSON.stringify({ error: 'Sie können Ihre eigene Rolle nicht ändern.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Super-Admin-Rolle darf nicht geaendert werden
    const { data: targetProfile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (!targetProfile) {
      return new Response(
        JSON.stringify({ error: 'Benutzer nicht gefunden.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (targetProfile.role === 'super_admin') {
      return new Response(
        JSON.stringify({ error: 'Super-Admin Rolle kann nicht geändert werden.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Admin darf nur Rollen von Benutzern derselben Firma aendern (RPC braucht User-JWT fuer auth.uid())
    // Super-Admin agiert global (by design) - hier KEIN Same-Company-Check, dafür Audit-Log unten.
    if (callerProfile.role === 'admin') {
      const supabaseUser = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: `Bearer ${jwt}` } } }
      )
      const { data: sameCompany, error: rpcError } = await supabaseUser.rpc('is_same_company_user', {
        target_user_id: userId,
      })
      if (rpcError || !sameCompany) {
        return new Response(
          JSON.stringify({ error: 'Sie können nur Rollen von Benutzern derselben Firma ändern.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    const oldRole = targetProfile.role as string

    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId)

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Audit-Log: Companies via aktuellem Markt jedes Users ableiten (current_store_id → stores.company_id).
    // Best-Effort: Fehler beim Logging brechen die Operation NICHT ab.
    try {
      const [actorStoreRes, targetStoreRes] = await Promise.all([
        supabaseAdmin.from('profiles').select('current_store_id').eq('id', caller.id).maybeSingle(),
        supabaseAdmin.from('profiles').select('current_store_id').eq('id', userId).maybeSingle(),
      ])
      const actorStoreId = (actorStoreRes.data as { current_store_id: string | null } | null)?.current_store_id ?? null
      const targetStoreId = (targetStoreRes.data as { current_store_id: string | null } | null)?.current_store_id ?? null

      const storeIds = [actorStoreId, targetStoreId].filter((s): s is string => Boolean(s))
      let actorCompanyId: string | null = null
      let targetCompanyId: string | null = null
      if (storeIds.length > 0) {
        const { data: storeRows } = await supabaseAdmin
          .from('stores')
          .select('id, company_id')
          .in('id', storeIds)
        const byId = new Map((storeRows ?? []).map((r: { id: string; company_id: string }) => [r.id, r.company_id]))
        actorCompanyId = actorStoreId ? byId.get(actorStoreId) ?? null : null
        targetCompanyId = targetStoreId ? byId.get(targetStoreId) ?? null : null
      }

      const crossCompany = Boolean(actorCompanyId && targetCompanyId && actorCompanyId !== targetCompanyId)

      await supabaseAdmin.from('role_change_audit').insert({
        actor_user_id: caller.id,
        actor_role: callerProfile.role,
        actor_company_id: actorCompanyId,
        target_user_id: userId,
        target_company_id: targetCompanyId,
        old_role: oldRole,
        new_role: newRole,
        cross_company: crossCompany,
      })
    } catch (auditErr) {
      console.error('[update-user-role] audit log failed:', auditErr)
    }

    await logAdminAction(supabaseAdmin, {
      actorUserId: caller.id,
      actorRole: callerProfile.role,
      actionType: 'user.role_update',
      targetUserId: userId,
      details: { old_role: oldRole, new_role: newRole },
    })

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err ?? 'Unbekannter Fehler')
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
