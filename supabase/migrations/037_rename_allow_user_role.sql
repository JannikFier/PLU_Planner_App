-- ============================================================
-- PLU Planner – Migration 037: Umbenennen auch für User-Rolle
-- Alle Rollen außer viewer dürfen Master-Produkte umbenennen.
-- Neue Hilfsfunktion is_not_viewer() + aktualisierte RPCs.
-- ============================================================

-- Hilfsfunktion: true für super_admin, admin UND user (nicht viewer)
CREATE OR REPLACE FUNCTION public.is_not_viewer()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'user')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Obst/Gemüse: Umbenennen für alle außer Viewer
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
  IF NOT public.is_not_viewer() THEN
    RAISE EXCEPTION 'Viewer dürfen keine Produkte umbenennen';
  END IF;

  UPDATE public.master_plu_items
  SET display_name = new_display_name,
      is_manually_renamed = true
  WHERE id = item_id;
END;
$$;

-- Obst/Gemüse: Zurücksetzen für alle außer Viewer
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
  IF NOT public.is_not_viewer() THEN
    RAISE EXCEPTION 'Viewer dürfen den Produktnamen nicht zurücksetzen';
  END IF;

  UPDATE public.master_plu_items
  SET display_name = system_name,
      is_manually_renamed = false
  WHERE id = item_id;
END;
$$;

-- Backshop: Umbenennen für alle außer Viewer
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
  IF NOT public.is_not_viewer() THEN
    RAISE EXCEPTION 'Viewer dürfen keine Backshop-Produkte umbenennen';
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

-- Backshop: Zurücksetzen für alle außer Viewer
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
  IF NOT public.is_not_viewer() THEN
    RAISE EXCEPTION 'Viewer dürfen den Backshop-Produktnamen nicht zurücksetzen';
  END IF;

  UPDATE public.backshop_master_plu_items
  SET display_name = system_name,
      is_manually_renamed = false
  WHERE id = item_id;
END;
$$;
