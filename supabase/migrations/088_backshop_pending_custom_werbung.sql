-- Backshop: zentrale Werbung „Neues Produkt“ (pending_custom) + marktbezogene PLU-Auflösung
-- Zentrale Zeile bleibt plu NULL; pro Markt optional Eintrag in backshop_offer_campaign_line_store_plu.
-- Beim Löschen des eigenen Produkts entfällt die Auflösung per ON DELETE CASCADE.

BEGIN;

-- 1) origin um pending_custom erweitern (nur Backshop-Kampagnenzeilen)
ALTER TABLE public.backshop_offer_campaign_lines
  DROP CONSTRAINT IF EXISTS backshop_offer_campaign_lines_origin_check;

ALTER TABLE public.backshop_offer_campaign_lines
  ADD CONSTRAINT backshop_offer_campaign_lines_origin_check
  CHECK (origin IN ('excel', 'manual', 'unassigned', 'pending_custom'));

ALTER TABLE public.backshop_offer_campaign_lines
  DROP CONSTRAINT IF EXISTS backshop_offer_campaign_lines_plu_origin_check;

ALTER TABLE public.backshop_offer_campaign_lines
  ADD CONSTRAINT backshop_offer_campaign_lines_plu_origin_check
  CHECK (
    (plu IS NOT NULL AND origin IN ('excel', 'manual'))
    OR (plu IS NULL AND origin IN ('unassigned', 'pending_custom'))
  );

COMMENT ON COLUMN public.backshop_offer_campaign_lines.origin IS
  'excel = aus Upload zugeordnet; manual = nachtraeglich; unassigned = Archiv ohne Master-PLU; pending_custom = Markt legt PLU/eigenes Produkt an (sichtbar in Werbung, plu zentral NULL)';

-- 2) Marktbezogene Auflösung: eine PLU pro Markt und Kampagnenzeile
CREATE TABLE public.backshop_offer_campaign_line_store_plu (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_line_id UUID NOT NULL
    REFERENCES public.backshop_offer_campaign_lines(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  plu TEXT NOT NULL,
  custom_product_id UUID NOT NULL
    REFERENCES public.backshop_custom_products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  UNIQUE (campaign_line_id, store_id),
  UNIQUE (store_id, custom_product_id)
);

CREATE INDEX idx_bs_campaign_line_store_plu_line
  ON public.backshop_offer_campaign_line_store_plu (campaign_line_id);
CREATE INDEX idx_bs_campaign_line_store_plu_store
  ON public.backshop_offer_campaign_line_store_plu (store_id);

COMMENT ON TABLE public.backshop_offer_campaign_line_store_plu IS
  'Markt-spezifische PLU fuer zentrale Werbezeile origin=pending_custom: verknuepft Custom-Produkt mit Kampagnenzeile; CASCADE bei Produktloeschung.';

ALTER TABLE public.backshop_offer_campaign_line_store_plu ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bs_campaign_line_store_plu_select"
  ON public.backshop_offer_campaign_line_store_plu FOR SELECT
  USING (
    public.is_super_admin()
    OR store_id IN (SELECT public.get_user_store_ids())
  );

CREATE POLICY "bs_campaign_line_store_plu_write_current_store"
  ON public.backshop_offer_campaign_line_store_plu FOR ALL
  USING (
    public.is_super_admin()
    OR (
      store_id = public.get_current_store_id()
      AND public.get_current_store_id() IS NOT NULL
      AND NOT public.is_viewer()
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      store_id = public.get_current_store_id()
      AND public.get_current_store_id() IS NOT NULL
      AND NOT public.is_viewer()
    )
  );

-- 3) RPC: Verknuepfung nach Anlegen des eigenen Produkts (Markt-Kontext = current_store_id)
CREATE OR REPLACE FUNCTION public.link_backshop_werbung_pending_line(
  p_campaign_line_id uuid,
  p_custom_product_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store_id uuid;
  v_line_id uuid;
  v_line_plu text;
  v_line_origin text;
  v_plu text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Nicht angemeldet';
  END IF;
  IF public.is_viewer() THEN
    RAISE EXCEPTION 'Keine Berechtigung';
  END IF;

  v_store_id := public.get_current_store_id();
  IF v_store_id IS NULL THEN
    RAISE EXCEPTION 'Kein Markt gewaehlt (current_store_id)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (
        public.is_super_admin()
        OR v_store_id IN (SELECT public.get_user_store_ids())
      )
  ) THEN
    RAISE EXCEPTION 'Kein Zugriff auf diesen Markt';
  END IF;

  SELECT l.id, l.plu, l.origin
  INTO v_line_id, v_line_plu, v_line_origin
  FROM public.backshop_offer_campaign_lines l
  WHERE l.id = p_campaign_line_id;

  IF v_line_id IS NULL THEN
    RAISE EXCEPTION 'Werbungszeile nicht gefunden';
  END IF;
  IF v_line_origin <> 'pending_custom' OR v_line_plu IS NOT NULL THEN
    RAISE EXCEPTION 'Nur fuer Zeilen mit Neues-Produkt-Status (pending_custom) ohne zentrale PLU';
  END IF;

  SELECT cp.plu INTO v_plu
  FROM public.backshop_custom_products cp
  WHERE cp.id = p_custom_product_id
    AND cp.store_id = v_store_id;

  IF v_plu IS NULL THEN
    RAISE EXCEPTION 'Eigenes Produkt nicht gefunden oder gehoert nicht zum aktuellen Markt';
  END IF;

  INSERT INTO public.backshop_offer_campaign_line_store_plu (
    campaign_line_id,
    store_id,
    plu,
    custom_product_id,
    created_by
  ) VALUES (
    p_campaign_line_id,
    v_store_id,
    v_plu,
    p_custom_product_id,
    auth.uid()
  )
  ON CONFLICT (campaign_line_id, store_id) DO UPDATE SET
    plu = EXCLUDED.plu,
    custom_product_id = EXCLUDED.custom_product_id,
    created_by = EXCLUDED.created_by;
END;
$$;

REVOKE ALL ON FUNCTION public.link_backshop_werbung_pending_line(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.link_backshop_werbung_pending_line(uuid, uuid) TO authenticated;

COMMIT;
