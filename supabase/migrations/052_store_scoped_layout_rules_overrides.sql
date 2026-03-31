-- ============================================================
-- PLU Planner 052: Marktspezifisches Layout (Obst + Backshop),
-- Bezeichnungsregeln pro Markt, Block-Reihenfolge und Name→Block-Overrides.
-- ============================================================

-- Mindestens ein Markt noetig (Multi-Tenancy); sonst waere Singleton-Kopie leer.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.stores LIMIT 1) THEN
    RAISE EXCEPTION 'Migration 052: Tabelle stores enthaelt keine Maerkte. Bitte zuerst einen Markt anlegen.';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1) LAYOUT_SETTINGS: Singleton aufheben, pro Store eine Zeile
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Everyone can read layout settings" ON public.layout_settings;
DROP POLICY IF EXISTS "Only super_admins can update layout settings" ON public.layout_settings;

DROP INDEX IF EXISTS public.idx_layout_settings_singleton;

ALTER TABLE public.layout_settings
  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;

-- Bestehende Singleton-Zeile auf jeden Markt kopieren
INSERT INTO public.layout_settings (
  id,
  sort_mode,
  display_mode,
  flow_direction,
  font_header_px,
  font_column_px,
  font_product_px,
  mark_red_kw_count,
  mark_yellow_kw_count,
  features_custom_products,
  features_hidden_items,
  features_blocks,
  features_keyword_rules,
  allow_mixed_mode,
  allow_separated_mode,
  updated_at,
  updated_by,
  store_id
)
SELECT
  gen_random_uuid(),
  l.sort_mode,
  l.display_mode,
  l.flow_direction,
  l.font_header_px,
  l.font_column_px,
  l.font_product_px,
  l.mark_red_kw_count,
  l.mark_yellow_kw_count,
  l.features_custom_products,
  l.features_hidden_items,
  l.features_blocks,
  l.features_keyword_rules,
  l.allow_mixed_mode,
  l.allow_separated_mode,
  l.updated_at,
  l.updated_by,
  s.id
FROM public.stores s
CROSS JOIN public.layout_settings l
WHERE l.store_id IS NULL;

DELETE FROM public.layout_settings WHERE store_id IS NULL;

ALTER TABLE public.layout_settings
  ALTER COLUMN store_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_layout_settings_store_id
  ON public.layout_settings (store_id);

COMMENT ON COLUMN public.layout_settings.store_id IS 'Markt; Layout gilt nur fuer diesen Store.';

-- ---------------------------------------------------------------------------
-- 2) BACKSHOP_LAYOUT_SETTINGS: analog
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Alle koennen backshop_layout_settings lesen" ON public.backshop_layout_settings;
DROP POLICY IF EXISTS "Nur Super-Admin kann backshop_layout_settings aendern" ON public.backshop_layout_settings;

DROP INDEX IF EXISTS public.idx_backshop_layout_settings_singleton;

ALTER TABLE public.backshop_layout_settings
  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;

INSERT INTO public.backshop_layout_settings (
  id,
  sort_mode,
  display_mode,
  flow_direction,
  font_header_px,
  font_column_px,
  font_product_px,
  mark_red_kw_count,
  mark_yellow_kw_count,
  features_custom_products,
  features_hidden_items,
  features_blocks,
  features_keyword_rules,
  allow_mixed_mode,
  allow_separated_mode,
  page_break_per_block,
  updated_at,
  updated_by,
  store_id
)
SELECT
  gen_random_uuid(),
  l.sort_mode,
  l.display_mode,
  l.flow_direction,
  l.font_header_px,
  l.font_column_px,
  l.font_product_px,
  l.mark_red_kw_count,
  l.mark_yellow_kw_count,
  l.features_custom_products,
  l.features_hidden_items,
  l.features_blocks,
  l.features_keyword_rules,
  l.allow_mixed_mode,
  l.allow_separated_mode,
  COALESCE(l.page_break_per_block, false),
  l.updated_at,
  l.updated_by,
  s.id
