-- 031_fix_name_typo_rls_and_current_store.sql
-- 1. Namens-Typo: Tonscheit → Tonscheidt
-- 2. current_store_id fuer ALLE Profile setzen (inkl. Super-Admins)
-- 3. RLS Write- und Read-Policies: is_super_admin() hinzufuegen

-- ============================================================
-- 1. Namens-Typo korrigieren
-- ============================================================

UPDATE public.companies
SET name = 'Friedrich-Tonscheidt-KG', updated_at = now()
WHERE name = 'Friedrich-Tonscheit-KG';

-- ============================================================
-- 2. current_store_id fuer alle Profile setzen (inkl. Super-Admins)
-- ============================================================

DO $$
DECLARE
  v_store_id UUID;
BEGIN
  SELECT id INTO v_store_id
  FROM public.stores
  WHERE is_active = TRUE
  ORDER BY created_at
  LIMIT 1;

  IF v_store_id IS NOT NULL THEN
    UPDATE public.profiles
    SET current_store_id = v_store_id
    WHERE current_store_id IS NULL;
  END IF;
END $$;

-- ============================================================
-- 3. RLS-Policies fixen: Super-Admin darf alles lesen und schreiben
--    (aus Migrationen 028 und 030)
-- ============================================================

-- ---- custom_products ----
DROP POLICY IF EXISTS "users_read_custom_products_for_own_stores" ON public.custom_products;
CREATE POLICY "users_read_custom_products_for_own_stores"
  ON public.custom_products FOR SELECT
  USING (
    public.is_super_admin()
    OR store_id IN (
      SELECT usa.store_id FROM public.user_store_access usa
      JOIN public.stores s ON s.id = usa.store_id
      WHERE usa.user_id = auth.uid() AND s.is_active = TRUE
    )
  );

DROP POLICY IF EXISTS "users_write_custom_products_in_current_store" ON public.custom_products;
CREATE POLICY "users_write_custom_products_in_current_store"
  ON public.custom_products FOR ALL
  USING (public.is_super_admin() OR store_id = public.get_current_store_id())
  WITH CHECK (public.is_super_admin() OR store_id = public.get_current_store_id());

-- ---- hidden_items ----
DROP POLICY IF EXISTS "users_read_hidden_items_for_own_stores" ON public.hidden_items;
CREATE POLICY "users_read_hidden_items_for_own_stores"
  ON public.hidden_items FOR SELECT
  USING (
    public.is_super_admin()
    OR store_id IN (
      SELECT usa.store_id FROM public.user_store_access usa
      JOIN public.stores s ON s.id = usa.store_id
      WHERE usa.user_id = auth.uid() AND s.is_active = TRUE
    )
  );

DROP POLICY IF EXISTS "users_write_hidden_items_in_current_store" ON public.hidden_items;
CREATE POLICY "users_write_hidden_items_in_current_store"
  ON public.hidden_items FOR ALL
  USING (public.is_super_admin() OR store_id = public.get_current_store_id())
  WITH CHECK (public.is_super_admin() OR store_id = public.get_current_store_id());

-- ---- version_notifications ----
DROP POLICY IF EXISTS "users_read_version_notifications_for_own_stores" ON public.version_notifications;
CREATE POLICY "users_read_version_notifications_for_own_stores"
  ON public.version_notifications FOR SELECT
  USING (
    public.is_super_admin()
    OR (
      user_id = auth.uid()
      AND store_id IN (
        SELECT usa.store_id FROM public.user_store_access usa
        JOIN public.stores s ON s.id = usa.store_id
        WHERE usa.user_id = auth.uid() AND s.is_active = TRUE
      )
    )
  );

DROP POLICY IF EXISTS "users_write_version_notifications_in_current_store" ON public.version_notifications;
CREATE POLICY "users_write_version_notifications_in_current_store"
  ON public.version_notifications FOR ALL
  USING (public.is_super_admin() OR (user_id = auth.uid() AND store_id = public.get_current_store_id()))
  WITH CHECK (public.is_super_admin() OR (user_id = auth.uid() AND store_id = public.get_current_store_id()));

-- ---- backshop_custom_products ----
DROP POLICY IF EXISTS "users_read_backshop_custom_products_for_own_stores" ON public.backshop_custom_products;
CREATE POLICY "users_read_backshop_custom_products_for_own_stores"
  ON public.backshop_custom_products FOR SELECT
  USING (
    public.is_super_admin()
    OR store_id IN (
      SELECT usa.store_id FROM public.user_store_access usa
      JOIN public.stores s ON s.id = usa.store_id
      WHERE usa.user_id = auth.uid() AND s.is_active = TRUE
    )
  );

DROP POLICY IF EXISTS "users_write_backshop_custom_products_in_current_store" ON public.backshop_custom_products;
CREATE POLICY "users_write_backshop_custom_products_in_current_store"
  ON public.backshop_custom_products FOR ALL
  USING (public.is_super_admin() OR store_id = public.get_current_store_id())
  WITH CHECK (public.is_super_admin() OR store_id = public.get_current_store_id());

