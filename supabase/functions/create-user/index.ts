// Supabase Edge Function: Neuen User anlegen
// Wird von der App aufgerufen wenn Admin/Super-Admin einen User erstellt.
// Braucht den SUPABASE_SERVICE_ROLE_KEY (automatisch in Edge Functions verfügbar).

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Admin Client mit Service Role Key (hat volle Rechte)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Aufrufer authentifizieren
    const authHeader = req.headers.get('Authorization') ?? req.headers.get('authorization')
    const jwt = authHeader?.replace(/^Bearer\s+/i, '').trim()
    if (!jwt) {
      return new Response(
        JSON.stringify({ error: 'Authorization-Header fehlt' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(jwt)

    if (!caller) {
      return new Response(
        JSON.stringify({ error: 'Nicht authentifiziert' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Rolle des Aufrufers prüfen
    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single()

    if (!callerProfile || (callerProfile.role !== 'super_admin' && callerProfile.role !== 'admin')) {
      return new Response(
        JSON.stringify({ error: 'Keine Berechtigung. Nur Admins können Benutzer erstellen.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Request Body lesen
    const {
      email,
      password,
      personalnummer,
      displayName,
      role,
      home_store_id,
      additional_store_ids,
    } = await req.json()

    const emailTrimmed = typeof email === 'string' ? email.trim() : ''
    const personalnummerTrimmed = typeof personalnummer === 'string' ? personalnummer.trim() : ''

    // Mindestens eines von Personalnummer oder E-Mail erforderlich
    if (!emailTrimmed && !personalnummerTrimmed) {
      return new Response(
        JSON.stringify({ error: 'Mindestens eines von Personalnummer oder E-Mail muss angegeben werden.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Nur Super-Admin darf Admin oder Viewer erstellen; Admin darf nur User erstellen
    if ((role === 'admin' || role === 'viewer') && callerProfile.role !== 'super_admin') {
      return new Response(
        JSON.stringify({ error: 'Nur Super-Admins können Admins oder Viewer erstellen.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Super-Admin kann nicht über diese Funktion erstellt werden
    if (role === 'super_admin') {
      return new Response(
        JSON.stringify({ error: 'Super-Admin kann nicht über diese Funktion erstellt werden.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Erlaubte Rollen: user, admin, viewer (super_admin bereits oben abgefangen)
    const allowedRoles = ['user', 'admin', 'viewer'] as const
    const roleToSet = allowedRoles.includes(role) ? role : 'user'

    // home_store_id ist Pflicht
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

    // Stores muessen existieren und aktiv sein
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
        JSON.stringify({ error: 'Mindestens einer der angegebenen Märkte existiert nicht.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const inactiveStore = stores.find((s) => !s.is_active)
    if (inactiveStore) {
      return new Response(
        JSON.stringify({ error: 'Mindestens einer der angegebenen Märkte ist pausiert.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Auth-E-Mail: E-Mail wenn angegeben, sonst Personalnummer@plu-planner.local
    const authEmail = emailTrimmed
      ? emailTrimmed
      : `${personalnummerTrimmed}@plu-planner.local`

    // Metadata personalnummer: echte Nummer oder Platzhalter (DB NOT NULL)
    const metadataPersonalnummer = personalnummerTrimmed
      ? personalnummerTrimmed
      : `email-${crypto.randomUUID()}`

    // User in Supabase Auth erstellen
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: authEmail,
      password,
      email_confirm: true, // Keine Email-Bestätigung nötig
      user_metadata: {
        personalnummer: metadataPersonalnummer,
        display_name: displayName || '',
        role: roleToSet,
        must_change_password: true,
      },
    })

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // must_change_password in profiles setzen (falls Trigger es nicht gesetzt hat)
    if (data.user) {
      // Profil aktualisieren (created_by, must_change_password)
      await supabaseAdmin
        .from('profiles')
        .update({
          must_change_password: true,
          created_by: caller.id,
        })
        .eq('id', data.user.id)

      // user_store_access: Heimatmarkt + zusaetzliche Maerkte
      const accessRows = [
        {
          user_id: data.user.id,
          store_id: home_store_id,
          is_home_store: true,
        },
        ...additionalStoreIds.map((storeId) => ({
          user_id: data.user.id,
          store_id: storeId,
          is_home_store: false,
        })),
      ]

      const { error: accessError } = await supabaseAdmin
        .from('user_store_access')
        .insert(accessRows)

      if (accessError) {
        return new Response(
          JSON.stringify({ error: accessError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // current_store_id im Profil auf Heimatmarkt setzen
      await supabaseAdmin
        .from('profiles')
        .update({ current_store_id: home_store_id })
        .eq('id', data.user.id)
    }

    return new Response(
      JSON.stringify({ user: data.user }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
