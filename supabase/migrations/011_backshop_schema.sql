-- ============================================================
-- PLU Planner – Migration 011: Backshop-PLU-Liste (Datenbasis)
-- Getrennte Tabellen für Backshop. Obst/Gemüse-Tabellen unverändert.
-- ============================================================

-- ============================================================
-- 1. BACKSHOP_VERSIONS (KW-Versionen für Backshop)
-- ============================================================
CREATE TABLE public.backshop_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kw_nummer INT NOT NULL,
    jahr INT NOT NULL,
    kw_label TEXT GENERATED ALWAYS AS ('KW' || LPAD(kw_nummer::TEXT, 2, '0') || '/' || jahr::TEXT) STORED,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'frozen')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at TIMESTAMPTZ,
    frozen_at TIMESTAMPTZ,
    delete_after TIMESTAMPTZ,
    created_by UUID REFERENCES public.profiles(id),
    UNIQUE(kw_nummer, jahr)
);

CREATE INDEX idx_backshop_versions_status ON public.backshop_versions(status);
CREATE INDEX idx_backshop_versions_kw ON public.backshop_versions(kw_nummer, jahr);

-- ============================================================
-- 2. BACKSHOP_BLOCKS (Warengruppen nur für Backshop)
-- ============================================================
CREATE TABLE public.backshop_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    order_index INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_backshop_blocks_order ON public.backshop_blocks(order_index);

-- ============================================================
-- 3. BACKSHOP_BLOCK_RULES
-- ============================================================
CREATE TABLE public.backshop_block_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_id UUID NOT NULL REFERENCES public.backshop_blocks(id) ON DELETE CASCADE,
    rule_type TEXT NOT NULL CHECK (rule_type IN ('NAME_CONTAINS', 'NAME_REGEX', 'PLU_RANGE')),
    value TEXT NOT NULL,
    case_sensitive BOOLEAN NOT NULL DEFAULT false,
    modify_name_action TEXT CHECK (modify_name_action IN ('PREFIX', 'SUFFIX', 'NONE')),
    modify_name_keyword TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_backshop_block_rules_block ON public.backshop_block_rules(block_id);

-- ============================================================
-- 4. BACKSHOP_MASTER_PLU_ITEMS (ohne item_type, mit image_url)
-- ============================================================
CREATE TABLE public.backshop_master_plu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id UUID NOT NULL REFERENCES public.backshop_versions(id) ON DELETE CASCADE,
    plu TEXT NOT NULL,
    system_name TEXT NOT NULL,
    display_name TEXT,
    status TEXT NOT NULL DEFAULT 'UNCHANGED' CHECK (status IN ('UNCHANGED', 'NEW_PRODUCT_YELLOW', 'PLU_CHANGED_RED')),
    old_plu TEXT,
    warengruppe TEXT,
    block_id UUID REFERENCES public.backshop_blocks(id) ON DELETE SET NULL,
    is_manually_renamed BOOLEAN NOT NULL DEFAULT false,
    image_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(version_id, plu)
);

CREATE INDEX idx_backshop_master_plu_version ON public.backshop_master_plu_items(version_id);
CREATE INDEX idx_backshop_master_plu_status ON public.backshop_master_plu_items(status);
CREATE INDEX idx_backshop_master_plu_block ON public.backshop_master_plu_items(block_id);

-- ============================================================
-- 5. BACKSHOP_CUSTOM_PRODUCTS (Bild Pflicht = image_url NOT NULL)
-- ============================================================
CREATE TABLE public.backshop_custom_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plu TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    image_url TEXT NOT NULL,
    block_id UUID REFERENCES public.backshop_blocks(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_backshop_custom_products_plu ON public.backshop_custom_products(plu);
CREATE INDEX idx_backshop_custom_products_created_by ON public.backshop_custom_products(created_by);

CREATE TRIGGER set_backshop_custom_products_updated_at
    BEFORE UPDATE ON public.backshop_custom_products
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- 6. BACKSHOP_HIDDEN_ITEMS
-- ============================================================
CREATE TABLE public.backshop_hidden_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plu TEXT NOT NULL UNIQUE,
    hidden_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_backshop_hidden_items_plu ON public.backshop_hidden_items(plu);

-- ============================================================
-- 7. BACKSHOP_VERSION_NOTIFICATIONS
-- ============================================================
CREATE TABLE public.backshop_version_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    version_id UUID NOT NULL REFERENCES public.backshop_versions(id) ON DELETE CASCADE,
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, version_id)
);

