// Legt eine neue Kasse an: Auth-User (interne E-Mail) + user_store_access + store_kiosk_registers.
// Optional: legt ersten store_kiosk_entrances-Eintrag an, falls noch keiner existiert.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, prefer, range, x-supabase-api-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

function randomTokenHex(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const authHeader = req.headers.get('Authorization') ?? req.headers.get('authorization')
    const jwt = authHeader?.replace(/^Bearer\s+/i, '').trim()
    if (!jwt) {
      return new Response(
        JSON.stringify({ error: 'Authorization-Header fehlt' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(jwt)
    if (!caller) {
      return new Response(
        JSON.stringify({ error: 'Nicht authentifiziert' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const { data: callerProfile } = await supabaseAdmin.from('profiles').select('role').eq('id', caller.id).single()
    if (!callerProfile || (callerProfile.role !== 'super_admin' && callerProfile.role !== 'admin')) {
      return new Response(
        JSON.stringify({ error: 'Keine Berechtigung.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const body = await req.json().catch(() => ({}))
    const storeId = typeof body.store_id === 'string' ? body.store_id.trim() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    /** Optionale Nummer fuer die neue Kasse (nur die naechsten drei freien Plaetze). */
    const rawSort = body.sort_order
    if (!storeId || !password || password.length < 4) {
      return new Response(
        JSON.stringify({ error: 'store_id und Passwort (mindestens 4 Zeichen) sind erforderlich.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (callerProfile.role === 'admin') {
      const { data: access } = await supabaseAdmin
        .from('user_store_access')
        .select('store_id')
        .eq('user_id', caller.id)
      const ids = new Set((access ?? []).map((r: { store_id: string }) => r.store_id))
      if (!ids.has(storeId)) {
        return new Response(
          JSON.stringify({ error: 'Kein Zugriff auf diesen Markt.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
    }

    const { data: store, error: sErr } = await supabaseAdmin
      .from('stores')
      .select('id, is_active')
      .eq('id', storeId)
      .single()
    if (sErr || !store?.is_active) {
      return new Response(
        JSON.stringify({ error: 'Markt nicht gefunden oder pausiert.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const { data: kioskVis } = await supabaseAdmin
      .from('store_list_visibility')
      .select('is_visible')
      .eq('store_id', storeId)
      .eq('list_type', 'kiosk')
      .maybeSingle()

    if (kioskVis && kioskVis.is_visible === false) {
      return new Response(
        JSON.stringify({ error: 'Kassenmodus ist für diesen Markt nicht freigeschaltet.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const { data: existingEnt } = await supabaseAdmin
      .from('store_kiosk_entrances')
      .select('id, token')
      .eq('store_id', storeId)
      .is('revoked_at', null)
      .maybeSingle()

    let entranceToken = existingEnt?.token as string | undefined
    if (!existingEnt) {
      entranceToken = randomTokenHex()
      const { error: entErr } = await supabaseAdmin.from('store_kiosk_entrances').insert({
        store_id: storeId,
        token: entranceToken,
      })
      if (entErr) {
        return new Response(
          JSON.stringify({ error: entErr.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
    }

    const { data: maxRow } = await supabaseAdmin
      .from('store_kiosk_registers')
      .select('sort_order')
      .eq('store_id', storeId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle()

    const autoNext = (maxRow?.sort_order ?? 0) + 1
    let sortOrder = autoNext
    if (rawSort !== undefined && rawSort !== null && rawSort !== '') {
      const n = typeof rawSort === 'number' ? rawSort : parseInt(String(rawSort), 10)
      if (!Number.isFinite(n) || n < 1) {
        return new Response(
          JSON.stringify({ error: 'Ungültige Kassen-Nummer (sort_order).' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
      if (n < autoNext || n > autoNext + 2) {
        return new Response(
          JSON.stringify({
            error: `Kasse nur als Nummer ${autoNext}, ${autoNext + 1} oder ${autoNext + 2} anlegbar.`,
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
      sortOrder = n
    }

    const { data: clash } = await supabaseAdmin
      .from('store_kiosk_registers')
      .select('id')
      .eq('store_id', storeId)
      .eq('sort_order', sortOrder)
      .maybeSingle()
    if (clash) {
      return new Response(
        JSON.stringify({ error: `Die Nummer „Kasse ${sortOrder}“ ist bereits vergeben.` }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const displayLabel = `Kasse ${sortOrder}`

    const regId = crypto.randomUUID().replace(/-/g, '')
    const email = `kiosk_reg_${regId}@example.com`

    const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: displayLabel,
        personalnummer: '',
        role: 'kiosk',
        must_change_password: false,
      },
    })

    if (cErr || !created.user) {
      return new Response(
        JSON.stringify({ error: cErr?.message ?? 'Benutzer konnte nicht angelegt werden.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const userId = created.user.id

    await supabaseAdmin.from('profiles').update({
      role: 'kiosk',
      must_change_password: false,
      current_store_id: storeId,
      display_name: displayLabel,
    }).eq('id', userId)

    const { error: usaErr } = await supabaseAdmin.from('user_store_access').insert({
      user_id: userId,
      store_id: storeId,
      is_home_store: true,
    })
    if (usaErr) {
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return new Response(
        JSON.stringify({ error: usaErr.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const { data: regRow, error: regErr } = await supabaseAdmin
      .from('store_kiosk_registers')
      .insert({
        store_id: storeId,
        sort_order: sortOrder,
        display_label: displayLabel,
        auth_user_id: userId,
        active: true,
      })
      .select('id, display_label, sort_order, active')
      .single()

    if (regErr || !regRow) {
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return new Response(
        JSON.stringify({ error: regErr?.message ?? 'Kasse konnte nicht gespeichert werden.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    return new Response(
      JSON.stringify({
        register: regRow,
        entrance_token: entranceToken,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err ?? 'Unbekannter Fehler')
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
