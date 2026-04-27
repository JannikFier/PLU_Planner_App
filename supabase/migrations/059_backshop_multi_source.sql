-- 059_backshop_multi_source.sql
-- Backshop: Multi-Source-System (Edeka, Harry, Aryzta)
-- Erlaubt mehrere Quellen pro Markt mit Konflikt-Aufloesung per Bulk-Regel + Tinder.
--
-- 1. source-Spalte in backshop_master_plu_items (default 'edeka', bestehende Zeilen bleiben unveraendert)
-- 2. Unique-Constraint (version_id, plu) -> (version_id, source, plu)
-- 3. Produktgruppen + Members (global, ueber Versionen hinweg)
-- 4. Source-Choice pro Markt (Tinder-Auswahl)
-- 5. Source-Rules pro Markt (Grundregeln pro Warengruppe)

BEGIN;

-- ============================================================
-- 1. source-Spalte in backshop_master_plu_items
-- ============================================================
ALTER TABLE public.backshop_master_plu_items
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'edeka';

ALTER TABLE public.backshop_master_plu_items
  DROP CONSTRAINT IF EXISTS backshop_master_plu_items_source_check;

ALTER TABLE public.backshop_master_plu_items
  ADD CONSTRAINT backshop_master_plu_items_source_check
  CHECK (source IN ('edeka','harry','aryzta'));

ALTER TABLE public.backshop_master_plu_items
  DROP CONSTRAINT IF EXISTS backshop_master_plu_items_version_id_plu_key;

ALTER TABLE public.backshop_master_plu_items
  DROP CONSTRAINT IF EXISTS backshop_master_plu_items_version_source_plu_key;

ALTER TABLE public.backshop_master_plu_items
  ADD CONSTRAINT backshop_master_plu_items_version_source_plu_key
  UNIQUE (version_id, source, plu);

CREATE INDEX IF NOT EXISTS idx_backshop_master_plu_source
  ON public.backshop_master_plu_items(source);

COMMENT ON COLUMN public.backshop_master_plu_items.source
  IS 'Quelle der PLU: edeka | harry | aryzta';

-- ============================================================
-- 2. backshop_product_groups
-- ============================================================
CREATE TABLE public.backshop_product_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name TEXT NOT NULL,
  block_id UUID REFERENCES public.backshop_blocks(id) ON DELETE SET NULL,
  origin TEXT NOT NULL DEFAULT 'auto' CHECK (origin IN ('auto','manual')),
  needs_review BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

CREATE INDEX idx_backshop_product_groups_block ON public.backshop_product_groups(block_id);
CREATE INDEX idx_backshop_product_groups_review ON public.backshop_product_groups(needs_review)
  WHERE needs_review = true;

CREATE TRIGGER set_backshop_product_groups_updated_at
    BEFORE UPDATE ON public.backshop_product_groups
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.backshop_product_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Alle koennen backshop_product_groups lesen"
  ON public.backshop_product_groups FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Nur Super-Admin kann backshop_product_groups einfuegen"
  ON public.backshop_product_groups FOR INSERT
  WITH CHECK (public.is_super_admin());

CREATE POLICY "Nur Super-Admin kann backshop_product_groups aendern"
  ON public.backshop_product_groups FOR UPDATE
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "Nur Super-Admin kann backshop_product_groups loeschen"
  ON public.backshop_product_groups FOR DELETE
  USING (public.is_super_admin());

COMMENT ON TABLE public.backshop_product_groups
  IS 'Produktgruppen: gleicher Artikel aus verschiedenen Quellen. Werden beim Publish automatisch gefuellt; Super-Admin kann nachjustieren.';

-- ============================================================
-- 3. backshop_product_group_members
-- ============================================================
CREATE TABLE public.backshop_product_group_members (
  group_id UUID NOT NULL REFERENCES public.backshop_product_groups(id) ON DELETE CASCADE,
  plu TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('edeka','harry','aryzta')),
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, plu, source)
);

-- Eine (plu, source) darf hoechstens in einer Gruppe sein
CREATE UNIQUE INDEX idx_backshop_product_group_members_unique_plu_source
  ON public.backshop_product_group_members(plu, source);

CREATE INDEX idx_backshop_product_group_members_group
  ON public.backshop_product_group_members(group_id);

ALTER TABLE public.backshop_product_group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Alle koennen backshop_product_group_members lesen"
  ON public.backshop_product_group_members FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Nur Super-Admin kann backshop_product_group_members einfuegen"
  ON public.backshop_product_group_members FOR INSERT
  WITH CHECK (public.is_super_admin());

