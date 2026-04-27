-- Zeilen-Sichtbarkeit pro Markt: Master-Zeile (PLU + Quelle) trotz Regeln einblenden oder gezielt ausblenden.

CREATE TABLE public.backshop_store_line_visibility_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  plu TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('edeka', 'harry', 'aryzta', 'manual')),
  mode TEXT NOT NULL CHECK (mode IN ('force_show', 'force_hide')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  UNIQUE (store_id, plu, source)
);

CREATE INDEX idx_backshop_line_vis_store ON public.backshop_store_line_visibility_overrides(store_id);
CREATE INDEX idx_backshop_line_vis_plu ON public.backshop_store_line_visibility_overrides(plu);

COMMENT ON TABLE public.backshop_store_line_visibility_overrides IS
  'Pro Markt: force_show blendet eine Master-Zeile (PLU+Quelle) in die Backshop-Hauptliste ein; force_hide blendet sie aus – unabhängig von Block-/Gruppenfiltern (nicht manuelles PLU-Ausblenden).';

ALTER TABLE public.backshop_store_line_visibility_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_backshop_line_vis_for_own_stores"
  ON public.backshop_store_line_visibility_overrides FOR SELECT
  USING (
    public.is_super_admin()
    OR store_id IN (
      SELECT usa.store_id FROM public.user_store_access usa
      JOIN public.stores s ON s.id = usa.store_id
      WHERE usa.user_id = auth.uid() AND s.is_active = TRUE
    )
  );

CREATE POLICY "users_write_backshop_line_vis_in_current_store"
  ON public.backshop_store_line_visibility_overrides FOR ALL
  USING (
    public.is_super_admin()
    OR (public.is_not_viewer() AND store_id = public.get_current_store_id())
  )
  WITH CHECK (
    public.is_super_admin()
    OR (public.is_not_viewer() AND store_id = public.get_current_store_id())
  );
