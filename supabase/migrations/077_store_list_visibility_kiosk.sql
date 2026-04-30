-- Kassenmodus pro Markt ein-/ausschaltbar (Listen-Sichtbarkeit, list_type = kiosk).
-- Bestehende Maerkte: Zeile anlegen (Standard: sichtbar).
-- RPC kiosk_list_registers: nur wenn Kassenmodus am Markt sichtbar ist.

INSERT INTO public.store_list_visibility (store_id, list_type, is_visible)
SELECT s.id, 'kiosk', true
FROM public.stores s
WHERE NOT EXISTS (
  SELECT 1 FROM public.store_list_visibility v
  WHERE v.store_id = s.id AND v.list_type = 'kiosk'
);

CREATE OR REPLACE FUNCTION public.kiosk_list_registers(p_token TEXT)
RETURNS TABLE(id UUID, display_label TEXT, sort_order INT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id, r.display_label, r.sort_order
  FROM public.store_kiosk_entrances e
  JOIN public.store_kiosk_registers r ON r.store_id = e.store_id
  INNER JOIN public.store_list_visibility v
    ON v.store_id = e.store_id
    AND v.list_type = 'kiosk'
    AND v.is_visible = true
  WHERE e.token = p_token
    AND e.revoked_at IS NULL
    AND r.active = true
  ORDER BY r.sort_order;
$$;
