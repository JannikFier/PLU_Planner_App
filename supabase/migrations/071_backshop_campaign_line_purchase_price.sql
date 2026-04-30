-- Backshop zentrale Werbung: Erwerbspreis aus Exit-Excel persistent speichern

ALTER TABLE public.backshop_offer_campaign_lines
  ADD COLUMN IF NOT EXISTS purchase_price NUMERIC(12, 4);

COMMENT ON COLUMN public.backshop_offer_campaign_lines.purchase_price IS
  'Erwerbspreis (EK) aus Zentral-Excel, optional; NULL wenn Spalte fehlt oder nicht erkannt.';

COMMENT ON COLUMN public.backshop_offer_campaign_lines.promo_price IS
  'Zentraler Aktions-VK aus Exit-Excel-Spalte „Akt. UVP“ (wie bisher).';
