-- 047_backshop_renamed_items_rpc_restore.sql
-- Backshop-Umbenennungen: RPCs nutzen wieder backshop_renamed_items (pro store_id).
-- Migration 037 hatte auf backshop_master_plu_items umgestellt – hier zurueck.
-- Bestehende Umbenennungen in Master werden fuer Angerbogen migriert.

-- ============================================================
-- 1. RPC rename_backshop_master_plu_item
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
DECLARE
  v_plu text;
  v_system_name text;
  v_store_id uuid;
BEGIN
  IF NOT public.is_not_viewer() THEN
    RAISE EXCEPTION 'Viewer dürfen keine Backshop-Produkte umbenennen';
  END IF;

  v_store_id := public.get_current_store_id();
  IF v_store_id IS NULL AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Kein Markt ausgewählt. Bitte wähle einen Markt.';
  END IF;

  SELECT plu, system_name INTO v_plu, v_system_name
  FROM public.backshop_master_plu_items WHERE id = item_id;
  IF v_plu IS NULL THEN
    RAISE EXCEPTION 'Item nicht gefunden';
  END IF;

  -- Super-Admin ohne Store: ersten aktiven Store nutzen
  IF v_store_id IS NULL THEN
    SELECT id INTO v_store_id
    FROM public.stores WHERE is_active = TRUE ORDER BY created_at LIMIT 1;
    IF v_store_id IS NULL THEN
      RAISE EXCEPTION 'Kein Store gefunden';
    END IF;
  END IF;

  INSERT INTO public.backshop_renamed_items (plu, store_id, display_name, is_manually_renamed, image_url, created_by)
  SELECT
    v_plu,
    v_store_id,
    new_display_name,
    (new_display_name IS DISTINCT FROM v_system_name),
    CASE
      WHEN new_image_url = '' THEN NULL
      WHEN new_image_url IS NOT NULL THEN new_image_url
      ELSE COALESCE(
        (SELECT r.image_url FROM public.backshop_renamed_items r WHERE r.plu = v_plu AND r.store_id = v_store_id),
        (SELECT m.image_url FROM public.backshop_master_plu_items m WHERE m.id = item_id)
      )
    END,
    auth.uid()
  ON CONFLICT (plu, store_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    is_manually_renamed = (EXCLUDED.display_name IS DISTINCT FROM v_system_name),
    image_url = CASE
      WHEN new_image_url = '' THEN NULL
      WHEN new_image_url IS NOT NULL THEN new_image_url
      ELSE backshop_renamed_items.image_url
    END,
    updated_at = now();
END;
$$;

-- ============================================================
-- 2. RPC reset_backshop_master_plu_item_display_name
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
DECLARE
  v_plu text;
  v_store_id uuid;
BEGIN
  IF NOT public.is_not_viewer() THEN
    RAISE EXCEPTION 'Viewer dürfen den Backshop-Produktnamen nicht zurücksetzen';
  END IF;

  SELECT plu INTO v_plu FROM public.backshop_master_plu_items WHERE id = item_id;
  IF v_plu IS NULL THEN
    RAISE EXCEPTION 'Item nicht gefunden';
  END IF;

  v_store_id := public.get_current_store_id();
  IF v_store_id IS NULL AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Kein Markt ausgewählt. Bitte wähle einen Markt.';
  END IF;

  IF v_store_id IS NULL THEN
    SELECT id INTO v_store_id
    FROM public.stores WHERE is_active = TRUE ORDER BY created_at LIMIT 1;
  END IF;

  IF v_store_id IS NOT NULL THEN
    DELETE FROM public.backshop_renamed_items WHERE plu = v_plu AND store_id = v_store_id;
  END IF;
END;
$$;

-- ============================================================
-- 3. Datenmigration: bestehende Umbenennungen in Master fuer Angerbogen
-- ============================================================

DO $$
DECLARE
  v_store_id uuid;
  r RECORD;
BEGIN
  SELECT id INTO v_store_id
  FROM public.stores
  WHERE is_active = TRUE
    AND (name ILIKE '%angerbogen%' OR subdomain ILIKE '%angerbogen%')
  LIMIT 1;

  IF v_store_id IS NULL THEN
    SELECT id INTO v_store_id
    FROM public.stores WHERE is_active = TRUE ORDER BY created_at LIMIT 1;
  END IF;

  IF v_store_id IS NULL THEN
    RAISE NOTICE 'Kein Store gefunden – keine Backshop-Datenmigration.';
    RETURN;
  END IF;

  FOR r IN
    SELECT plu, display_name, is_manually_renamed, image_url
    FROM public.backshop_master_plu_items
    WHERE is_manually_renamed = true
      AND display_name IS NOT NULL
  LOOP
    INSERT INTO public.backshop_renamed_items (plu, store_id, display_name, is_manually_renamed, image_url)
    VALUES (r.plu, v_store_id, r.display_name, r.is_manually_renamed, r.image_url)
    ON CONFLICT (plu, store_id) DO NOTHING;
  END LOOP;

  UPDATE public.backshop_master_plu_items
  SET display_name = system_name,
      is_manually_renamed = false
  WHERE is_manually_renamed = true;
END;
$$;
