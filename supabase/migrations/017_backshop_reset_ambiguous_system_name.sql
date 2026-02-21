-- ============================================================
-- PLU Planner – Migration 017: Mehrdeutigkeit "system_name" in Reset-RPC beheben
-- Parameter und Tabellenspalte hießen gleich → "column reference system_name is ambiguous".
-- Wir setzen display_name explizit auf den Parameter (mit Funktionsnamen qualifiziert).
-- ============================================================

CREATE OR REPLACE FUNCTION public.reset_backshop_master_plu_item_display_name(
  item_id uuid,
  system_name text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Nur Admin oder Super-Admin dürfen den Backshop-Produktnamen zurücksetzen';
  END IF;

  UPDATE public.backshop_master_plu_items
  SET display_name = reset_backshop_master_plu_item_display_name.system_name,
      is_manually_renamed = false
  WHERE id = item_id;
END;
$$;
