-- Kiosk: RPC liefert Markt- und Firmenname fuer oeffentliche Kassen-Seite (Orientierung, kein Geheimnis).
-- Hinweis: CREATE OR REPLACE aendert die RETURNS-Tabelle in PG nicht — DROP vorher noetig.

DROP FUNCTION IF EXISTS public.kiosk_list_registers(text);

CREATE FUNCTION public.kiosk_list_registers(p_token TEXT)
RETURNS TABLE(
  id UUID,
  display_label TEXT,
  sort_order INT,
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
    AND r.active = true
  ORDER BY r.sort_order;
$$;

GRANT EXECUTE ON FUNCTION public.kiosk_list_registers(text) TO anon;
GRANT EXECUTE ON FUNCTION public.kiosk_list_registers(text) TO authenticated;
