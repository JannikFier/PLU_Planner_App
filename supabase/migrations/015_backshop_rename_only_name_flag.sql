-- ============================================================
-- PLU Planner – Migration 015: is_manually_renamed nur bei Namensänderung
-- Wenn nur das Bild geändert wird (Name = system_name), erscheint das Produkt
-- nicht unter „Umbenannte Produkte“.
-- ============================================================

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
      is_manually_renamed = (new_display_name IS DISTINCT FROM system_name),
      image_url = CASE
        WHEN new_image_url = '' THEN NULL
        WHEN new_image_url IS NOT NULL THEN new_image_url
        ELSE image_url
      END
  WHERE id = item_id;
END;
$$;