CREATE POLICY "Nur Super-Admin kann backshop_product_group_members aendern"
  ON public.backshop_product_group_members FOR UPDATE
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "Nur Super-Admin kann backshop_product_group_members loeschen"
  ON public.backshop_product_group_members FOR DELETE
  USING (public.is_super_admin());

COMMENT ON TABLE public.backshop_product_group_members
  IS 'Welche PLUs (pro Quelle) gehoeren zu welcher Produktgruppe. PK (group_id, plu, source) damit Gruppen Versionen ueberleben.';

-- ============================================================
-- 4. backshop_source_choice_per_store (Tinder-Auswahl)
-- ============================================================
CREATE TABLE public.backshop_source_choice_per_store (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.backshop_product_groups(id) ON DELETE CASCADE,
  chosen_sources TEXT[] NOT NULL DEFAULT '{}',
  origin TEXT NOT NULL DEFAULT 'manual' CHECK (origin IN ('bulk','manual')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES public.profiles(id),
  UNIQUE (store_id, group_id)
);

CREATE INDEX idx_backshop_source_choice_store ON public.backshop_source_choice_per_store(store_id);
CREATE INDEX idx_backshop_source_choice_group ON public.backshop_source_choice_per_store(group_id);

CREATE TRIGGER set_backshop_source_choice_updated_at
    BEFORE UPDATE ON public.backshop_source_choice_per_store
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.backshop_source_choice_per_store ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_backshop_source_choice_for_own_stores"
  ON public.backshop_source_choice_per_store FOR SELECT
  USING (
    public.is_super_admin()
    OR store_id IN (
      SELECT usa.store_id FROM public.user_store_access usa
      JOIN public.stores s ON s.id = usa.store_id
      WHERE usa.user_id = auth.uid() AND s.is_active = TRUE
    )
  );

-- Schreiben: Super-Admin oder User/Admin mit aktuellem Markt (Viewer nicht)
CREATE POLICY "users_write_backshop_source_choice_in_current_store"
  ON public.backshop_source_choice_per_store FOR ALL
  USING (
    public.is_super_admin()
    OR (public.is_not_viewer() AND store_id = public.get_current_store_id())
  )
  WITH CHECK (
    public.is_super_admin()
    OR (public.is_not_viewer() AND store_id = public.get_current_store_id())
  );

COMMENT ON TABLE public.backshop_source_choice_per_store
  IS 'Marktauswahl pro Produktgruppe: welche Quellen sichtbar sein sollen (Tinder + Bulk).';

-- ============================================================
-- 5. backshop_source_rules_per_store (Bulk-Regeln pro Warengruppe)
-- ============================================================
CREATE TABLE public.backshop_source_rules_per_store (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  block_id UUID NOT NULL REFERENCES public.backshop_blocks(id) ON DELETE CASCADE,
  preferred_source TEXT NOT NULL CHECK (preferred_source IN ('edeka','harry','aryzta')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES public.profiles(id),
  UNIQUE (store_id, block_id)
);

CREATE INDEX idx_backshop_source_rules_store ON public.backshop_source_rules_per_store(store_id);

CREATE TRIGGER set_backshop_source_rules_updated_at
    BEFORE UPDATE ON public.backshop_source_rules_per_store
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.backshop_source_rules_per_store ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_backshop_source_rules_for_own_stores"
  ON public.backshop_source_rules_per_store FOR SELECT
  USING (
    public.is_super_admin()
    OR store_id IN (
      SELECT usa.store_id FROM public.user_store_access usa
      JOIN public.stores s ON s.id = usa.store_id
      WHERE usa.user_id = auth.uid() AND s.is_active = TRUE
    )
  );

-- Schreiben: Super-Admin oder Admin fuer aktuellen Markt (User/Viewer nicht)
CREATE POLICY "admins_write_backshop_source_rules_in_current_store"
  ON public.backshop_source_rules_per_store FOR ALL
  USING (
    public.is_super_admin()
    OR (public.is_admin() AND store_id = public.get_current_store_id())
  )
  WITH CHECK (
    public.is_super_admin()
    OR (public.is_admin() AND store_id = public.get_current_store_id())
  );

COMMENT ON TABLE public.backshop_source_rules_per_store
  IS 'Grundregeln pro Warengruppe: bevorzugte Quelle (Edeka/Harry/Aryzta) fuer die Bulk-Entscheidung vor dem Tinder.';

COMMIT;
