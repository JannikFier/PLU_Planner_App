-- ============================================================
-- PLU Planner – Migration 009: Umbenennen für Admin + Super-Admin
-- Erlaubt Admin und Super-Admin, nur display_name und is_manually_renamed
-- zu setzen (ohne RLS-Update-Recht auf master_plu_items für Admin).
-- ============================================================

-- Umbenennen: setzt display_name und is_manually_renamed = true
CREATE OR REPLACE FUNCTION public.rename_master_plu_item(
  item_id uuid,
  new_display_name text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Nur Admin oder Super-Admin dürfen Produkte umbenennen';
  END IF;

  UPDATE public.master_plu_items
  SET display_name = new_display_name,
      is_manually_renamed = true
  WHERE id = item_id;
END;
$$;

-- Zurücksetzen: display_name = system_name, is_manually_renamed = false
CREATE OR REPLACE FUNCTION public.reset_master_plu_item_display_name(
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
    RAISE EXCEPTION 'Nur Admin oder Super-Admin dürfen den Produktnamen zurücksetzen';
  END IF;

  UPDATE public.master_plu_items
  SET display_name = system_name,
      is_manually_renamed = false
  WHERE id = item_id;
END;
$$;
