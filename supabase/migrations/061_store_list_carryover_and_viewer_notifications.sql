-- Viewer: keine Benachrichtigungs-Zeilen mehr (Cleanup + neue Logik im Client).
-- Carryover: Markt-spezifische Verlängerung rausgefallener PLUs (eine KW, eigene Schicht).
-- Backshop: optionale Markierung „Transfer-Woche gestartet“.

-- ============================================================
-- 1. Bestehende Viewer-Benachrichtigungen entfernen
-- ============================================================
DELETE FROM public.version_notifications vn
USING public.profiles p
WHERE vn.user_id = p.id AND p.role = 'viewer';

DELETE FROM public.backshop_version_notifications bn
USING public.profiles p
WHERE bn.user_id = p.id AND p.role = 'viewer';

-- ============================================================
-- 2. Backshop-Version: Transfer-Woche (User/Admin setzen)
-- ============================================================
ALTER TABLE public.backshop_versions
  ADD COLUMN IF NOT EXISTS transfer_week_started_at TIMESTAMPTZ;

COMMENT ON COLUMN public.backshop_versions.transfer_week_started_at IS
  'Wenn gesetzt: Carryover-/Benachrichtigungsfenster fuer diese Backshop-Version gilt ab diesem Zeitpunkt (unregelmaessige Updates).';

-- ============================================================
-- 3. store_list_carryover
-- ============================================================
CREATE TABLE IF NOT EXISTS public.store_list_carryover (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  list_type TEXT NOT NULL CHECK (list_type IN ('obst', 'backshop')),
  for_version_id UUID NOT NULL,
  from_version_id UUID NOT NULL,
  plu TEXT NOT NULL,
  system_name TEXT NOT NULL,
  display_name TEXT,
  item_type TEXT NOT NULL CHECK (item_type IN ('PIECE', 'WEIGHT')),
  preis NUMERIC,
  block_id UUID,
  warengruppe TEXT,
  old_plu TEXT,
  image_url TEXT,
  source TEXT,
  market_include BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT store_list_carryover_unique_plu UNIQUE (store_id, list_type, for_version_id, plu)
);

CREATE INDEX IF NOT EXISTS idx_store_list_carryover_lookup
  ON public.store_list_carryover (store_id, list_type, for_version_id);

COMMENT ON TABLE public.store_list_carryover IS
  'Markt: PLU aus Vorversion fuer eine Ziel-KW/Version wieder einblenden (max. eine KW; Zentral-Master unveraendert).';

ALTER TABLE public.store_list_carryover ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_store_list_carryover_for_own_stores"
  ON public.store_list_carryover
  FOR SELECT
  USING (
    store_id IN (
      SELECT usa.store_id
      FROM public.user_store_access usa
      JOIN public.stores s ON s.id = usa.store_id
      WHERE usa.user_id = auth.uid()
        AND s.is_active = TRUE
    )
  );

CREATE POLICY "users_write_store_list_carryover_in_current_store"
  ON public.store_list_carryover
  FOR ALL
  USING (
    store_id = public.get_current_store_id()
    AND public.get_current_store_id() IS NOT NULL
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'user')
  )
  WITH CHECK (
    store_id = public.get_current_store_id()
    AND public.get_current_store_id() IS NOT NULL
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'user')
  );
