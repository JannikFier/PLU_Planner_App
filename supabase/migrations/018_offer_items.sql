-- ============================================================
-- PLU Planner – Migration 018: Werbung/Angebot (Aktion)
-- Tabellen: plu_offer_items (Obst/Gemüse), backshop_offer_items (Backshop)
-- ============================================================

-- ============================================================
-- 1. Helper: is_viewer() für RLS (Viewer darf keine Angebote anlegen/entfernen)
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_viewer()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'viewer'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 2. PLU_OFFER_ITEMS (Obst/Gemüse – Produkte in der Werbung)
-- ============================================================
CREATE TABLE public.plu_offer_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plu TEXT NOT NULL UNIQUE,
    start_kw INT NOT NULL,
    start_jahr INT NOT NULL,
    duration_weeks INT NOT NULL CHECK (duration_weeks >= 1 AND duration_weeks <= 4),
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_plu_offer_items_plu ON public.plu_offer_items(plu);
CREATE INDEX idx_plu_offer_items_start ON public.plu_offer_items(start_kw, start_jahr);

-- ============================================================
-- 3. BACKSHOP_OFFER_ITEMS (Backshop – Produkte in der Werbung)
-- ============================================================
CREATE TABLE public.backshop_offer_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plu TEXT NOT NULL UNIQUE,
    start_kw INT NOT NULL,
    start_jahr INT NOT NULL,
    duration_weeks INT NOT NULL CHECK (duration_weeks >= 1 AND duration_weeks <= 4),
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_backshop_offer_items_plu ON public.backshop_offer_items(plu);
CREATE INDEX idx_backshop_offer_items_start ON public.backshop_offer_items(start_kw, start_jahr);

-- ============================================================
-- 4. RLS aktivieren
-- ============================================================
ALTER TABLE public.plu_offer_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backshop_offer_items ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 5. RLS POLICIES: plu_offer_items
-- ============================================================
CREATE POLICY "Alle koennen plu_offer_items lesen"
    ON public.plu_offer_items FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "User Admin SuperAdmin koennen plu_offer_items einfuegen"
    ON public.plu_offer_items FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL AND NOT public.is_viewer() AND created_by = auth.uid());

CREATE POLICY "User Admin SuperAdmin koennen plu_offer_items loeschen"
    ON public.plu_offer_items FOR DELETE
    USING (auth.uid() IS NOT NULL AND NOT public.is_viewer());

CREATE POLICY "User Admin SuperAdmin koennen plu_offer_items updaten"
    ON public.plu_offer_items FOR UPDATE
    USING (auth.uid() IS NOT NULL AND NOT public.is_viewer());

-- ============================================================
-- 6. RLS POLICIES: backshop_offer_items
-- ============================================================
CREATE POLICY "Alle koennen backshop_offer_items lesen"
    ON public.backshop_offer_items FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "User Admin SuperAdmin koennen backshop_offer_items einfuegen"
    ON public.backshop_offer_items FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL AND NOT public.is_viewer() AND created_by = auth.uid());

CREATE POLICY "User Admin SuperAdmin koennen backshop_offer_items loeschen"
    ON public.backshop_offer_items FOR DELETE
    USING (auth.uid() IS NOT NULL AND NOT public.is_viewer());

CREATE POLICY "User Admin SuperAdmin koennen backshop_offer_items updaten"
    ON public.backshop_offer_items FOR UPDATE
    USING (auth.uid() IS NOT NULL AND NOT public.is_viewer());
