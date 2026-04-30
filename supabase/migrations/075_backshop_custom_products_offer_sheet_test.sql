-- Eigenes Backshop-Produkt: „Test“ = auf Angebots-PDF unter „Neue Produkte“;
-- „fest“ = is_offer_sheet_test false (nur noch normale Kampagne für is_offer).
-- Neu angelegte Zeilen: DEFAULT true (Test). Bestehende Zeilen nach Migration: false,
-- damit sich Verhalten für Altbestände nicht ändert (kein neuer Block auf dem Zettel).

ALTER TABLE public.backshop_custom_products
  ADD COLUMN IF NOT EXISTS is_offer_sheet_test BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.backshop_custom_products.is_offer_sheet_test IS
  'true: erscheint im PDF „Nur Angebote“ im Block Neue Produkte; false: nur noch wie festes eigenes Produkt.';

UPDATE public.backshop_custom_products
SET is_offer_sheet_test = false;