-- ---- backshop_hidden_items ----
DROP POLICY IF EXISTS "users_read_backshop_hidden_items_for_own_stores" ON public.backshop_hidden_items;
CREATE POLICY "users_read_backshop_hidden_items_for_own_stores"
  ON public.backshop_hidden_items FOR SELECT
  USING (
    public.is_super_admin()
    OR store_id IN (
      SELECT usa.store_id FROM public.user_store_access usa
      JOIN public.stores s ON s.id = usa.store_id
      WHERE usa.user_id = auth.uid() AND s.is_active = TRUE
    )
  );

DROP POLICY IF EXISTS "users_write_backshop_hidden_items_in_current_store" ON public.backshop_hidden_items;
CREATE POLICY "users_write_backshop_hidden_items_in_current_store"
  ON public.backshop_hidden_items FOR ALL
  USING (public.is_super_admin() OR store_id = public.get_current_store_id())
  WITH CHECK (public.is_super_admin() OR store_id = public.get_current_store_id());

-- ---- backshop_version_notifications ----
DROP POLICY IF EXISTS "users_read_backshop_version_notifications_for_own_stores" ON public.backshop_version_notifications;
CREATE POLICY "users_read_backshop_version_notifications_for_own_stores"
  ON public.backshop_version_notifications FOR SELECT
  USING (
    public.is_super_admin()
    OR (
      user_id = auth.uid()
      AND store_id IN (
        SELECT usa.store_id FROM public.user_store_access usa
        JOIN public.stores s ON s.id = usa.store_id
        WHERE usa.user_id = auth.uid() AND s.is_active = TRUE
      )
    )
  );

DROP POLICY IF EXISTS "users_write_backshop_version_notifications_in_current_store" ON public.backshop_version_notifications;
CREATE POLICY "users_write_backshop_version_notifications_in_current_store"
  ON public.backshop_version_notifications FOR ALL
  USING (public.is_super_admin() OR (user_id = auth.uid() AND store_id = public.get_current_store_id()))
  WITH CHECK (public.is_super_admin() OR (user_id = auth.uid() AND store_id = public.get_current_store_id()));

-- ---- plu_offer_items (aus Migration 030) ----
DROP POLICY IF EXISTS "users_read_offer_items_for_own_stores" ON public.plu_offer_items;
CREATE POLICY "users_read_offer_items_for_own_stores"
  ON public.plu_offer_items FOR SELECT
  USING (
    public.is_super_admin()
    OR store_id IN (
      SELECT usa.store_id FROM public.user_store_access usa
      JOIN public.stores s ON s.id = usa.store_id
      WHERE usa.user_id = auth.uid() AND s.is_active = TRUE
    )
  );

DROP POLICY IF EXISTS "users_write_offer_items_in_current_store" ON public.plu_offer_items;
CREATE POLICY "users_write_offer_items_in_current_store"
  ON public.plu_offer_items FOR ALL
  USING (public.is_super_admin() OR store_id = public.get_current_store_id())
  WITH CHECK (public.is_super_admin() OR store_id = public.get_current_store_id());

-- ---- backshop_offer_items (aus Migration 030) ----
DROP POLICY IF EXISTS "users_read_backshop_offer_items_for_own_stores" ON public.backshop_offer_items;
CREATE POLICY "users_read_backshop_offer_items_for_own_stores"
  ON public.backshop_offer_items FOR SELECT
  USING (
    public.is_super_admin()
    OR store_id IN (
      SELECT usa.store_id FROM public.user_store_access usa
      JOIN public.stores s ON s.id = usa.store_id
      WHERE usa.user_id = auth.uid() AND s.is_active = TRUE
    )
  );

DROP POLICY IF EXISTS "users_write_backshop_offer_items_in_current_store" ON public.backshop_offer_items;
CREATE POLICY "users_write_backshop_offer_items_in_current_store"
  ON public.backshop_offer_items FOR ALL
  USING (public.is_super_admin() OR store_id = public.get_current_store_id())
  WITH CHECK (public.is_super_admin() OR store_id = public.get_current_store_id());

-- ---- backshop_renamed_items (aus Migration 030) ----
DROP POLICY IF EXISTS "users_read_backshop_renamed_items_for_own_stores" ON public.backshop_renamed_items;
CREATE POLICY "users_read_backshop_renamed_items_for_own_stores"
  ON public.backshop_renamed_items FOR SELECT
  USING (
    public.is_super_admin()
    OR store_id IN (
      SELECT usa.store_id FROM public.user_store_access usa
      JOIN public.stores s ON s.id = usa.store_id
      WHERE usa.user_id = auth.uid() AND s.is_active = TRUE
    )
  );

DROP POLICY IF EXISTS "users_write_backshop_renamed_items_in_current_store" ON public.backshop_renamed_items;
CREATE POLICY "users_write_backshop_renamed_items_in_current_store"
  ON public.backshop_renamed_items FOR ALL
  USING (public.is_super_admin() OR store_id = public.get_current_store_id())
  WITH CHECK (public.is_super_admin() OR store_id = public.get_current_store_id());
