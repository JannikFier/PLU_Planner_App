-- ============================================================
-- PLU Planner – Migration 016: Flag „nur aus Liste entfernen“
-- Setzt is_manually_renamed = false für ein Item (nur item_id nötig).
-- Sinnvoll wenn nur das Bild geändert wurde; Zurücksetzen des Namens
-- würde sonst system_name erfordern und kann 400 verursachen.
-- ============================================================

CREATE OR REPLACE FUNCTION public.clear_backshop_manually_renamed_flag(item_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Nur Admin oder Super-Admin dürfen die Backshop-Flag zurücksetzen';
  END IF;

  UPDATE public.backshop_master_plu_items
  SET is_manually_renamed = false
  WHERE id = item_id;
END;
$$;
