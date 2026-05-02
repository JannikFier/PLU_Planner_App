-- Kiosk-Einstiegs-Token: Ablaufdatum (TTL) gegen unbegrenzt lange gültige QR-Codes.
-- Bestehende Tokens bekommen via DEFAULT eine 6-Monats-Frist ab Migrationszeitpunkt;
-- neue Tokens (rotate-kiosk-entrance, create-kiosk-register) erben den DEFAULT automatisch.

ALTER TABLE public.store_kiosk_entrances
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '6 months');

-- Login-Auflösung der Kasse: Token muss aktiv UND nicht abgelaufen sein.
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
  WHERE e.token = p_token
    AND e.revoked_at IS NULL
    AND e.expires_at > now()
    AND (p.email IS NOT NULL AND length(trim(p.email)) > 0);
$$;

-- Markt-Übernahme nach Login: Token muss aktiv UND nicht abgelaufen sein.
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
    AND e.expires_at > now()
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

-- Öffentliche Kassen-Liste: Token muss aktiv UND nicht abgelaufen sein.
-- Signatur (6 Spalten) folgt Migration 081 - DROP+CREATE, da CREATE OR REPLACE den Return-Type nicht ändern kann.
DROP FUNCTION IF EXISTS public.kiosk_list_registers(text);

CREATE FUNCTION public.kiosk_list_registers(p_token TEXT)
RETURNS TABLE(
  id UUID,
  display_label TEXT,
  sort_order INT,
  store_id UUID,
  store_name TEXT,
  company_name TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.id,
    r.display_label,
    r.sort_order,
    e.store_id,
    s.name AS store_name,
    c.name AS company_name
  FROM public.store_kiosk_entrances e
  JOIN public.store_kiosk_registers r ON r.store_id = e.store_id
  INNER JOIN public.store_list_visibility v
    ON v.store_id = e.store_id
    AND v.list_type = 'kiosk'
    AND v.is_visible = true
  JOIN public.stores s ON s.id = e.store_id
  JOIN public.companies c ON c.id = s.company_id
  WHERE e.token = p_token
    AND e.revoked_at IS NULL
    AND e.expires_at > now()
    AND r.active = true
  ORDER BY r.sort_order;
$$;

GRANT EXECUTE ON FUNCTION public.kiosk_list_registers(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.kiosk_list_registers(TEXT) TO authenticated;
