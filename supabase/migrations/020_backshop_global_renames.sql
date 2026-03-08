-- ============================================================
-- PLU Planner – Migration 020: Backshop-Umbenennungen global (wie eigene Produkte, ausgeblendete)
-- Umbenennungen bleiben erhalten, auch wenn eine KW-Version gelöscht wird.
-- ============================================================

-- 1. Tabelle backshop_renamed_items (global, plu unique)
CREATE TABLE public.backshop_renamed_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plu TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    is_manually_renamed BOOLEAN NOT NULL DEFAULT true,
    image_url TEXT,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_backshop_renamed_items_plu ON public.backshop_renamed_items(plu);

CREATE TRIGGER set_backshop_renamed_items_updated_at
    BEFORE UPDATE ON public.backshop_renamed_items
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 2. RLS
ALTER TABLE public.backshop_renamed_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Alle koennen backshop_renamed_items lesen"
    ON public.backshop_renamed_items FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Nur Admin/Super-Admin kann backshop_renamed_items einfuegen"
    ON public.backshop_renamed_items FOR INSERT
    WITH CHECK (public.is_admin());

CREATE POLICY "Nur Admin/Super-Admin kann backshop_renamed_items aendern"
    ON public.backshop_renamed_items FOR UPDATE
    USING (public.is_admin());

CREATE POLICY "Nur Admin/Super-Admin kann backshop_renamed_items loeschen"
    ON public.backshop_renamed_items FOR DELETE
    USING (public.is_admin());

-- 3. Bestehende Umbenennungen migrieren (aus backshop_master_plu_items, is_manually_renamed = true)
-- Bei Duplikaten (gleiche PLU in mehreren Versionen): neueste nehmen (max updated_at/created_at)
INSERT INTO public.backshop_renamed_items (plu, display_name, is_manually_renamed, image_url, created_at)
SELECT DISTINCT ON (b.plu) b.plu, b.display_name, b.is_manually_renamed, b.image_url, b.created_at
FROM public.backshop_master_plu_items b
WHERE b.is_manually_renamed = true
  AND b.display_name IS NOT NULL
ORDER BY b.plu, b.created_at DESC
ON CONFLICT (plu) DO NOTHING;

-- 4. RPCs umstellen: statt backshop_master_plu_items zu updaten → backshop_renamed_items
-- rename: plu statt item_id (plu aus item_id holen)
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
    RAISE EXCEPTION 'Nur Admin oder Super-Admin dürfen Backshop-Produkte umbenennen';
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

-- reset: plu aus item_id
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
    RAISE EXCEPTION 'Nur Admin oder Super-Admin dürfen den Backshop-Produktnamen zurücksetzen';
  END IF;

  SELECT plu INTO v_plu FROM public.backshop_master_plu_items WHERE id = item_id;
  IF v_plu IS NULL THEN
    RAISE EXCEPTION 'Item nicht gefunden';
  END IF;

  DELETE FROM public.backshop_renamed_items WHERE plu = v_plu;
END;
$$;

-- clear_backshop_manually_renamed_flag: plu aus item_id
CREATE OR REPLACE FUNCTION public.clear_backshop_manually_renamed_flag(item_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plu text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Nur Admin oder Super-Admin';
  END IF;

  SELECT plu INTO v_plu FROM public.backshop_master_plu_items WHERE id = item_id;
  IF v_plu IS NOT NULL THEN
    DELETE FROM public.backshop_renamed_items WHERE plu = v_plu;
  END IF;
END;
$$;

-- ============================================================
-- 5. Cleanup: Orphan-Renames entfernen (PLU existiert in keiner Version mehr)
-- Läuft täglich mit backshop-auto-delete-old-versions
-- ============================================================
CREATE OR REPLACE FUNCTION public.cleanup_backshop_orphan_renames()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.backshop_renamed_items
  WHERE plu NOT IN (SELECT DISTINCT plu FROM public.backshop_master_plu_items);
END;
$$;

-- Cron-Job erweitern: Nach Version-Löschung auch Orphan-Renames aufräumen
SELECT cron.unschedule('backshop-auto-delete-old-versions');

SELECT cron.schedule(
  'backshop-auto-delete-old-versions',
  '0 2 * * *',
  $$
    DELETE FROM public.backshop_versions
    WHERE id IN (
      SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (ORDER BY jahr DESC, kw_nummer DESC) AS rn
        FROM public.backshop_versions
      ) sub
      WHERE rn > 3
    );
    SELECT public.cleanup_backshop_orphan_renames();
  $$
);
