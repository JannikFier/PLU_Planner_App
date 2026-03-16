-- 028_multi_tenancy_rls_market_tables.sql
-- Multi-Tenancy RLS fuer marktspezifische Tabellen
-- Obst/Gemuese: custom_products, hidden_items, version_notifications
-- Backshop: backshop_custom_products, backshop_hidden_items, backshop_version_notifications
-- Lesen: nur eigene Maerkte (user_store_access + aktive Stores)
-- Schreiben: nur im aktuellen Markt (profiles.current_store_id)

-- Hilfs-Constraint: RLS ist bereits in frueheren Migrationen aktiviert.

-- ============================================================
-- 1. Bestehende Policies droppen
-- ============================================================

-- custom_products
DROP POLICY IF EXISTS "Alle koennen custom_products lesen" ON public.custom_products;
DROP POLICY IF EXISTS "Alle koennen custom_products einfuegen" ON public.custom_products;
DROP POLICY IF EXISTS "Ersteller oder Super-Admin kann custom_products updaten" ON public.custom_products;
DROP POLICY IF EXISTS "Ersteller oder Super-Admin kann custom_products loeschen" ON public.custom_products;

-- hidden_items
DROP POLICY IF EXISTS "Alle koennen hidden_items lesen" ON public.hidden_items;
DROP POLICY IF EXISTS "Alle koennen hidden_items einfuegen" ON public.hidden_items;
DROP POLICY IF EXISTS "Alle koennen hidden_items loeschen" ON public.hidden_items;

-- version_notifications
DROP POLICY IF EXISTS "User lesen eigene version_notifications" ON public.version_notifications;
DROP POLICY IF EXISTS "User updaten eigene version_notifications" ON public.version_notifications;
DROP POLICY IF EXISTS "Super-Admin erstellt version_notifications" ON public.version_notifications;

-- Backshop-Pendants
DROP POLICY IF EXISTS "Alle koennen backshop_custom_products lesen" ON public.backshop_custom_products;
DROP POLICY IF EXISTS "Alle koennen backshop_custom_products einfuegen" ON public.backshop_custom_products;
DROP POLICY IF EXISTS "Ersteller oder Super-Admin kann backshop_custom_products aendern" ON public.backshop_custom_products;
DROP POLICY IF EXISTS "Ersteller oder Super-Admin kann backshop_custom_products loeschen" ON public.backshop_custom_products;

DROP POLICY IF EXISTS "Alle koennen backshop_hidden_items lesen" ON public.backshop_hidden_items;
DROP POLICY IF EXISTS "Alle koennen backshop_hidden_items einfuegen" ON public.backshop_hidden_items;
DROP POLICY IF EXISTS "Alle koennen backshop_hidden_items loeschen" ON public.backshop_hidden_items;

DROP POLICY IF EXISTS "User lesen eigene backshop_version_notifications" ON public.backshop_version_notifications;
DROP POLICY IF EXISTS "User aendern eigene backshop_version_notifications" ON public.backshop_version_notifications;
DROP POLICY IF EXISTS "Super-Admin erstellt backshop_version_notifications" ON public.backshop_version_notifications;

-- ============================================================
-- 2. Neue Policies: Obst/Gemuese
-- ============================================================

-- Lesen: User sieht nur Daten von aktiven Stores, auf die er Zugriff hat
CREATE POLICY "users_read_custom_products_for_own_stores"
  ON public.custom_products
  FOR SELECT
  USING (
    store_id IN (
      SELECT usa.store_id
      FROM public.user_store_access usa
      JOIN public.stores s ON s.id = usa.store_id
      WHERE usa.user_id = auth.uid()
        AND s.is_active = TRUE
    )
  );

CREATE POLICY "users_read_hidden_items_for_own_stores"
  ON public.hidden_items
  FOR SELECT
  USING (
    store_id IN (
      SELECT usa.store_id
      FROM public.user_store_access usa
      JOIN public.stores s ON s.id = usa.store_id
      WHERE usa.user_id = auth.uid()
        AND s.is_active = TRUE
    )
  );

CREATE POLICY "users_read_version_notifications_for_own_stores"
  ON public.version_notifications
  FOR SELECT
  USING (
    user_id = auth.uid()
    AND store_id IN (
      SELECT usa.store_id
      FROM public.user_store_access usa
      JOIN public.stores s ON s.id = usa.store_id
      WHERE usa.user_id = auth.uid()
        AND s.is_active = TRUE
    )
  );

-- Schreiben: nur im aktuellen Markt
CREATE POLICY "users_write_custom_products_in_current_store"
  ON public.custom_products
  FOR ALL
  USING (
    store_id = public.get_current_store_id()
  )
  WITH CHECK (
    store_id = public.get_current_store_id()
  );

CREATE POLICY "users_write_hidden_items_in_current_store"
  ON public.hidden_items
  FOR ALL
  USING (
    store_id = public.get_current_store_id()
  )
  WITH CHECK (
    store_id = public.get_current_store_id()
  );

CREATE POLICY "users_write_version_notifications_in_current_store"
  ON public.version_notifications
  FOR ALL
  USING (
    user_id = auth.uid()
    AND store_id = public.get_current_store_id()
  )
  WITH CHECK (
    user_id = auth.uid()
    AND store_id = public.get_current_store_id()
  );

-- ============================================================
-- 3. Neue Policies: Backshop
-- ============================================================

CREATE POLICY "users_read_backshop_custom_products_for_own_stores"
  ON public.backshop_custom_products
  FOR SELECT
  USING (
    store_id IN (
      SELECT usa.store_id
      FROM public.user_store_access usa
      JOIN public.stores s ON s.id = usa.store_id
      WHERE usa.user_id = auth.uid()
        AND s.is_active = TRUE
    )
  );

CREATE POLICY "users_read_backshop_hidden_items_for_own_stores"
  ON public.backshop_hidden_items
  FOR SELECT
  USING (
    store_id IN (
      SELECT usa.store_id
      FROM public.user_store_access usa
      JOIN public.stores s ON s.id = usa.store_id
      WHERE usa.user_id = auth.uid()
        AND s.is_active = TRUE
    )
  );

CREATE POLICY "users_read_backshop_version_notifications_for_own_stores"
  ON public.backshop_version_notifications
  FOR SELECT
  USING (
    user_id = auth.uid()
    AND store_id IN (
      SELECT usa.store_id
      FROM public.user_store_access usa
      JOIN public.stores s ON s.id = usa.store_id
      WHERE usa.user_id = auth.uid()
        AND s.is_active = TRUE
    )
  );

CREATE POLICY "users_write_backshop_custom_products_in_current_store"
  ON public.backshop_custom_products
  FOR ALL
  USING (
    store_id = public.get_current_store_id()
  )
  WITH CHECK (
    store_id = public.get_current_store_id()
  );

CREATE POLICY "users_write_backshop_hidden_items_in_current_store"
  ON public.backshop_hidden_items
  FOR ALL
  USING (
    store_id = public.get_current_store_id()
  )
  WITH CHECK (
    store_id = public.get_current_store_id()
  );

CREATE POLICY "users_write_backshop_version_notifications_in_current_store"
  ON public.backshop_version_notifications
  FOR ALL
  USING (
    user_id = auth.uid()
    AND store_id = public.get_current_store_id()
  )
  WITH CHECK (
    user_id = auth.uid()
    AND store_id = public.get_current_store_id()
  );

