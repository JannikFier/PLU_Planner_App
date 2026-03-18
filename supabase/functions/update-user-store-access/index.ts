// Supabase Edge Function: Maerkte eines Users verwalten
// - Heimatmarkt setzen
// - weitere Maerkte hinzufuegen/entfernen
// Nur Admin / Super-Admin duerfen diese Funktion aufrufen.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

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
    const {
      data: { user: caller },
    } = await supabaseAdmin.auth.getUser(jwt)

    if (!caller) {
      return new Response(
        JSON.stringify({ error: 'Nicht authentifiziert' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Rolle des Aufrufers pruefen
    const { data: callerProfile, error: callerError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single()

    if (callerError || !callerProfile) {
      return new Response(
        JSON.stringify({ error: 'Aufrufer-Profil konnte nicht geladen werden.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const callerRole = callerProfile.role
    const isSuperAdmin = callerRole === 'super_admin'
    const isAdmin = callerRole === 'admin'

    if (!isAdmin && !isSuperAdmin) {
      return new Response(
        JSON.stringify({ error: 'Keine Berechtigung. Nur Admins koennen Marktzuweisungen aendern.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { user_id, home_store_id, additional_store_ids } = await req.json()

    if (!user_id || typeof user_id !== 'string') {
      return new Response(
        JSON.stringify({ error: 'user_id ist erforderlich.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!home_store_id || typeof home_store_id !== 'string') {
      return new Response(
        JSON.stringify({ error: 'home_store_id ist erforderlich.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const additionalStoreIds: string[] = Array.isArray(additional_store_ids)
      ? additional_store_ids.filter((id: unknown) => typeof id === 'string')
      : []

    const allStoreIds = [home_store_id, ...additionalStoreIds]

    // Alle Stores muessen existieren und aktiv sein
    const { data: stores, error: storesError } = await supabaseAdmin
      .from('stores')
      .select('id, is_active')
      .in('id', allStoreIds)

    if (storesError) {
      return new Response(
        JSON.stringify({ error: storesError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!stores || stores.length !== allStoreIds.length) {
      return new Response(
        JSON.stringify({ error: 'Mindestens einer der angegebenen Maerkte existiert nicht.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const inactiveStore = stores.find((s) => !s.is_active)
    if (inactiveStore) {
      return new Response(
        JSON.stringify({ error: 'Mindestens einer der angegebenen Maerkte ist pausiert.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Admin darf nur Maerkte zuweisen, auf die er selbst Zugriff hat
    if (!isSuperAdmin) {
      const { data: callerAccess, error: accessError } = await supabaseAdmin
        .from('user_store_access')
        .select('store_id')
        .eq('user_id', caller.id)

      if (accessError) {
        return new Response(
          JSON.stringify({ error: accessError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const callerStoreIds = new Set((callerAccess || []).map((row) => row.store_id))
      const unauthorized = allStoreIds.find((id) => !callerStoreIds.has(id))

      if (unauthorized) {
        return new Response(
          JSON.stringify({ error: 'Du kannst nur Maerkte zuweisen, auf die du selbst Zugriff hast.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Bestehende Zuweisungen des Ziel-Users loeschen
    const { error: deleteError } = await supabaseAdmin
      .from('user_store_access')
      .delete()
      .eq('user_id', user_id)

    if (deleteError) {
      return new Response(
        JSON.stringify({ error: deleteError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Neue Zuweisungen einfuegen (genau ein Heimatmarkt)
    const accessRows = [
      {
        user_id,
        store_id: home_store_id,
        is_home_store: true,
      },
      ...additionalStoreIds.map((storeId) => ({
        user_id,
        store_id: storeId,
        is_home_store: false,
      })),
    ]

    const { error: insertError } = await supabaseAdmin
      .from('user_store_access')
      .insert(accessRows)

    if (insertError) {
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // current_store_id des Ziel-Users auf Heimatmarkt setzen
    const { error: updateProfileError } = await supabaseAdmin
      .from('profiles')
      .update({ current_store_id: home_store_id })
      .eq('id', user_id)

    if (updateProfileError) {
      return new Response(
        JSON.stringify({ error: updateProfileError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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

