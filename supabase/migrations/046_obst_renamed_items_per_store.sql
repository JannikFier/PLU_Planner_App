-- 046_obst_renamed_items_per_store.sql
-- Umbenennungen Obst/Gemüse: von global (master_plu_items) auf marktspezifisch (renamed_items).
-- Bestehende Umbenennungen werden für Angerbogen migriert.

-- ============================================================
-- 1. Tabelle renamed_items
-- ============================================================

CREATE TABLE public.renamed_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plu TEXT NOT NULL,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    is_manually_renamed BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(plu, store_id)
);

CREATE INDEX idx_renamed_items_plu ON public.renamed_items(plu);
CREATE INDEX idx_renamed_items_store_id ON public.renamed_items(store_id);

CREATE TRIGGER set_renamed_items_updated_at
    BEFORE UPDATE ON public.renamed_items
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.renamed_items ENABLE ROW LEVEL SECURITY;

-- RLS: Lesen für eigene Stores, Schreiben nur für current_store_id
CREATE POLICY "users_read_renamed_items_for_own_stores"
  ON public.renamed_items FOR SELECT
  USING (
    public.is_super_admin()
    OR store_id IN (
      SELECT usa.store_id FROM public.user_store_access usa
      JOIN public.stores s ON s.id = usa.store_id
      WHERE usa.user_id = auth.uid() AND s.is_active = TRUE
    )
  );

CREATE POLICY "users_write_renamed_items_in_current_store"
  ON public.renamed_items FOR ALL
  USING (public.is_super_admin() OR store_id = public.get_current_store_id())
  WITH CHECK (public.is_super_admin() OR store_id = public.get_current_store_id());

-- ============================================================
-- 2. RPCs umstellen: renamed_items statt master_plu_items
-- ============================================================

CREATE OR REPLACE FUNCTION public.rename_master_plu_item(
  item_id uuid,
  new_display_name text
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
    RAISE EXCEPTION 'Viewer dürfen keine Produkte umbenennen';
  END IF;

  v_store_id := public.get_current_store_id();
  IF v_store_id IS NULL AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Kein Markt ausgewählt. Bitte wähle einen Markt.';
  END IF;

  SELECT plu, system_name INTO v_plu, v_system_name
  FROM public.master_plu_items WHERE id = item_id;
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

  INSERT INTO public.renamed_items (plu, store_id, display_name, is_manually_renamed, created_by)
  VALUES (
    v_plu,
    v_store_id,
    new_display_name,
    (new_display_name IS DISTINCT FROM v_system_name),
    auth.uid()
  )
  ON CONFLICT (plu, store_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    is_manually_renamed = (EXCLUDED.display_name IS DISTINCT FROM v_system_name),
    updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_master_plu_item_display_name(
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
    RAISE EXCEPTION 'Viewer dürfen den Produktnamen nicht zurücksetzen';
  END IF;

  SELECT plu INTO v_plu FROM public.master_plu_items WHERE id = item_id;
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
    DELETE FROM public.renamed_items WHERE plu = v_plu AND store_id = v_store_id;
  END IF;
END;
$$;

-- ============================================================
-- 3. Datenmigration: bestehende Umbenennungen für Angerbogen
-- ============================================================

DO $$
DECLARE
  v_store_id uuid;
  r RECORD;
BEGIN
  -- Angerbogen-Store ermitteln (Fallback: erster aktiver Store)
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
    RAISE NOTICE 'Kein Store gefunden – keine Datenmigration für renamed_items.';
    RETURN;
  END IF;

  FOR r IN
    SELECT plu, display_name, is_manually_renamed
    FROM public.master_plu_items
    WHERE is_manually_renamed = true
      AND display_name IS NOT NULL
  LOOP
    INSERT INTO public.renamed_items (plu, store_id, display_name, is_manually_renamed)
    VALUES (r.plu, v_store_id, r.display_name, r.is_manually_renamed)
    ON CONFLICT (plu, store_id) DO NOTHING;
  END LOOP;

  -- Master-Items zurücksetzen: display_name = system_name, is_manually_renamed = false
  UPDATE public.master_plu_items
  SET display_name = system_name,
      is_manually_renamed = false
  WHERE is_manually_renamed = true;
END;
$$;