FROM public.stores s
CROSS JOIN public.backshop_layout_settings l
WHERE l.store_id IS NULL;

DELETE FROM public.backshop_layout_settings WHERE store_id IS NULL;

ALTER TABLE public.backshop_layout_settings
  ALTER COLUMN store_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_backshop_layout_settings_store_id
  ON public.backshop_layout_settings (store_id);

COMMENT ON COLUMN public.backshop_layout_settings.store_id IS 'Markt; Backshop-Layout gilt nur fuer diesen Store.';

-- ---------------------------------------------------------------------------
-- 3) BEZEICHNUNGSREGELN (Obst): store_id, Kopie pro Markt
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Everyone can read bezeichnungsregeln" ON public.bezeichnungsregeln;
DROP POLICY IF EXISTS "Only super_admins can insert bezeichnungsregeln" ON public.bezeichnungsregeln;
DROP POLICY IF EXISTS "Only super_admins can update bezeichnungsregeln" ON public.bezeichnungsregeln;
DROP POLICY IF EXISTS "Only super_admins can delete bezeichnungsregeln" ON public.bezeichnungsregeln;

ALTER TABLE public.bezeichnungsregeln
  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;

INSERT INTO public.bezeichnungsregeln (
  id,
  keyword,
  position,
  case_sensitive,
  is_active,
  created_at,
  created_by,
  store_id
)
SELECT
  gen_random_uuid(),
  b.keyword,
  b.position,
  b.case_sensitive,
  b.is_active,
  b.created_at,
  b.created_by,
  s.id
FROM public.stores s
CROSS JOIN public.bezeichnungsregeln b
WHERE b.store_id IS NULL;

DELETE FROM public.bezeichnungsregeln WHERE store_id IS NULL;

ALTER TABLE public.bezeichnungsregeln
  ALTER COLUMN store_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_bezeichnungsregeln_store_keyword
  ON public.bezeichnungsregeln (store_id, keyword);

COMMENT ON COLUMN public.bezeichnungsregeln.store_id IS 'Markt; Regel gilt nur fuer diesen Store.';

-- ---------------------------------------------------------------------------
-- 4) BACKSHOP_BEZEICHNUNGSREGELN: analog
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Alle koennen backshop_bezeichnungsregeln lesen" ON public.backshop_bezeichnungsregeln;
DROP POLICY IF EXISTS "Nur Super-Admin kann backshop_bezeichnungsregeln einfuegen" ON public.backshop_bezeichnungsregeln;
DROP POLICY IF EXISTS "Nur Super-Admin kann backshop_bezeichnungsregeln aendern" ON public.backshop_bezeichnungsregeln;
DROP POLICY IF EXISTS "Nur Super-Admin kann backshop_bezeichnungsregeln loeschen" ON public.backshop_bezeichnungsregeln;

ALTER TABLE public.backshop_bezeichnungsregeln
  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;

INSERT INTO public.backshop_bezeichnungsregeln (
  id,
  keyword,
  position,
  case_sensitive,
  is_active,
  created_at,
  created_by,
  store_id
)
SELECT
  gen_random_uuid(),
  b.keyword,
  b.position,
  b.case_sensitive,
  b.is_active,
  b.created_at,
  b.created_by,
  s.id
FROM public.stores s
CROSS JOIN public.backshop_bezeichnungsregeln b
WHERE b.store_id IS NULL;

DELETE FROM public.backshop_bezeichnungsregeln WHERE store_id IS NULL;

ALTER TABLE public.backshop_bezeichnungsregeln
  ALTER COLUMN store_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_backshop_bezeichnungsregeln_store_keyword
  ON public.backshop_bezeichnungsregeln (store_id, keyword);

COMMENT ON COLUMN public.backshop_bezeichnungsregeln.store_id IS 'Markt; Regel gilt nur fuer diesen Store.';

