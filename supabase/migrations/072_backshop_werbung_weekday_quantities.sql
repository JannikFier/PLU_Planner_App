-- Bestellmengen Mo–Sa pro Markt, Kalenderwoche und PLU (Werbung bestellen)

CREATE TABLE public.backshop_werbung_weekday_quantities (
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  kw_nummer INT NOT NULL CHECK (kw_nummer >= 1 AND kw_nummer <= 53),
  jahr INT NOT NULL,
  plu TEXT NOT NULL,
  qty_mo NUMERIC(12, 4),
  qty_di NUMERIC(12, 4),
  qty_mi NUMERIC(12, 4),
  qty_do NUMERIC(12, 4),
  qty_fr NUMERIC(12, 4),
  qty_sa NUMERIC(12, 4),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES public.profiles(id),
  PRIMARY KEY (store_id, kw_nummer, jahr, plu)
);

CREATE INDEX idx_backshop_werbung_weekday_store_kw ON public.backshop_werbung_weekday_quantities(store_id, jahr, kw_nummer);

COMMENT ON TABLE public.backshop_werbung_weekday_quantities IS
  'Optionale Bestell-/Notizmengen Montag–Samstag zur Backshop-KW-Werbung (marktlokal).';

ALTER TABLE public.backshop_werbung_weekday_quantities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "backshop_werbung_weekday_select_own_stores"
  ON public.backshop_werbung_weekday_quantities FOR SELECT
  USING (public.is_super_admin() OR store_id IN (SELECT public.get_user_store_ids()));

CREATE POLICY "backshop_werbung_weekday_write_own_stores"
  ON public.backshop_werbung_weekday_quantities FOR ALL
  USING (public.is_super_admin() OR store_id IN (SELECT public.get_user_store_ids()))
  WITH CHECK (
    public.is_super_admin()
    OR (store_id IN (SELECT public.get_user_store_ids()) AND NOT public.is_viewer())
  );
