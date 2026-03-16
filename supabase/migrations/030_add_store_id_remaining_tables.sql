-- 030_add_store_id_remaining_tables.sql
-- store_id zu den Tabellen hinzufuegen, die in Migration 022 noch fehlten:
-- plu_offer_items, backshop_offer_items, backshop_renamed_items
--
-- HINWEIS: backshop_renamed_items wird hier ggf. erstellt,
-- falls Migration 020 durch den cron.schedule-Fehler zurueckgerollt wurde.

-- ============================================================
-- 0. backshop_renamed_items erstellen, falls die Tabelle fehlt
-- ============================================================

CREATE TABLE IF NOT EXISTS public.backshop_renamed_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plu TEXT NOT NULL,
    display_name TEXT NOT NULL,
    is_manually_renamed BOOLEAN NOT NULL DEFAULT true,
    image_url TEXT,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- UNIQUE-Constraint auf plu nur wenn er noch nicht existiert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'backshop_renamed_items_plu_key'
      AND conrelid = 'public.backshop_renamed_items'::regclass
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'backshop_renamed_items_plu_store_unique'
      AND conrelid = 'public.backshop_renamed_items'::regclass
  ) THEN
    ALTER TABLE public.backshop_renamed_items
      ADD CONSTRAINT backshop_renamed_items_plu_key UNIQUE (plu);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_backshop_renamed_items_plu
  ON public.backshop_renamed_items(plu);

ALTER TABLE public.backshop_renamed_items ENABLE ROW LEVEL SECURITY;

-- RLS fuer backshop_renamed_items (basic, wird unten durch store_id-Policies ersetzt)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'backshop_renamed_items'
      AND policyname = 'Alle koennen backshop_renamed_items lesen'
  ) THEN
    CREATE POLICY "Alle koennen backshop_renamed_items lesen"
      ON public.backshop_renamed_items FOR SELECT
      USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- RPCs aus Migration 020 (nur erstellen falls sie fehlen)
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
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Nur Admin oder Super-Admin duerfen Backshop-Produkte umbenennen';
  END IF;

  SELECT plu INTO v_plu FROM public.backshop_master_plu_items WHERE id = item_id;
  IF v_plu IS NULL THEN
    RAISE EXCEPTION 'Item nicht gefunden';
  END IF;

  INSERT INTO public.backshop_renamed_items (plu, display_name, is_manually_renamed, image_url, created_by)
  SELECT
    v_plu,
    new_display_name,
    (new_display_name IS DISTINCT FROM (SELECT system_name FROM public.backshop_master_plu_items WHERE id = item_id)),
    CASE
      WHEN new_image_url = '' THEN NULL
      WHEN new_image_url IS NOT NULL THEN new_image_url
      ELSE COALESCE(
        (SELECT r.image_url FROM public.backshop_renamed_items r WHERE r.plu = v_plu),
        (SELECT m.image_url FROM public.backshop_master_plu_items m WHERE m.id = item_id)
      )
    END,
    auth.uid()
  ON CONFLICT (plu) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    is_manually_renamed = (EXCLUDED.display_name IS DISTINCT FROM (SELECT system_name FROM public.backshop_master_plu_items WHERE plu = v_plu LIMIT 1)),
    image_url = CASE
      WHEN new_image_url = '' THEN NULL
      WHEN new_image_url IS NOT NULL THEN new_image_url
      ELSE backshop_renamed_items.image_url
    END,
    updated_at = now();
END;
$$;

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
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Nur Admin oder Super-Admin duerfen den Backshop-Produktnamen zuruecksetzen';
  END IF;

  SELECT plu INTO v_plu FROM public.backshop_master_plu_items WHERE id = item_id;
  IF v_plu IS NULL THEN
    RAISE EXCEPTION 'Item nicht gefunden';
  END IF;

  DELETE FROM public.backshop_renamed_items WHERE plu = v_plu;
END;
$$;

-- ============================================================
-- 1. store_id Spalten hinzufuegen (nullable)
-- ============================================================

ALTER TABLE public.plu_offer_items
  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id);

ALTER TABLE public.backshop_offer_items
  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id);

ALTER TABLE public.backshop_renamed_items
  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id);

-- ============================================================
-- 2. Bestehende Daten dem ersten Markt (Angerbogen) zuordnen
-- ============================================================

DO $$
DECLARE
  v_store_id UUID;
BEGIN
  SELECT id INTO v_store_id
  FROM public.stores
  ORDER BY created_at
  LIMIT 1;

  IF v_store_id IS NULL THEN
    RAISE EXCEPTION 'Kein Store gefunden fuer store_id-Migration.';
  END IF;

  UPDATE public.plu_offer_items
  SET store_id = v_store_id
  WHERE store_id IS NULL;

  UPDATE public.backshop_offer_items
  SET store_id = v_store_id
  WHERE store_id IS NULL;

  UPDATE public.backshop_renamed_items
  SET store_id = v_store_id
  WHERE store_id IS NULL;
END $$;

-- ============================================================
-- 3. NOT NULL setzen
-- ============================================================

ALTER TABLE public.plu_offer_items
  ALTER COLUMN store_id SET NOT NULL;

ALTER TABLE public.backshop_offer_items
  ALTER COLUMN store_id SET NOT NULL;

ALTER TABLE public.backshop_renamed_items
  ALTER COLUMN store_id SET NOT NULL;

-- ============================================================
-- 4. Indizes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_plu_offer_items_store_id
  ON public.plu_offer_items (store_id);

CREATE INDEX IF NOT EXISTS idx_backshop_offer_items_store_id
  ON public.backshop_offer_items (store_id);