-- ---------------------------------------------------------------------------
-- 5) Neue Tabellen: Block-Reihenfolge und Name→Block-Override
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.store_obst_block_order (
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  block_id UUID NOT NULL REFERENCES public.blocks(id) ON DELETE CASCADE,
  order_index INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (store_id, block_id)
);

CREATE INDEX IF NOT EXISTS idx_store_obst_block_order_store
  ON public.store_obst_block_order (store_id, order_index);

COMMENT ON TABLE public.store_obst_block_order IS 'Optionale Warengruppen-Reihenfolge pro Markt (Obst). Leer = globale blocks.order_index.';

CREATE TABLE IF NOT EXISTS public.store_backshop_block_order (
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  block_id UUID NOT NULL REFERENCES public.backshop_blocks(id) ON DELETE CASCADE,
  order_index INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (store_id, block_id)
);

CREATE INDEX IF NOT EXISTS idx_store_backshop_block_order_store
  ON public.store_backshop_block_order (store_id, order_index);

COMMENT ON TABLE public.store_backshop_block_order IS 'Optionale Warengruppen-Reihenfolge pro Markt (Backshop). Leer = globale backshop_blocks.order_index.';

CREATE TABLE IF NOT EXISTS public.store_obst_name_block_override (
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  system_name_normalized TEXT NOT NULL,
  block_id UUID NOT NULL REFERENCES public.blocks(id) ON DELETE CASCADE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (store_id, system_name_normalized)
);

CREATE INDEX IF NOT EXISTS idx_store_obst_name_override_block
  ON public.store_obst_name_block_override (store_id, block_id);

COMMENT ON TABLE public.store_obst_name_block_override IS 'Markt: effektive Warengruppe nach normalisiertem Artikelnamen (lower(trim)).';
COMMENT ON COLUMN public.store_obst_name_block_override.system_name_normalized IS 'lower(trim(system_name)) aus master_plu_items; einheitlich in App setzen.';

CREATE TABLE IF NOT EXISTS public.store_backshop_name_block_override (
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  system_name_normalized TEXT NOT NULL,
  block_id UUID NOT NULL REFERENCES public.backshop_blocks(id) ON DELETE CASCADE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (store_id, system_name_normalized)
);

CREATE INDEX IF NOT EXISTS idx_store_backshop_name_override_block
  ON public.store_backshop_name_block_override (store_id, block_id);

COMMENT ON TABLE public.store_backshop_name_block_override IS 'Markt: effektive Warengruppe nach normalisiertem Artikelnamen (Backshop).';

-- ---------------------------------------------------------------------------
-- 6) RLS: layout_settings & backshop_layout_settings (neu)
-- ---------------------------------------------------------------------------
CREATE POLICY "layout_settings_select_own_stores"
  ON public.layout_settings FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin()
    OR store_id IN (SELECT public.get_user_store_ids())
  );

CREATE POLICY "layout_settings_update_store_scoped"
  ON public.layout_settings FOR UPDATE
  TO authenticated
  USING (
    public.is_super_admin()
    OR (
      store_id = public.get_current_store_id()
      AND public.is_admin()
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      store_id = public.get_current_store_id()
      AND public.is_admin()
    )
  );

CREATE POLICY "backshop_layout_settings_select_own_stores"
  ON public.backshop_layout_settings FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin()
    OR store_id IN (SELECT public.get_user_store_ids())
  );

CREATE POLICY "backshop_layout_settings_update_store_scoped"
  ON public.backshop_layout_settings FOR UPDATE
  TO authenticated
  USING (
    public.is_super_admin()
    OR (
      store_id = public.get_current_store_id()
      AND public.is_admin()
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      store_id = public.get_current_store_id()
      AND public.is_admin()
    )
  );

-- ---------------------------------------------------------------------------
-- 7) RLS: bezeichnungsregeln (Obst + Backshop)
-- ---------------------------------------------------------------------------
CREATE POLICY "bezeichnungsregeln_select_own_stores"
  ON public.bezeichnungsregeln FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin()
    OR store_id IN (SELECT public.get_user_store_ids())
  );

