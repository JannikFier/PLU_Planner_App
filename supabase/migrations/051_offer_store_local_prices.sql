-- Lokaler Aktionspreis pro Markt (nur Anzeige/Verkauf); zentraler Kampagne-Preis bleibt Referenz in der UI.

CREATE TABLE public.obst_offer_store_local_prices (
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  plu TEXT NOT NULL,
  kw_nummer INT NOT NULL CHECK (kw_nummer >= 1 AND kw_nummer <= 53),
  jahr INT NOT NULL,
  local_promo_price NUMERIC(12, 4) NOT NULL CHECK (local_promo_price > 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (store_id, plu, kw_nummer, jahr)
);

CREATE INDEX idx_obst_offer_local_prices_store ON public.obst_offer_store_local_prices(store_id);

CREATE TABLE public.backshop_offer_store_local_prices (
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  plu TEXT NOT NULL,
  kw_nummer INT NOT NULL CHECK (kw_nummer >= 1 AND kw_nummer <= 53),
  jahr INT NOT NULL,
  local_promo_price NUMERIC(12, 4) NOT NULL CHECK (local_promo_price > 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (store_id, plu, kw_nummer, jahr)
);

CREATE INDEX idx_backshop_offer_local_prices_store ON public.backshop_offer_store_local_prices(store_id);

ALTER TABLE public.obst_offer_store_local_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backshop_offer_store_local_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "obst_offer_store_local_prices_select_own_stores"
  ON public.obst_offer_store_local_prices FOR SELECT
  USING (public.is_super_admin() OR store_id IN (SELECT public.get_user_store_ids()));

CREATE POLICY "obst_offer_store_local_prices_write_own_stores"
  ON public.obst_offer_store_local_prices FOR ALL
  USING (public.is_super_admin() OR store_id IN (SELECT public.get_user_store_ids()))
  WITH CHECK (
    public.is_super_admin()
    OR (store_id IN (SELECT public.get_user_store_ids()) AND NOT public.is_viewer())
  );

CREATE POLICY "backshop_offer_store_local_prices_select_own_stores"
  ON public.backshop_offer_store_local_prices FOR SELECT
  USING (public.is_super_admin() OR store_id IN (SELECT public.get_user_store_ids()));

CREATE POLICY "backshop_offer_store_local_prices_write_own_stores"
  ON public.backshop_offer_store_local_prices FOR ALL
  USING (public.is_super_admin() OR store_id IN (SELECT public.get_user_store_ids()))
  WITH CHECK (
    public.is_super_admin()
    OR (store_id IN (SELECT public.get_user_store_ids()) AND NOT public.is_viewer())
  );

COMMENT ON TABLE public.obst_offer_store_local_prices IS 'Optionaler eigener VK-Preis pro Markt zur zentralen Obst-Werbung (Kampagne bleibt Referenz).';
COMMENT ON TABLE public.backshop_offer_store_local_prices IS 'Optionaler eigener VK-Preis pro Markt zur zentralen Backshop-Werbung (Kampagne bleibt Referenz).';