CREATE INDEX IF NOT EXISTS idx_backshop_renamed_items_store_id
  ON public.backshop_renamed_items (store_id);

-- ============================================================
-- 5. UNIQUE-Constraint anpassen: plu muss pro Store eindeutig sein
-- ============================================================

ALTER TABLE public.plu_offer_items
  DROP CONSTRAINT IF EXISTS plu_offer_items_plu_key;
ALTER TABLE public.plu_offer_items
  DROP CONSTRAINT IF EXISTS plu_offer_items_plu_store_unique;
ALTER TABLE public.plu_offer_items
  ADD CONSTRAINT plu_offer_items_plu_store_unique UNIQUE (plu, store_id);

ALTER TABLE public.backshop_offer_items
  DROP CONSTRAINT IF EXISTS backshop_offer_items_plu_key;
ALTER TABLE public.backshop_offer_items
  DROP CONSTRAINT IF EXISTS backshop_offer_items_plu_store_unique;
ALTER TABLE public.backshop_offer_items
  ADD CONSTRAINT backshop_offer_items_plu_store_unique UNIQUE (plu, store_id);

ALTER TABLE public.backshop_renamed_items
  DROP CONSTRAINT IF EXISTS backshop_renamed_items_plu_key;
ALTER TABLE public.backshop_renamed_items
  DROP CONSTRAINT IF EXISTS backshop_renamed_items_plu_store_unique;
ALTER TABLE public.backshop_renamed_items
  ADD CONSTRAINT backshop_renamed_items_plu_store_unique UNIQUE (plu, store_id);

-- ============================================================
-- 6. RLS-Policies fuer diese Tabellen (store_id-basiert)
-- ============================================================

-- plu_offer_items
DROP POLICY IF EXISTS "Alle koennen plu_offer_items lesen" ON public.plu_offer_items;
DROP POLICY IF EXISTS "User mit Rolle koennen plu_offer_items schreiben" ON public.plu_offer_items;
DROP POLICY IF EXISTS "users_read_offer_items_for_own_stores" ON public.plu_offer_items;
DROP POLICY IF EXISTS "users_write_offer_items_in_current_store" ON public.plu_offer_items;

CREATE POLICY "users_read_offer_items_for_own_stores"
  ON public.plu_offer_items
  FOR SELECT
  USING (
    store_id IN (
      SELECT usa.store_id
      FROM public.user_store_access usa
      JOIN public.stores s ON s.id = usa.store_id
      WHERE usa.user_id = auth.uid()
        AND s.is_active = TRUE
    )
  );

CREATE POLICY "users_write_offer_items_in_current_store"
  ON public.plu_offer_items
  FOR ALL
  USING (store_id = public.get_current_store_id())
  WITH CHECK (store_id = public.get_current_store_id());

-- backshop_offer_items
DROP POLICY IF EXISTS "Alle koennen backshop_offer_items lesen" ON public.backshop_offer_items;
DROP POLICY IF EXISTS "User mit Rolle koennen backshop_offer_items schreiben" ON public.backshop_offer_items;
DROP POLICY IF EXISTS "users_read_backshop_offer_items_for_own_stores" ON public.backshop_offer_items;
DROP POLICY IF EXISTS "users_write_backshop_offer_items_in_current_store" ON public.backshop_offer_items;

CREATE POLICY "users_read_backshop_offer_items_for_own_stores"
  ON public.backshop_offer_items
  FOR SELECT
  USING (
    store_id IN (
      SELECT usa.store_id
      FROM public.user_store_access usa
      JOIN public.stores s ON s.id = usa.store_id
      WHERE usa.user_id = auth.uid()
        AND s.is_active = TRUE
    )
  );

CREATE POLICY "users_write_backshop_offer_items_in_current_store"
  ON public.backshop_offer_items
  FOR ALL
  USING (store_id = public.get_current_store_id())
  WITH CHECK (store_id = public.get_current_store_id());

-- backshop_renamed_items
DROP POLICY IF EXISTS "Alle koennen backshop_renamed_items lesen" ON public.backshop_renamed_items;
DROP POLICY IF EXISTS "Nur Admin/Super-Admin kann backshop_renamed_items einfuegen" ON public.backshop_renamed_items;
DROP POLICY IF EXISTS "Nur Admin/Super-Admin kann backshop_renamed_items aendern" ON public.backshop_renamed_items;
DROP POLICY IF EXISTS "Nur Admin/Super-Admin kann backshop_renamed_items loeschen" ON public.backshop_renamed_items;
DROP POLICY IF EXISTS "User mit Rolle koennen backshop_renamed_items schreiben" ON public.backshop_renamed_items;
DROP POLICY IF EXISTS "users_read_backshop_renamed_items_for_own_stores" ON public.backshop_renamed_items;
DROP POLICY IF EXISTS "users_write_backshop_renamed_items_in_current_store" ON public.backshop_renamed_items;

CREATE POLICY "users_read_backshop_renamed_items_for_own_stores"
  ON public.backshop_renamed_items
  FOR SELECT
  USING (
    store_id IN (
      SELECT usa.store_id
      FROM public.user_store_access usa
      JOIN public.stores s ON s.id = usa.store_id
      WHERE usa.user_id = auth.uid()
        AND s.is_active = TRUE
    )
  );

CREATE POLICY "users_write_backshop_renamed_items_in_current_store"
  ON public.backshop_renamed_items
  FOR ALL
  USING (store_id = public.get_current_store_id())
  WITH CHECK (store_id = public.get_current_store_id());