CREATE POLICY "bezeichnungsregeln_insert_store_scoped"
  ON public.bezeichnungsregeln FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR (
      store_id = public.get_current_store_id()
      AND public.is_admin()
    )
  );

CREATE POLICY "bezeichnungsregeln_update_store_scoped"
  ON public.bezeichnungsregeln FOR UPDATE
  TO authenticated
  USING (
    public.is_super_admin()
    OR (
      store_id = public.get_current_store_id()
      AND public.is_admin()
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      store_id = public.get_current_store_id()
      AND public.is_admin()
    )
  );

CREATE POLICY "bezeichnungsregeln_delete_store_scoped"
  ON public.bezeichnungsregeln FOR DELETE
  TO authenticated
  USING (
    public.is_super_admin()
    OR (
      store_id = public.get_current_store_id()
      AND public.is_admin()
    )
  );

CREATE POLICY "backshop_bezeichnungsregeln_select_own_stores"
  ON public.backshop_bezeichnungsregeln FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin()
    OR store_id IN (SELECT public.get_user_store_ids())
  );

CREATE POLICY "backshop_bezeichnungsregeln_insert_store_scoped"
  ON public.backshop_bezeichnungsregeln FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR (
      store_id = public.get_current_store_id()
      AND public.is_admin()
    )
  );

CREATE POLICY "backshop_bezeichnungsregeln_update_store_scoped"
  ON public.backshop_bezeichnungsregeln FOR UPDATE
  TO authenticated
  USING (
    public.is_super_admin()
    OR (
      store_id = public.get_current_store_id()
      AND public.is_admin()
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      store_id = public.get_current_store_id()
      AND public.is_admin()
    )
  );

CREATE POLICY "backshop_bezeichnungsregeln_delete_store_scoped"
  ON public.backshop_bezeichnungsregeln FOR DELETE
  TO authenticated
  USING (
    public.is_super_admin()
    OR (
      store_id = public.get_current_store_id()
      AND public.is_admin()
    )
  );

-- ---------------------------------------------------------------------------
-- 8) RLS: neue Tabellen
-- ---------------------------------------------------------------------------
ALTER TABLE public.store_obst_block_order ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_backshop_block_order ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_obst_name_block_override ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_backshop_name_block_override ENABLE ROW LEVEL SECURITY;

CREATE POLICY "store_obst_block_order_all"
  ON public.store_obst_block_order FOR ALL
  TO authenticated
  USING (
    public.is_super_admin()
    OR store_id IN (SELECT public.get_user_store_ids())
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      store_id = public.get_current_store_id()
      AND public.is_admin()
    )
  );

CREATE POLICY "store_backshop_block_order_all"
  ON public.store_backshop_block_order FOR ALL
  TO authenticated
  USING (
    public.is_super_admin()
    OR store_id IN (SELECT public.get_user_store_ids())
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      store_id = public.get_current_store_id()
      AND public.is_admin()
    )
  );

CREATE POLICY "store_obst_name_block_override_all"
  ON public.store_obst_name_block_override FOR ALL
  TO authenticated
  USING (
    public.is_super_admin()
    OR store_id IN (SELECT public.get_user_store_ids())
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      store_id = public.get_current_store_id()
      AND public.is_admin()
    )
  );

CREATE POLICY "store_backshop_name_block_override_all"
  ON public.store_backshop_name_block_override FOR ALL
  TO authenticated
  USING (
    public.is_super_admin()
    OR store_id IN (SELECT public.get_user_store_ids())
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      store_id = public.get_current_store_id()
      AND public.is_admin()
    )
  );

