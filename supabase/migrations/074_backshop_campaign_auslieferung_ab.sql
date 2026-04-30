-- Backshop Zentralwerbung: Auslieferungsdatum aus Exit-Excel (Spalte „Auslieferung ab“)

ALTER TABLE public.backshop_offer_campaigns
  ADD COLUMN IF NOT EXISTS auslieferung_ab DATE NULL;

COMMENT ON COLUMN public.backshop_offer_campaigns.auslieferung_ab IS
  'Auslieferung ab (Exit-Excel), Kalenderdatum; optional für Countdown in Werbung bestellen.';
