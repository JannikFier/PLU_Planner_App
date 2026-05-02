// Oeffentlicher Kassen-Login: Einstiegs-Token + Kasse + Passwort → Supabase-Session (JWT).
// HINWEIS (2026): Die App nutzt Client-seitig RPC kiosk_resolve_register_auth + signInWithPassword
// (siehe Migration 082). Diese Edge Function bleibt optional fuer Rate-Limits/Monitoring; nicht mehr vom Frontend aufgerufen.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, prefer, range, x-supabase-api-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

const WINDOW_MS = 60_000
const MAX_ATTEMPTS = 20
const attempts = new Map<string, { count: number; windowStart: number }>()

function rateLimitKey(ip: string | null, token: string): string {
  return `${ip ?? 'unknown'}|${token.slice(0, 24)}`
}

function checkRateLimit(key: string): boolean {
  const now = Date.now()
  const row = attempts.get(key)
  if (!row || now - row.windowStart > WINDOW_MS) {
    attempts.set(key, { count: 1, windowStart: now })
    return true
  }
  if (row.count >= MAX_ATTEMPTS) return false
  row.count += 1
  return true
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseAdmin = createClient(supabaseUrl, serviceKey)

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.headers.get('cf-connecting-ip')

    const body = await req.json().catch(() => ({}))
    const entranceToken = typeof body.entrance_token === 'string' ? body.entrance_token.trim() : ''
    const registerId = typeof body.register_id === 'string' ? body.register_id.trim() : ''
    const password = typeof body.password === 'string' ? body.password : ''

    if (!entranceToken || !registerId || !password) {
      return new Response(
        JSON.stringify({ error: 'Einstiegs-Token, Kasse und Passwort sind erforderlich.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (!checkRateLimit(rateLimitKey(ip, entranceToken))) {
      return new Response(
        JSON.stringify({ error: 'Zu viele Versuche. Bitte kurz warten und erneut versuchen.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const { data: entrance, error: eErr } = await supabaseAdmin
      .from('store_kiosk_entrances')
      .select('id, store_id, expires_at')
      .eq('token', entranceToken)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()

    if (eErr || !entrance) {
      return new Response(
        JSON.stringify({ error: 'Einstiegs-Link ungültig, widerrufen oder abgelaufen.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const storeId = entrance.store_id as string

    const [kioskVisRes, regRes] = await Promise.all([
      supabaseAdmin
        .from('store_list_visibility')
        .select('is_visible')
        .eq('store_id', storeId)
        .eq('list_type', 'kiosk')
        .maybeSingle(),
      supabaseAdmin
        .from('store_kiosk_registers')
        .select('id, store_id, auth_user_id, active')
        .eq('id', registerId)
        .eq('store_id', storeId)
        .maybeSingle(),
    ])

    const kioskVis = kioskVisRes.data
    if (kioskVis && kioskVis.is_visible === false) {
      return new Response(
        JSON.stringify({ error: 'Kassenmodus ist für diesen Markt nicht freigeschaltet.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const { data: reg, error: rErr } = regRes

    if (rErr || !reg || !reg.active) {
      return new Response(
        JSON.stringify({ error: 'Kasse nicht gefunden oder deaktiviert.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const { data: profile, error: pErr } = await supabaseAdmin
      .from('profiles')
      .select('email, role')
      .eq('id', reg.auth_user_id)
      .maybeSingle()

    if (pErr || !profile?.email || profile.role !== 'kiosk') {
      return new Response(
        JSON.stringify({ error: 'Kassen-Konto ist nicht gültig.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const anonClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: sessionData, error: signErr } = await anonClient.auth.signInWithPassword({
      email: profile.email,
      password,
    })

    if (signErr || !sessionData.session) {
      return new Response(
        JSON.stringify({ error: 'Passwort falsch oder Anmeldung fehlgeschlagen.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Markt der Einstiegs-URL immer im Profil setzen (RLS get_current_store_id + Client-Queries).
    await supabaseAdmin
      .from('profiles')
      .update({ current_store_id: storeId })
      .eq('id', reg.auth_user_id)

    return new Response(
      JSON.stringify({
        access_token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token,
        expires_in: sessionData.session.expires_in,
        expires_at: sessionData.session.expires_at,
        token_type: sessionData.session.token_type,
        user: sessionData.session.user,
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
