-- ============================================================
-- PLU PLANNER – Migration 006: Globale Listen
-- Neue Tabellen: custom_products, hidden_items, version_notifications
-- Neues Feld: is_manually_renamed auf master_plu_items
-- ============================================================

-- ============================================================
-- 1. CUSTOM_PRODUCTS (Globale eigene Produkte)
-- ============================================================
CREATE TABLE public.custom_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plu TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    item_type TEXT NOT NULL CHECK (item_type IN ('PIECE', 'WEIGHT')),
    preis DECIMAL(10,2),
    block_id UUID REFERENCES public.blocks(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_custom_products_plu ON public.custom_products(plu);
CREATE INDEX idx_custom_products_created_by ON public.custom_products(created_by);

-- updated_at Trigger
CREATE TRIGGER set_custom_products_updated_at
    BEFORE UPDATE ON public.custom_products
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- 2. HIDDEN_ITEMS (Global ausgeblendete PLUs)
-- ============================================================
CREATE TABLE public.hidden_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plu TEXT NOT NULL UNIQUE,
    hidden_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_hidden_items_plu ON public.hidden_items(plu);

-- ============================================================
-- 3. VERSION_NOTIFICATIONS (Pro User pro Version: gelesen/ungelesen)
-- ============================================================
CREATE TABLE public.version_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    version_id UUID NOT NULL REFERENCES public.versions(id) ON DELETE CASCADE,
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, version_id)
);

CREATE INDEX idx_version_notifications_user ON public.version_notifications(user_id);
CREATE INDEX idx_version_notifications_unread ON public.version_notifications(is_read) WHERE is_read = false;

-- ============================================================
-- 4. NEUES FELD: is_manually_renamed auf master_plu_items
-- ============================================================
ALTER TABLE public.master_plu_items
    ADD COLUMN IF NOT EXISTS is_manually_renamed BOOLEAN NOT NULL DEFAULT false;

-- ============================================================
-- 5. RLS AKTIVIEREN
-- ============================================================
ALTER TABLE public.custom_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hidden_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.version_notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 6. RLS POLICIES: custom_products
-- ============================================================

-- Alle eingeloggten User duerfen lesen
CREATE POLICY "Alle koennen custom_products lesen"
    ON public.custom_products FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Alle eingeloggten User duerfen einfuegen
CREATE POLICY "Alle koennen custom_products einfuegen"
    ON public.custom_products FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

-- Ersteller oder Super-Admin duerfen updaten
CREATE POLICY "Ersteller oder Super-Admin kann custom_products updaten"
    ON public.custom_products FOR UPDATE
    USING (created_by = auth.uid() OR public.is_super_admin());

-- Ersteller oder Super-Admin duerfen loeschen
CREATE POLICY "Ersteller oder Super-Admin kann custom_products loeschen"
    ON public.custom_products FOR DELETE
    USING (created_by = auth.uid() OR public.is_super_admin());

-- ============================================================
-- 7. RLS POLICIES: hidden_items
-- ============================================================

-- Alle eingeloggten User duerfen lesen
CREATE POLICY "Alle koennen hidden_items lesen"
    ON public.hidden_items FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Alle eingeloggten User duerfen einfuegen (ausblenden)
CREATE POLICY "Alle koennen hidden_items einfuegen"
    ON public.hidden_items FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL AND hidden_by = auth.uid());

-- Alle eingeloggten User duerfen loeschen (wieder einblenden)
CREATE POLICY "Alle koennen hidden_items loeschen"
    ON public.hidden_items FOR DELETE
    USING (auth.uid() IS NOT NULL);

-- ============================================================
-- 8. RLS POLICIES: version_notifications
-- ============================================================

-- User lesen nur eigene Notifications
CREATE POLICY "User lesen eigene version_notifications"
    ON public.version_notifications FOR SELECT
    USING (user_id = auth.uid());

-- User updaten nur eigene (als gelesen markieren)
CREATE POLICY "User updaten eigene version_notifications"
    ON public.version_notifications FOR UPDATE
    USING (user_id = auth.uid());

-- Super-Admin kann Notifications erstellen (beim Publish)
CREATE POLICY "Super-Admin erstellt version_notifications"
    ON public.version_notifications FOR INSERT
    WITH CHECK (public.is_super_admin());
