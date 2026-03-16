-- 022_multi_tenancy_add_store_id_and_current_store_id.sql
-- Neue Spalten für Multi-Tenancy:
-- - profiles.current_store_id (aktueller Markt des Users)
-- - store_id auf marktspezifischen Tabellen (User-/Markt-bezogene Daten)
-- Siehe Spezifikation: ERWEITERUNG_MULTI_TENANCY_UND_TESTMODUS.md (Feature 1: Multi-Tenancy, Abschnitt Datenmodell)

-- Hinweis:
-- Diese Migration fuegt nur neue Spalten hinzu (nullable) und migriert noch keine Daten.
-- Die Befuellung erfolgt in einer separaten Migration, damit Fehler leichter einzugrenzen sind.

-- Aktueller Markt des Users (wird spaeter auf den Heimatmarkt gesetzt)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS current_store_id UUID REFERENCES public.stores(id);

-- Marktspezifische Daten: Eigene Produkte (Obst/Gemuese)
ALTER TABLE public.custom_products
  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id);

-- Marktspezifische Daten: Ausgeblendete Produkte (Obst/Gemuese)
ALTER TABLE public.hidden_items
  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id);

-- Marktspezifische Daten: Benachrichtigungen pro Version (Obst/Gemuese)
ALTER TABLE public.version_notifications
  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id);

-- Marktspezifische Daten: Eigene Produkte (Backshop)
ALTER TABLE public.backshop_custom_products
  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id);

-- Marktspezifische Daten: Ausgeblendete Produkte (Backshop)
ALTER TABLE public.backshop_hidden_items
  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id);

-- Marktspezifische Daten: Benachrichtigungen pro Version (Backshop)
ALTER TABLE public.backshop_version_notifications
  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id);

