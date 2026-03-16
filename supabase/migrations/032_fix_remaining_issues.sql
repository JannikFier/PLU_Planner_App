-- 032_fix_remaining_issues.sql
-- 1. Super-Admin in user_store_access eintragen (Angerbogen als Heimatmarkt)
-- 2. current_store_id fuer ALLE Profile setzen (Sicherheitsnetz)
-- 3. backshop_renamed_items Policies (nur wenn Tabelle existiert)

DO $$
DECLARE
  v_store_id UUID;
  v_company_id UUID;
  v_store_name TEXT;
  v_company_name TEXT;
  v_count INT;
  r RECORD;
BEGIN
  -- Diagnostik: Store und Company IDs ausgeben
  SELECT s.id, s.name, s.company_id, c.name
  INTO v_store_id, v_store_name, v_company_id, v_company_name
  FROM public.stores s
  JOIN public.companies c ON c.id = s.company_id
  WHERE s.is_active = TRUE
  ORDER BY s.created_at
  LIMIT 1;

  IF v_store_id IS NULL THEN
    RAISE EXCEPTION 'FEHLER: Kein aktiver Store gefunden!';
  END IF;

  RAISE NOTICE '=== DIAGNOSTIK ===';
  RAISE NOTICE 'Erster aktiver Store: % (ID: %)', v_store_name, v_store_id;
  RAISE NOTICE 'Zugehoerige Firma: % (ID: %)', v_company_name, v_company_id;

  FOR r IN SELECT s.id, s.name, s.subdomain, s.company_id, s.is_active
           FROM public.stores s ORDER BY s.created_at
  LOOP
    RAISE NOTICE 'Store: % | subdomain: % | company_id: % | active: %',
      r.name, r.subdomain, r.company_id, r.is_active;
  END LOOP;

  -- 1. Super-Admin(s) in user_store_access eintragen
  INSERT INTO public.user_store_access (user_id, store_id, is_home_store)
  SELECT p.id, v_store_id, TRUE
  FROM public.profiles p
  WHERE p.role = 'super_admin'
    AND NOT EXISTS (
      SELECT 1 FROM public.user_store_access usa
      WHERE usa.user_id = p.id
    );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Super-Admin user_store_access Eintraege erstellt: %', v_count;

  -- 2. current_store_id fuer ALLE Profile setzen (Sicherheitsnetz)
  UPDATE public.profiles
  SET current_store_id = v_store_id
  WHERE current_store_id IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Profile mit current_store_id aktualisiert: %', v_count;

  -- 3. backshop_renamed_items Policies (nur wenn Tabelle existiert)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'backshop_renamed_items'
  ) THEN
    RAISE NOTICE 'backshop_renamed_items existiert – erstelle Policies';

    EXECUTE 'DROP POLICY IF EXISTS "users_read_backshop_renamed_items_for_own_stores" ON public.backshop_renamed_items';
    EXECUTE '
      CREATE POLICY "users_read_backshop_renamed_items_for_own_stores"
        ON public.backshop_renamed_items FOR SELECT
        USING (
          public.is_super_admin()
          OR store_id IN (
            SELECT usa.store_id FROM public.user_store_access usa
            JOIN public.stores s ON s.id = usa.store_id
            WHERE usa.user_id = auth.uid() AND s.is_active = TRUE
          )
        )
    ';

    EXECUTE 'DROP POLICY IF EXISTS "users_write_backshop_renamed_items_in_current_store" ON public.backshop_renamed_items';
    EXECUTE '
      CREATE POLICY "users_write_backshop_renamed_items_in_current_store"
        ON public.backshop_renamed_items FOR ALL
        USING (public.is_super_admin() OR store_id = public.get_current_store_id())
        WITH CHECK (public.is_super_admin() OR store_id = public.get_current_store_id())
    ';
  ELSE
    RAISE NOTICE 'backshop_renamed_items existiert NICHT – ueberspringe Policies';
  END IF;

  RAISE NOTICE '=== MIGRATION 032 ABGESCHLOSSEN ===';
END $$;
