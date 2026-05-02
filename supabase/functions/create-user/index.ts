// Supabase Edge Function: Neuen User anlegen
// Wird von der App aufgerufen wenn Admin/Super-Admin einen User erstellt.
// Braucht den SUPABASE_SERVICE_ROLE_KEY (automatisch in Edge Functions verfügbar).

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { logAdminAction } from '../_shared/audit.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

/** Bekannte Fehlermeldungen in verstaendliche deutsche Texte uebersetzen */
function translateCreateUserError(msg: string): string {
  const lower = msg.toLowerCase()
  if (lower.includes('user already registered') || lower.includes('already been registered')) {
    return 'Diese E-Mail-Adresse wird bereits verwendet.'
  }
  if (lower.includes('user already exists') || lower.includes('already exists')) {
    return 'Ein Benutzer mit dieser E-Mail-Adresse existiert bereits.'
  }
  if (lower.includes('personalnummer') && lower.includes('unique')) {
    return 'Diese Personalnummer wird bereits verwendet.'
  }
  if (lower.includes('duplicate key') && lower.includes('personalnummer')) {
    return 'Diese Personalnummer wird bereits verwendet.'
  }
  if (lower.includes('duplicate key') && lower.includes('profiles')) {
    return 'Diese Personalnummer oder E-Mail wird bereits verwendet.'
  }
  if (lower.includes('gleichen firma') || lower.includes('same company')) {
    return 'Alle Märkte müssen derselben Firma angehören.'
  }
  return msg
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

    // Super-Admin kann nicht über diese Funktion erstellt werden
    if (role === 'super_admin') {
      return new Response(
        JSON.stringify({ error: 'Super-Admin kann nicht über diese Funktion erstellt werden.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Erlaubte Rollen: user, admin, viewer (super_admin bereits oben abgefangen)
    const allowedRoles = ['user', 'admin', 'viewer'] as const
    if (!allowedRoles.includes(role)) {
      return new Response(
        JSON.stringify({ error: 'Ungültige Rolle. Erlaubt: user, admin, viewer.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const roleToSet = role

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

    // Stores muessen existieren, aktiv sein und alle derselben Firma angehoeren
    const { data: stores, error: storesError } = await supabaseAdmin
      .from('stores')
      .select('id, is_active, company_id')
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

    const companyIds = [...new Set(stores.map((s) => s.company_id))]
    if (companyIds.length > 1) {
      return new Response(
        JSON.stringify({ error: 'Alle Märkte müssen derselben Firma angehören.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Admin darf nur Benutzer in Maerkten anlegen, auf die er Zugriff hat
    if (callerProfile.role === 'admin') {
      const { data: callerAccess } = await supabaseAdmin
        .from('user_store_access')
        .select('store_id')
        .eq('user_id', caller.id)
      const callerStoreIds = new Set((callerAccess || []).map((r: { store_id: string }) => r.store_id))
      const unauthorized =
        !callerStoreIds.has(home_store_id) ||
        additionalStoreIds.some((id: string) => !callerStoreIds.has(id))
      if (unauthorized) {
        return new Response(
          JSON.stringify({
            error: 'Du kannst nur Benutzer in Märkten anlegen, auf die du Zugriff hast.',
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
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
      const userMessage = translateCreateUserError(error.message)
      return new Response(
        JSON.stringify({ error: userMessage }),
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
        const userMessage = translateCreateUserError(accessError.message)
        return new Response(
          JSON.stringify({ error: userMessage }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // current_store_id im Profil auf Heimatmarkt setzen
      await supabaseAdmin
        .from('profiles')
        .update({ current_store_id: home_store_id })
        .eq('id', data.user.id)

      await logAdminAction(supabaseAdmin, {
        actorUserId: caller.id,
        actorRole: callerProfile.role,
        actionType: 'user.create',
        targetUserId: data.user.id,
        details: {
          role: roleToSet,
          home_store_id,
          additional_store_ids: additionalStoreIds,
        },
      })
    }

    return new Response(
      JSON.stringify({ user: data.user }),
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
