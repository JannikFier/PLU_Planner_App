-- ============================================================
-- PLU PLANNER – Komplettes Datenbank-Schema
-- Dieses Script im Supabase SQL Editor ausführen.
-- ============================================================

-- ============================================================
-- 1. PROFILES (erweitert Supabase Auth)
-- ============================================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    personalnummer TEXT UNIQUE NOT NULL,
    display_name TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_login TIMESTAMPTZ
);

CREATE INDEX idx_profiles_personalnummer ON public.profiles(personalnummer);
CREATE INDEX idx_profiles_role ON public.profiles(role);

-- Trigger: Automatisch Profil erstellen bei neuem Auth-User
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, personalnummer, display_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'personalnummer', ''),
        COALESCE(NEW.raw_user_meta_data->>'display_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'role', 'user')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 2. BLOCKS (Warengruppen) – VOR master_plu_items erstellen!
-- ============================================================
CREATE TABLE public.blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    order_index INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_blocks_order ON public.blocks(order_index);

-- ============================================================
-- 3. VERSIONS (KW-basierte Versionen)
-- ============================================================
CREATE TABLE public.versions (
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

CREATE INDEX idx_versions_status ON public.versions(status);
CREATE INDEX idx_versions_kw ON public.versions(kw_nummer, jahr);

-- ============================================================
-- 4. MASTER_PLU_ITEMS (PLU-Einträge pro Version)
-- ============================================================
CREATE TABLE public.master_plu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id UUID NOT NULL REFERENCES public.versions(id) ON DELETE CASCADE,
    plu TEXT NOT NULL,
    system_name TEXT NOT NULL,
    item_type TEXT NOT NULL CHECK (item_type IN ('PIECE', 'WEIGHT')),
    status TEXT NOT NULL DEFAULT 'UNCHANGED' CHECK (status IN ('UNCHANGED', 'NEW_PRODUCT_YELLOW', 'PLU_CHANGED_RED')),
    old_plu TEXT,
    warengruppe TEXT,
    block_id UUID REFERENCES public.blocks(id) ON DELETE SET NULL,
    is_admin_eigen BOOLEAN NOT NULL DEFAULT false,
    preis DECIMAL(10,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    UNIQUE(version_id, plu)
);

CREATE INDEX idx_master_plu_version ON public.master_plu_items(version_id);
CREATE INDEX idx_master_plu_status ON public.master_plu_items(status);
CREATE INDEX idx_master_plu_block ON public.master_plu_items(block_id);
CREATE INDEX idx_master_plu_type ON public.master_plu_items(item_type);

-- ============================================================
-- 5. USER_OVERRIDES (User-spezifische Anpassungen)
-- ============================================================
CREATE TABLE public.user_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    plu TEXT NOT NULL,
    override_type TEXT NOT NULL CHECK (override_type IN ('eigen', 'ausgeblendet', 'umbenannt')),
    custom_name TEXT,
    custom_preis DECIMAL(10,2),
    item_type TEXT CHECK (item_type IN ('PIECE', 'WEIGHT')),
    block_id UUID REFERENCES public.blocks(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    UNIQUE(user_id, plu, override_type)
);

CREATE INDEX idx_user_overrides_user ON public.user_overrides(user_id);
CREATE INDEX idx_user_overrides_plu ON public.user_overrides(plu);
CREATE INDEX idx_user_overrides_type ON public.user_overrides(override_type);

-- ============================================================
-- 6. BLOCK_RULES (Zuweisungsregeln für Blöcke)
-- ============================================================
CREATE TABLE public.block_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_id UUID NOT NULL REFERENCES public.blocks(id) ON DELETE CASCADE,
    rule_type TEXT NOT NULL CHECK (rule_type IN ('NAME_CONTAINS', 'NAME_REGEX', 'PLU_RANGE')),
    value TEXT NOT NULL,
    case_sensitive BOOLEAN NOT NULL DEFAULT false,
    modify_name_action TEXT CHECK (modify_name_action IN ('PREFIX', 'SUFFIX', 'NONE')),
    modify_name_keyword TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_block_rules_block ON public.block_rules(block_id);

-- ============================================================
-- 7. LAYOUT_SETTINGS (Singleton – nur 1 Row)
-- ============================================================
CREATE TABLE public.layout_settings (
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

-- Singleton sicherstellen
CREATE UNIQUE INDEX idx_layout_settings_singleton ON public.layout_settings((true));

-- Initiale Zeile einfügen
INSERT INTO public.layout_settings (id) VALUES (gen_random_uuid());

-- ============================================================
-- 8. BEZEICHNUNGSREGELN (Keyword-Regeln)
-- ============================================================
CREATE TABLE public.bezeichnungsregeln (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    keyword TEXT NOT NULL,
    position TEXT NOT NULL CHECK (position IN ('PREFIX', 'SUFFIX')),
    case_sensitive BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES public.profiles(id)
);

-- ============================================================
-- 9. NOTIFICATIONS_QUEUE
-- ============================================================
CREATE TABLE public.notifications_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    version_id UUID NOT NULL REFERENCES public.versions(id) ON DELETE CASCADE,
    plu TEXT NOT NULL,
    product_name TEXT NOT NULL,
    item_type TEXT NOT NULL,
    user_decision TEXT NOT NULL DEFAULT 'pending' CHECK (user_decision IN ('pending', 'uebernommen', 'ausgeblendet')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ,
    
    UNIQUE(user_id, version_id, plu)
);

CREATE INDEX idx_notifications_user ON public.notifications_queue(user_id);
CREATE INDEX idx_notifications_pending ON public.notifications_queue(user_decision) WHERE user_decision = 'pending';

-- ============================================================
-- 10. HELPER FUNCTIONS
-- ============================================================

-- Aktuelle KW ermitteln
CREATE OR REPLACE FUNCTION public.get_current_kw()
RETURNS TABLE(kw_nummer INT, jahr INT) AS $$
BEGIN
    RETURN QUERY SELECT
        EXTRACT(WEEK FROM CURRENT_DATE)::INT,
        EXTRACT(YEAR FROM CURRENT_DATE)::INT;
END;
$$ LANGUAGE plpgsql;

-- Aktive Version holen
CREATE OR REPLACE FUNCTION public.get_active_version()
RETURNS public.versions AS $$
DECLARE
    v public.versions;
BEGIN
    SELECT * INTO v FROM public.versions WHERE status = 'active' LIMIT 1;
    RETURN v;
END;
$$ LANGUAGE plpgsql;

-- Updated_at Trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.user_overrides
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_layout_updated_at
    BEFORE UPDATE ON public.layout_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- 11. ADMIN CHECK HELPER
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 12. PERSONALNUMMER LOOKUP (für Login)
-- ============================================================
CREATE OR REPLACE FUNCTION public.lookup_email_by_personalnummer(p_nummer TEXT)
RETURNS TEXT AS $$
DECLARE
    found_email TEXT;
BEGIN
    SELECT email INTO found_email
    FROM public.profiles
    WHERE personalnummer = p_nummer;
    
    RETURN found_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Anon darf diese Funktion aufrufen (für Login-Screen)
GRANT EXECUTE ON FUNCTION public.lookup_email_by_personalnummer TO anon;
