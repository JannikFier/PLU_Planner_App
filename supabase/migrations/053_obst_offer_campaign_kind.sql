-- Obst: mehrere zentrale Kampagnen pro KW (Exit, Ordersatz Woche, Ordersatz 3-Tage)

ALTER TABLE public.obst_offer_campaigns
  ADD COLUMN IF NOT EXISTS campaign_kind TEXT;

UPDATE public.obst_offer_campaigns
SET campaign_kind = 'exit'
WHERE campaign_kind IS NULL;

ALTER TABLE public.obst_offer_campaigns
  ALTER COLUMN campaign_kind SET NOT NULL;

ALTER TABLE public.obst_offer_campaigns
  ADD CONSTRAINT obst_offer_campaigns_campaign_kind_check
  CHECK (campaign_kind IN ('exit', 'ordersatz_week', 'ordersatz_3day'));

ALTER TABLE public.obst_offer_campaigns
  DROP CONSTRAINT IF EXISTS obst_offer_campaigns_kw_nummer_jahr_key;

ALTER TABLE public.obst_offer_campaigns
  ADD CONSTRAINT obst_offer_campaigns_kw_jahr_kind_unique
  UNIQUE (kw_nummer, jahr, campaign_kind);

COMMENT ON COLUMN public.obst_offer_campaigns.campaign_kind IS
  'exit = Exit-Excel; ordersatz_week = Gesamte Wochenwerbung; ordersatz_3day = Kurzwerbung 3-Tage-Preis (Do–Sa).';
