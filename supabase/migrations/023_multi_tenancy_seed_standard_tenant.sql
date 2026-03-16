-- 023_multi_tenancy_seed_standard_tenant.sql
-- Standard-Firma und Standard-Markt anlegen
-- sowie Bestands-User und marktspezifische Daten auf diesen Markt zuordnen.
-- Siehe Spezifikation: ERWEITERUNG_MULTI_TENANCY_UND_TESTMODUS.md (Abschnitt 1.18 Migration bestehender Daten)
--
-- WICHTIG:
-- Vor Ausfuehrung dieser Migration MUSS ein vollstaendiges Backup der Datenbank erstellt werden.
-- Ein Rollback ist nur ueber das Backup moeglich.

DO $$
DECLARE
  v_standard_company_id UUID;
  v_standard_store_id UUID;
BEGIN
  -- 1. Standard-Firma anlegen (falls noch nicht vorhanden)
  INSERT INTO public.companies (name, logo_url, is_active)
  VALUES ('Standard', NULL, TRUE)
  ON CONFLICT DO NOTHING;

  SELECT id INTO v_standard_company_id
  FROM public.companies
  ORDER BY created_at
  LIMIT 1;

  IF v_standard_company_id IS NULL THEN
    RAISE EXCEPTION 'Konnte keine companies-Zeile fuer Standard-Firma ermitteln.';
  END IF;

  -- 2. Standard-Markt anlegen (falls noch nicht vorhanden)
  INSERT INTO public.stores (company_id, name, subdomain, logo_url, is_active)
  VALUES (v_standard_company_id, 'Standard-Markt', 'standard', NULL, TRUE)
  ON CONFLICT (subdomain) DO NOTHING;

  SELECT id INTO v_standard_store_id
  FROM public.stores
  WHERE subdomain = 'standard'
  LIMIT 1;

  IF v_standard_store_id IS NULL THEN
    RAISE EXCEPTION 'Konnte keinen stores-Eintrag fuer Standard-Markt ermitteln.';
  END IF;

  -- 3. Alle bestehenden Nicht-Superadmin-User dem Standard-Markt zuordnen (Heimatmarkt)
  INSERT INTO public.user_store_access (user_id, store_id, is_home_store)
  SELECT p.id, v_standard_store_id, TRUE
  FROM public.profiles p
  WHERE p.role <> 'super_admin'
    AND NOT EXISTS (
      SELECT 1
      FROM public.user_store_access usa
      WHERE usa.user_id = p.id
    );

  -- 4. Alle bestehenden marktspezifischen Daten dem Standard-Markt zuordnen
  -- Obst/Gemuese
  UPDATE public.custom_products
  SET store_id = v_standard_store_id
  WHERE store_id IS NULL;

  UPDATE public.hidden_items
  SET store_id = v_standard_store_id
  WHERE store_id IS NULL;

  UPDATE public.version_notifications
  SET store_id = v_standard_store_id
  WHERE store_id IS NULL;

  -- Backshop
  UPDATE public.backshop_custom_products
  SET store_id = v_standard_store_id
  WHERE store_id IS NULL;

  UPDATE public.backshop_hidden_items
  SET store_id = v_standard_store_id
  WHERE store_id IS NULL;

  UPDATE public.backshop_version_notifications
  SET store_id = v_standard_store_id
  WHERE store_id IS NULL;

  -- 5. current_store_id fuer alle Profile (ohne Super-Admins) auf Standard-Markt setzen
  UPDATE public.profiles
  SET current_store_id = v_standard_store_id
  WHERE role <> 'super_admin'
    AND current_store_id IS NULL;

END $$;

