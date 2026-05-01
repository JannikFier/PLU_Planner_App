-- Kassen-Anmeldung ohne Edge Function: Auth per signInWithPassword + RPCs (kein Deno-Cold-Start).
-- 1) Schnelle Token-Lookups
-- 2) Interne Login-Mail fuer gueltiges Token + Kasse
-- 3) Nach Login: current_store_id aus Einstiegs-Token setzen (nur wenn auth.uid() Kasse dieses Tokens ist)

CREATE INDEX IF NOT EXISTS idx_store_kiosk_entrances_token_active
  ON public.store_kiosk_entrances (token)
  WHERE revoked_at IS NULL;

-- Anon: liefert die Auth-E-Mail der Kasse bei gueltigem Token + Register (fuer signInWithPassword).
CREATE OR REPLACE FUNCTION public.kiosk_resolve_register_auth(p_token text, p_register_id uuid)
RETURNS TABLE(email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.email::text AS email
  FROM public.store_kiosk_entrances e
  JOIN public.store_kiosk_registers r
    ON r.store_id = e.store_id AND r.id = p_register_id AND r.active = true
  INNER JOIN public.store_list_visibility v
    ON v.store_id = e.store_id AND v.list_type = 'kiosk' AND v.is_visible = true
  JOIN public.profiles p ON p.id = r.auth_user_id AND p.role = 'kiosk'
  WHERE e.token = p_token AND e.revoked_at IS NULL
    AND (p.email IS NOT NULL AND length(trim(p.email)) > 0);
$$;

REVOKE ALL ON FUNCTION public.kiosk_resolve_register_auth(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kiosk_resolve_register_auth(text, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.kiosk_resolve_register_auth(text, uuid) TO authenticated;

-- Nach erfolgreichem Login: Markt aus Token setzen (nur wenn eingeloggter User Kasse zu diesem Token ist).
CREATE OR REPLACE FUNCTION public.kiosk_finalize_entrance_session(p_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store_id uuid;
BEGIN
  SELECT e.store_id INTO v_store_id
  FROM public.store_kiosk_entrances e
  JOIN public.store_kiosk_registers r ON r.store_id = e.store_id
  WHERE e.token = p_token
    AND e.revoked_at IS NULL
    AND r.auth_user_id = auth.uid()
    AND r.active = true
  LIMIT 1;

  IF v_store_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.profiles
  SET current_store_id = v_store_id
  WHERE id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.kiosk_finalize_entrance_session(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kiosk_finalize_entrance_session(text) TO authenticated;
