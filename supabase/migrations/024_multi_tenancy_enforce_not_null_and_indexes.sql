-- 024_multi_tenancy_enforce_not_null_and_indexes.sql
-- NOT NULL-Constraints und Performance-Indizes fuer Multi-Tenancy-Spalten
-- Siehe Plan: Multi-Tenancy – Phase 1: Datenbank & Migration

-- HINWEIS:
-- Diese Migration setzt voraus, dass:
-- - alle relevanten Zeilen bereits einen gueltigen store_id-Wert besitzen
-- - profiles.current_store_id fuer alle Nicht-Superadmins gesetzt ist

-- 1. NOT NULL-Constraints fuer marktspezifische Tabellen

ALTER TABLE public.custom_products
  ALTER COLUMN store_id SET NOT NULL;

ALTER TABLE public.hidden_items
  ALTER COLUMN store_id SET NOT NULL;

ALTER TABLE public.version_notifications
  ALTER COLUMN store_id SET NOT NULL;

ALTER TABLE public.backshop_custom_products
  ALTER COLUMN store_id SET NOT NULL;

ALTER TABLE public.backshop_hidden_items
  ALTER COLUMN store_id SET NOT NULL;

ALTER TABLE public.backshop_version_notifications
  ALTER COLUMN store_id SET NOT NULL;

-- 2. Optional: current_store_id als NOT NULL fuer Nicht-Superadmins logisch erzwingen
-- Technisch bleibt die Spalte nullable (Superadmins haben current_store_id = NULL),
-- die spaetere RLS/Business-Logik stellt sicher, dass normale User immer einen gueltigen Wert haben.

-- 3. Indizes fuer Performance

CREATE INDEX IF NOT EXISTS idx_custom_products_store_id
  ON public.custom_products (store_id);

CREATE INDEX IF NOT EXISTS idx_hidden_items_store_id
  ON public.hidden_items (store_id);

CREATE INDEX IF NOT EXISTS idx_version_notifications_store_id
  ON public.version_notifications (store_id);

CREATE INDEX IF NOT EXISTS idx_backshop_custom_products_store_id
  ON public.backshop_custom_products (store_id);

CREATE INDEX IF NOT EXISTS idx_backshop_hidden_items_store_id
  ON public.backshop_hidden_items (store_id);

CREATE INDEX IF NOT EXISTS idx_backshop_version_notifications_store_id
  ON public.backshop_version_notifications (store_id);

