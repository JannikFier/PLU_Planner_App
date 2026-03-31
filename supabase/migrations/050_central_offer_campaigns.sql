-- Zentrale Werbung (Obst/Gemüse + Backshop getrennt): Kampagnen, Zeilen, Markt-Opt-out
-- Erweiterung manueller Werbung: promo_price, offer_source

-- ============================================================
-- 1. Obst/Gemüse – Kampagnen
-- ============================================================
CREATE TABLE public.obst_offer_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kw_nummer INT NOT NULL CHECK (kw_nummer >= 1 AND kw_nummer <= 53),
  jahr INT NOT NULL,
  source_file_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  UNIQUE (kw_nummer, jahr)
);

CREATE TABLE public.obst_offer_campaign_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.obst_offer_campaigns(id) ON DELETE CASCADE,
  plu TEXT NOT NULL,
  promo_price NUMERIC(12, 4) NOT NULL,
  sort_index INT NOT NULL DEFAULT 0,
  source_art_nr TEXT,
  UNIQUE (campaign_id, plu)
);

CREATE INDEX idx_obst_campaign_lines_campaign ON public.obst_offer_campaign_lines(campaign_id);

CREATE TABLE public.obst_offer_store_disabled (
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  plu TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  PRIMARY KEY (store_id, plu)
);

CREATE INDEX idx_obst_offer_store_disabled_store ON public.obst_offer_store_disabled(store_id);

-- ============================================================
-- 2. Backshop – Kampagnen
-- ============================================================
CREATE TABLE public.backshop_offer_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kw_nummer INT NOT NULL CHECK (kw_nummer >= 1 AND kw_nummer <= 53),
  jahr INT NOT NULL,
  source_file_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  UNIQUE (kw_nummer, jahr)
);

CREATE TABLE public.backshop_offer_campaign_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.backshop_offer_campaigns(id) ON DELETE CASCADE,
  plu TEXT NOT NULL,
  promo_price NUMERIC(12, 4) NOT NULL,
  sort_index INT NOT NULL DEFAULT 0,
  source_art_nr TEXT,
  UNIQUE (campaign_id, plu)
);

CREATE INDEX idx_backshop_campaign_lines_campaign ON public.backshop_offer_campaign_lines(campaign_id);

CREATE TABLE public.backshop_offer_store_disabled (
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  plu TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  PRIMARY KEY (store_id, plu)
);

CREATE INDEX idx_backshop_offer_store_disabled_store ON public.backshop_offer_store_disabled(store_id);

-- ============================================================
-- 3. Manuelle Werbung: Preis + Quelle
-- ============================================================
ALTER TABLE public.plu_offer_items
  ADD COLUMN IF NOT EXISTS promo_price NUMERIC(12, 4),
  ADD COLUMN IF NOT EXISTS offer_source TEXT NOT NULL DEFAULT 'manual'
    CHECK (offer_source IN ('manual'));

ALTER TABLE public.backshop_offer_items
  ADD COLUMN IF NOT EXISTS promo_price NUMERIC(12, 4),
  ADD COLUMN IF NOT EXISTS offer_source TEXT NOT NULL DEFAULT 'manual'
    CHECK (offer_source IN ('manual'));

COMMENT ON COLUMN public.plu_offer_items.promo_price IS 'Aktionspreis (VK) bei manueller Werbung';
COMMENT ON COLUMN public.backshop_offer_items.promo_price IS 'Aktionspreis (VK) bei manueller Werbung';

-- ============================================================
-- 4. RLS
-- ============================================================
ALTER TABLE public.obst_offer_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.obst_offer_campaign_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.obst_offer_store_disabled ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backshop_offer_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backshop_offer_campaign_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backshop_offer_store_disabled ENABLE ROW LEVEL SECURITY;

-- Kampagnen: alle eingeloggten Nutzer lesen; nur Super-Admin schreiben
CREATE POLICY "obst_offer_campaigns_select_authenticated"
  ON public.obst_offer_campaigns FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "obst_offer_campaigns_super_admin_all"
  ON public.obst_offer_campaigns FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "obst_offer_campaign_lines_select_authenticated"
  ON public.obst_offer_campaign_lines FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "obst_offer_campaign_lines_super_admin_all"
  ON public.obst_offer_campaign_lines FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "obst_offer_store_disabled_select_own_stores"
  ON public.obst_offer_store_disabled FOR SELECT
  USING (public.is_super_admin() OR store_id IN (SELECT public.get_user_store_ids()));

CREATE POLICY "obst_offer_store_disabled_write_own_stores"
  ON public.obst_offer_store_disabled FOR ALL
  USING (public.is_super_admin() OR store_id IN (SELECT public.get_user_store_ids()))
  WITH CHECK (
    public.is_super_admin()
    OR (store_id IN (SELECT public.get_user_store_ids()) AND NOT public.is_viewer())
  );

CREATE POLICY "backshop_offer_campaigns_select_authenticated"
  ON public.backshop_offer_campaigns FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "backshop_offer_campaigns_super_admin_all"
  ON public.backshop_offer_campaigns FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "backshop_offer_campaign_lines_select_authenticated"
  ON public.backshop_offer_campaign_lines FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "backshop_offer_campaign_lines_super_admin_all"
  ON public.backshop_offer_campaign_lines FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "backshop_offer_store_disabled_select_own_stores"
  ON public.backshop_offer_store_disabled FOR SELECT
  USING (public.is_super_admin() OR store_id IN (SELECT public.get_user_store_ids()));

CREATE POLICY "backshop_offer_store_disabled_write_own_stores"
  ON public.backshop_offer_store_disabled FOR ALL
  USING (public.is_super_admin() OR store_id IN (SELECT public.get_user_store_ids()))
  WITH CHECK (
    public.is_super_admin()
    OR (store_id IN (SELECT public.get_user_store_ids()) AND NOT public.is_viewer())
  );
