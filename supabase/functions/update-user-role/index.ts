// Supabase Edge Function: Rolle eines Benutzers ändern (Super-Admin oder Admin)
// Wird von der App aufgerufen wenn Super-Admin oder Admin einen User hoch-/runterstuft.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

    // Aufrufer darf sich nicht selbst runterstufen
    if (userId === caller.id) {
      return new Response(
        JSON.stringify({ error: 'Sie können Ihre eigene Rolle nicht ändern.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
