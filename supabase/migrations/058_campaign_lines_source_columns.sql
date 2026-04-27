-- Zentrale Werbung: Excel-Herkunft je Zeile archivieren + manuelle/unassigned Zeilen zulassen
-- Neue Spalten: source_plu, source_artikel, origin
-- plu wird nullable (Zustand "keine Zuordnung")
-- UNIQUE (campaign_id, plu) -> UNIQUE (campaign_id, sort_index)

-- ============================================================
-- 1. Obst/Gemuese
-- ============================================================
ALTER TABLE public.obst_offer_campaign_lines
  ADD COLUMN IF NOT EXISTS source_plu TEXT,
  ADD COLUMN IF NOT EXISTS source_artikel TEXT,
  ADD COLUMN IF NOT EXISTS origin TEXT NOT NULL DEFAULT 'excel';

ALTER TABLE public.obst_offer_campaign_lines
  DROP CONSTRAINT IF EXISTS obst_offer_campaign_lines_origin_check;

ALTER TABLE public.obst_offer_campaign_lines
  ADD CONSTRAINT obst_offer_campaign_lines_origin_check
  CHECK (origin IN ('excel','manual','unassigned'));

ALTER TABLE public.obst_offer_campaign_lines
  ALTER COLUMN plu DROP NOT NULL;

ALTER TABLE public.obst_offer_campaign_lines
  DROP CONSTRAINT IF EXISTS obst_offer_campaign_lines_campaign_id_plu_key;

ALTER TABLE public.obst_offer_campaign_lines
  DROP CONSTRAINT IF EXISTS obst_offer_campaign_lines_campaign_sort_unique;

ALTER TABLE public.obst_offer_campaign_lines
  ADD CONSTRAINT obst_offer_campaign_lines_campaign_sort_unique
  UNIQUE (campaign_id, sort_index);

-- unassigned = keine Wirkung in Marktliste, nur Review-Archiv
-- Konsistenz: plu IS NULL <=> origin = 'unassigned'
ALTER TABLE public.obst_offer_campaign_lines
  DROP CONSTRAINT IF EXISTS obst_offer_campaign_lines_plu_origin_check;

ALTER TABLE public.obst_offer_campaign_lines
  ADD CONSTRAINT obst_offer_campaign_lines_plu_origin_check
  CHECK (
    (plu IS NOT NULL AND origin IN ('excel','manual'))
    OR (plu IS NULL AND origin = 'unassigned')
  );

-- ============================================================
-- 2. Backshop
-- ============================================================
ALTER TABLE public.backshop_offer_campaign_lines
  ADD COLUMN IF NOT EXISTS source_plu TEXT,
  ADD COLUMN IF NOT EXISTS source_artikel TEXT,
  ADD COLUMN IF NOT EXISTS origin TEXT NOT NULL DEFAULT 'excel';

ALTER TABLE public.backshop_offer_campaign_lines
  DROP CONSTRAINT IF EXISTS backshop_offer_campaign_lines_origin_check;

ALTER TABLE public.backshop_offer_campaign_lines
  ADD CONSTRAINT backshop_offer_campaign_lines_origin_check
  CHECK (origin IN ('excel','manual','unassigned'));

ALTER TABLE public.backshop_offer_campaign_lines
  ALTER COLUMN plu DROP NOT NULL;

ALTER TABLE public.backshop_offer_campaign_lines
  DROP CONSTRAINT IF EXISTS backshop_offer_campaign_lines_campaign_id_plu_key;

ALTER TABLE public.backshop_offer_campaign_lines
  DROP CONSTRAINT IF EXISTS backshop_offer_campaign_lines_campaign_sort_unique;

ALTER TABLE public.backshop_offer_campaign_lines
  ADD CONSTRAINT backshop_offer_campaign_lines_campaign_sort_unique
  UNIQUE (campaign_id, sort_index);

ALTER TABLE public.backshop_offer_campaign_lines
  DROP CONSTRAINT IF EXISTS backshop_offer_campaign_lines_plu_origin_check;

ALTER TABLE public.backshop_offer_campaign_lines
  ADD CONSTRAINT backshop_offer_campaign_lines_plu_origin_check
  CHECK (
    (plu IS NOT NULL AND origin IN ('excel','manual'))
    OR (plu IS NULL AND origin = 'unassigned')
  );

-- ============================================================
-- 3. Kommentare
-- ============================================================
COMMENT ON COLUMN public.obst_offer_campaign_lines.source_plu IS 'Excel-PLU, wie sie hochgeladen wurde (Herkunftsarchiv)';
COMMENT ON COLUMN public.obst_offer_campaign_lines.source_artikel IS 'Artikel-Hinweis aus der Excel (Herkunftsarchiv)';
COMMENT ON COLUMN public.obst_offer_campaign_lines.origin IS 'excel = aus Upload zugeordnet; manual = nachtraeglich hinzugefuegt; unassigned = Excel-Zeile ohne Master-PLU (wird nicht in Marktliste angezeigt)';

COMMENT ON COLUMN public.backshop_offer_campaign_lines.source_plu IS 'Excel-PLU, wie sie hochgeladen wurde (Herkunftsarchiv)';
COMMENT ON COLUMN public.backshop_offer_campaign_lines.source_artikel IS 'Artikel-Hinweis aus der Excel (Herkunftsarchiv)';
COMMENT ON COLUMN public.backshop_offer_campaign_lines.origin IS 'excel = aus Upload zugeordnet; manual = nachtraeglich hinzugefuegt; unassigned = Excel-Zeile ohne Master-PLU (wird nicht in Marktliste angezeigt)';
