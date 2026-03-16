-- 025_multi_tenancy_seed_store_list_visibility_standard.sql
-- Initiale Listen-Sichtbarkeit fuer den Standard-Markt setzen.
-- Siehe Spezifikation: ERWEITERUNG_MULTI_TENANCY_UND_TESTMODUS.md (Abschnitt 1.10 / 1.18)

DO $$
DECLARE
  v_standard_store_id UUID;
BEGIN
  -- Standard-Markt anhand der Subdomain ermitteln
  SELECT id INTO v_standard_store_id
  FROM public.stores
  WHERE subdomain = 'standard'
  LIMIT 1;

  IF v_standard_store_id IS NULL THEN
    RAISE EXCEPTION 'Standard-Markt mit Subdomain \"standard\" wurde nicht gefunden. Migration 023_multi_tenancy_seed_standard_tenant.sql muss vorher laufen.';
  END IF;

  -- Obst & Gemuese sichtbar
  INSERT INTO public.store_list_visibility (store_id, list_type, is_visible)
  VALUES (v_standard_store_id, 'obst_gemuese', TRUE)
  ON CONFLICT (store_id, list_type) DO NOTHING;

  -- Backshop sichtbar
  INSERT INTO public.store_list_visibility (store_id, list_type, is_visible)
  VALUES (v_standard_store_id, 'backshop', TRUE)
  ON CONFLICT (store_id, list_type) DO NOTHING;

END $$;