CREATE INDEX idx_backshop_version_notifications_user ON public.backshop_version_notifications(user_id);
CREATE INDEX idx_backshop_version_notifications_unread ON public.backshop_version_notifications(is_read) WHERE is_read = false;

-- ============================================================
-- 8. BACKSHOP_LAYOUT_SETTINGS (Singleton)
-- ============================================================
CREATE TABLE public.backshop_layout_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sort_mode TEXT NOT NULL DEFAULT 'ALPHABETICAL' CHECK (sort_mode IN ('ALPHABETICAL', 'BY_BLOCK')),
    display_mode TEXT NOT NULL DEFAULT 'MIXED' CHECK (display_mode IN ('MIXED', 'SEPARATED')),
    flow_direction TEXT NOT NULL DEFAULT 'ROW_BY_ROW' CHECK (flow_direction IN ('ROW_BY_ROW', 'COLUMN_FIRST')),
    font_header_px INT NOT NULL DEFAULT 24,
    font_column_px INT NOT NULL DEFAULT 16,
    font_product_px INT NOT NULL DEFAULT 12,
    mark_red_kw_count INT NOT NULL DEFAULT 2 CHECK (mark_red_kw_count BETWEEN 1 AND 4),
    mark_yellow_kw_count INT NOT NULL DEFAULT 3 CHECK (mark_yellow_kw_count BETWEEN 1 AND 4),
    features_custom_products BOOLEAN NOT NULL DEFAULT true,
    features_hidden_items BOOLEAN NOT NULL DEFAULT true,
    features_blocks BOOLEAN NOT NULL DEFAULT true,
    features_keyword_rules BOOLEAN NOT NULL DEFAULT true,
    allow_mixed_mode BOOLEAN NOT NULL DEFAULT true,
    allow_separated_mode BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by UUID REFERENCES public.profiles(id)
);

CREATE UNIQUE INDEX idx_backshop_layout_settings_singleton ON public.backshop_layout_settings((true));

INSERT INTO public.backshop_layout_settings (id) VALUES (gen_random_uuid());

CREATE TRIGGER set_backshop_layout_settings_updated_at
    BEFORE UPDATE ON public.backshop_layout_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- 9. BACKSHOP_BEZEICHNUNGSREGELN
-- ============================================================
CREATE TABLE public.backshop_bezeichnungsregeln (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    keyword TEXT NOT NULL,
    position TEXT NOT NULL CHECK (position IN ('PREFIX', 'SUFFIX')),
    case_sensitive BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES public.profiles(id)
);

-- ============================================================
-- 10. HELPER: Aktive Backshop-Version
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_active_backshop_version()
RETURNS public.backshop_versions AS $$
DECLARE
    v public.backshop_versions;
BEGIN
    SELECT * INTO v FROM public.backshop_versions WHERE status = 'active' LIMIT 1;
    RETURN v;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 11. RLS AKTIVIEREN
-- ============================================================
ALTER TABLE public.backshop_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backshop_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backshop_block_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backshop_master_plu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backshop_custom_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backshop_hidden_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backshop_version_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backshop_layout_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backshop_bezeichnungsregeln ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 12. RLS POLICIES: backshop_versions (nur Super-Admin schreibt)
-- ============================================================
CREATE POLICY "Alle koennen backshop_versions lesen"
    ON public.backshop_versions FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Nur Super-Admin kann backshop_versions einfuegen"
    ON public.backshop_versions FOR INSERT
    WITH CHECK (public.is_super_admin());

CREATE POLICY "Nur Super-Admin kann backshop_versions aendern"
    ON public.backshop_versions FOR UPDATE
    USING (public.is_super_admin());

CREATE POLICY "Nur Super-Admin kann backshop_versions loeschen"
    ON public.backshop_versions FOR DELETE
    USING (public.is_super_admin());

-- ============================================================
-- 13. RLS POLICIES: backshop_blocks, backshop_block_rules
-- ============================================================
CREATE POLICY "Alle koennen backshop_blocks lesen"
    ON public.backshop_blocks FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Nur Super-Admin kann backshop_blocks einfuegen"
    ON public.backshop_blocks FOR INSERT
    WITH CHECK (public.is_super_admin());

CREATE POLICY "Nur Super-Admin kann backshop_blocks aendern"
    ON public.backshop_blocks FOR UPDATE
    USING (public.is_super_admin());

