-- ============================================================
-- PLU Planner – Migration 012: Backshop-Umbenennen (Admin + Super-Admin)
-- RPCs für display_name, is_manually_renamed und optional image_url.
-- ============================================================

-- Umbenennen: setzt display_name, is_manually_renamed = true; new_image_url: NULL = unverändert, '' = Bild entfernen, sonst = neue URL
CREATE OR REPLACE FUNCTION public.rename_backshop_master_plu_item(
  item_id uuid,
  new_display_name text,
  new_image_url text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Nur Admin oder Super-Admin dürfen Backshop-Produkte umbenennen';
  END IF;

  UPDATE public.backshop_master_plu_items
  SET display_name = new_display_name,
      is_manually_renamed = true,
      image_url = CASE
        WHEN new_image_url = '' THEN NULL
        WHEN new_image_url IS NOT NULL THEN new_image_url
        ELSE image_url
      END
  WHERE id = item_id;
END;
$$;

-- Zurücksetzen: display_name = system_name, is_manually_renamed = false; Bild unverändert
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
  SET display_name = system_name,
      is_manually_renamed = false
  WHERE id = item_id;
END;
$$;