-- ---------------------------------------------------------------------------
-- 9) Neuer Markt: Default-Layout + Regeln aus erstem bestehenden Markt kopieren
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.seed_store_scoped_settings_for_new_store()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  template_store UUID;
BEGIN
  SELECT id INTO template_store
  FROM public.stores
  WHERE id <> NEW.id
  ORDER BY created_at ASC
  LIMIT 1;

  IF template_store IS NULL THEN
    INSERT INTO public.layout_settings (
      id, store_id, sort_mode, display_mode, flow_direction,
      font_header_px, font_column_px, font_product_px,
      mark_red_kw_count, mark_yellow_kw_count,
      features_custom_products, features_hidden_items, features_blocks, features_keyword_rules,
      allow_mixed_mode, allow_separated_mode
    ) VALUES (
      gen_random_uuid(), NEW.id,
      'ALPHABETICAL', 'MIXED', 'ROW_BY_ROW',
      24, 16, 12,
      2, 3,
      true, true, true, true,
      true, true
    );
    INSERT INTO public.backshop_layout_settings (
      id, store_id, sort_mode, display_mode, flow_direction,
      font_header_px, font_column_px, font_product_px,
      mark_red_kw_count, mark_yellow_kw_count,
      features_custom_products, features_hidden_items, features_blocks, features_keyword_rules,
      allow_mixed_mode, allow_separated_mode, page_break_per_block
    ) VALUES (
      gen_random_uuid(), NEW.id,
      'ALPHABETICAL', 'MIXED', 'ROW_BY_ROW',
      24, 16, 12,
      2, 3,
      true, true, true, true,
      true, true, false
    );
  ELSE
    INSERT INTO public.layout_settings (
      id, sort_mode, display_mode, flow_direction,
      font_header_px, font_column_px, font_product_px,
      mark_red_kw_count, mark_yellow_kw_count,
      features_custom_products, features_hidden_items, features_blocks, features_keyword_rules,
      allow_mixed_mode, allow_separated_mode, updated_at, updated_by, store_id
    )
    SELECT
      gen_random_uuid(), sort_mode, display_mode, flow_direction,
      font_header_px, font_column_px, font_product_px,
      mark_red_kw_count, mark_yellow_kw_count,
      features_custom_products, features_hidden_items, features_blocks, features_keyword_rules,
      allow_mixed_mode, allow_separated_mode, updated_at, updated_by, NEW.id
    FROM public.layout_settings
    WHERE store_id = template_store
    LIMIT 1;

    INSERT INTO public.backshop_layout_settings (
      id, sort_mode, display_mode, flow_direction,
      font_header_px, font_column_px, font_product_px,
      mark_red_kw_count, mark_yellow_kw_count,
      features_custom_products, features_hidden_items, features_blocks, features_keyword_rules,
      allow_mixed_mode, allow_separated_mode, page_break_per_block, updated_at, updated_by, store_id
    )
    SELECT
      gen_random_uuid(), sort_mode, display_mode, flow_direction,
      font_header_px, font_column_px, font_product_px,
      mark_red_kw_count, mark_yellow_kw_count,
      features_custom_products, features_hidden_items, features_blocks, features_keyword_rules,
      allow_mixed_mode, allow_separated_mode, page_break_per_block, updated_at, updated_by, NEW.id
    FROM public.backshop_layout_settings
    WHERE store_id = template_store
    LIMIT 1;

    INSERT INTO public.bezeichnungsregeln (
      id, keyword, position, case_sensitive, is_active, created_at, created_by, store_id
    )
    SELECT
      gen_random_uuid(), keyword, position, case_sensitive, is_active, created_at, created_by, NEW.id
    FROM public.bezeichnungsregeln
    WHERE store_id = template_store;

    INSERT INTO public.backshop_bezeichnungsregeln (
      id, keyword, position, case_sensitive, is_active, created_at, created_by, store_id
    )
    SELECT
      gen_random_uuid(), keyword, position, case_sensitive, is_active, created_at, created_by, NEW.id
    FROM public.backshop_bezeichnungsregeln
    WHERE store_id = template_store;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stores_seed_scoped_settings ON public.stores;
CREATE TRIGGER trg_stores_seed_scoped_settings
  AFTER INSERT ON public.stores
  FOR EACH ROW
  EXECUTE FUNCTION public.seed_store_scoped_settings_for_new_store();