CREATE POLICY "Nur Super-Admin kann backshop_blocks loeschen"
    ON public.backshop_blocks FOR DELETE
    USING (public.is_super_admin());

CREATE POLICY "Alle koennen backshop_block_rules lesen"
    ON public.backshop_block_rules FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Nur Super-Admin kann backshop_block_rules einfuegen"
    ON public.backshop_block_rules FOR INSERT
    WITH CHECK (public.is_super_admin());

CREATE POLICY "Nur Super-Admin kann backshop_block_rules aendern"
    ON public.backshop_block_rules FOR UPDATE
    USING (public.is_super_admin());

CREATE POLICY "Nur Super-Admin kann backshop_block_rules loeschen"
    ON public.backshop_block_rules FOR DELETE
    USING (public.is_super_admin());

-- ============================================================
-- 14. RLS POLICIES: backshop_master_plu_items
-- ============================================================
CREATE POLICY "Alle koennen backshop_master_plu_items lesen"
    ON public.backshop_master_plu_items FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Nur Super-Admin kann backshop_master_plu_items einfuegen"
    ON public.backshop_master_plu_items FOR INSERT
    WITH CHECK (public.is_super_admin());

CREATE POLICY "Nur Super-Admin kann backshop_master_plu_items aendern"
    ON public.backshop_master_plu_items FOR UPDATE
    USING (public.is_super_admin());

CREATE POLICY "Nur Super-Admin kann backshop_master_plu_items loeschen"
    ON public.backshop_master_plu_items FOR DELETE
    USING (public.is_super_admin());

-- ============================================================
-- 15. RLS POLICIES: backshop_custom_products (wie custom_products)
-- ============================================================
CREATE POLICY "Alle koennen backshop_custom_products lesen"
    ON public.backshop_custom_products FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Alle koennen backshop_custom_products einfuegen"
    ON public.backshop_custom_products FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

CREATE POLICY "Ersteller oder Super-Admin kann backshop_custom_products aendern"
    ON public.backshop_custom_products FOR UPDATE
    USING (created_by = auth.uid() OR public.is_super_admin());

CREATE POLICY "Ersteller oder Super-Admin kann backshop_custom_products loeschen"
    ON public.backshop_custom_products FOR DELETE
    USING (created_by = auth.uid() OR public.is_super_admin());

-- ============================================================
-- 16. RLS POLICIES: backshop_hidden_items (wie hidden_items)
-- ============================================================
CREATE POLICY "Alle koennen backshop_hidden_items lesen"
    ON public.backshop_hidden_items FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Alle koennen backshop_hidden_items einfuegen"
    ON public.backshop_hidden_items FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL AND hidden_by = auth.uid());

CREATE POLICY "Alle koennen backshop_hidden_items loeschen"
    ON public.backshop_hidden_items FOR DELETE
    USING (auth.uid() IS NOT NULL);

-- ============================================================
-- 17. RLS POLICIES: backshop_version_notifications
-- ============================================================
CREATE POLICY "User lesen eigene backshop_version_notifications"
    ON public.backshop_version_notifications FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "User aendern eigene backshop_version_notifications"
    ON public.backshop_version_notifications FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Super-Admin erstellt backshop_version_notifications"
    ON public.backshop_version_notifications FOR INSERT
    WITH CHECK (public.is_super_admin());

-- ============================================================
-- 18. RLS POLICIES: backshop_layout_settings, backshop_bezeichnungsregeln
-- ============================================================
CREATE POLICY "Alle koennen backshop_layout_settings lesen"
    ON public.backshop_layout_settings FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Nur Super-Admin kann backshop_layout_settings aendern"
    ON public.backshop_layout_settings FOR UPDATE
    USING (public.is_super_admin());

CREATE POLICY "Alle koennen backshop_bezeichnungsregeln lesen"
    ON public.backshop_bezeichnungsregeln FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Nur Super-Admin kann backshop_bezeichnungsregeln einfuegen"
    ON public.backshop_bezeichnungsregeln FOR INSERT
    WITH CHECK (public.is_super_admin());

CREATE POLICY "Nur Super-Admin kann backshop_bezeichnungsregeln aendern"
    ON public.backshop_bezeichnungsregeln FOR UPDATE
    USING (public.is_super_admin());

CREATE POLICY "Nur Super-Admin kann backshop_bezeichnungsregeln loeschen"
    ON public.backshop_bezeichnungsregeln FOR DELETE
    USING (public.is_super_admin());
