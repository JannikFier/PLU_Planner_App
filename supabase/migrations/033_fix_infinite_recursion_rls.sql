-- 033_fix_infinite_recursion_rls.sql
-- ROOT CAUSE: RLS-Policies referenzieren user_store_access per Subquery.
-- Die Policy auf user_store_access referenziert sich SELBST → infinite recursion.
-- FIX: Alle Subqueries durch get_user_store_ids() ersetzen (SECURITY DEFINER, umgeht RLS).

-- ============================================================
-- 1. Core Tables (Migration 027 + 029)
-- ============================================================

-- stores: users_see_own_active_stores
DROP POLICY IF EXISTS "users_see_own_active_stores" ON public.stores;
CREATE POLICY "users_see_own_active_stores"
  ON public.stores FOR SELECT
  USING (
    public.is_super_admin()
    OR (is_active = TRUE AND id IN (SELECT public.get_user_store_ids()))
  );

-- user_store_access: admins_see_user_store_access_for_own_stores (SELF-REFERENCING!)
DROP POLICY IF EXISTS "admins_see_user_store_access_for_own_stores" ON public.user_store_access;
CREATE POLICY "admins_see_user_store_access_for_own_stores"
  ON public.user_store_access FOR SELECT
  USING (
    public.is_super_admin()
    OR (
      public.is_admin()
      AND store_id IN (SELECT public.get_user_store_ids())
    )
  );

-- store_list_visibility: admins_see_store_list_visibility_for_own_stores
DROP POLICY IF EXISTS "admins_see_store_list_visibility_for_own_stores" ON public.store_list_visibility;
CREATE POLICY "admins_see_store_list_visibility_for_own_stores"
  ON public.store_list_visibility FOR SELECT
  USING (
    public.is_super_admin()
    OR (
      public.is_admin()
      AND store_id IN (SELECT public.get_user_store_ids())
    )
  );

-- store_list_visibility: users_see_store_list_visibility_for_own_stores (Migration 029)
DROP POLICY IF EXISTS "users_see_store_list_visibility_for_own_stores" ON public.store_list_visibility;
CREATE POLICY "users_see_store_list_visibility_for_own_stores"
  ON public.store_list_visibility FOR SELECT
  USING (store_id IN (SELECT public.get_user_store_ids()));

-- ============================================================
-- 2. Obst/Gemuese Market Tables (Migration 028/031)
-- ============================================================

DROP POLICY IF EXISTS "users_read_custom_products_for_own_stores" ON public.custom_products;
CREATE POLICY "users_read_custom_products_for_own_stores"
  ON public.custom_products FOR SELECT
  USING (public.is_super_admin() OR store_id IN (SELECT public.get_user_store_ids()));

DROP POLICY IF EXISTS "users_read_hidden_items_for_own_stores" ON public.hidden_items;
CREATE POLICY "users_read_hidden_items_for_own_stores"
  ON public.hidden_items FOR SELECT
  USING (public.is_super_admin() OR store_id IN (SELECT public.get_user_store_ids()));

DROP POLICY IF EXISTS "users_read_version_notifications_for_own_stores" ON public.version_notifications;
CREATE POLICY "users_read_version_notifications_for_own_stores"
  ON public.version_notifications FOR SELECT
  USING (
    public.is_super_admin()
    OR (user_id = auth.uid() AND store_id IN (SELECT public.get_user_store_ids()))
  );

-- ============================================================
-- 3. Backshop Market Tables (Migration 028/031)
-- ============================================================

DROP POLICY IF EXISTS "users_read_backshop_custom_products_for_own_stores" ON public.backshop_custom_products;
CREATE POLICY "users_read_backshop_custom_products_for_own_stores"
  ON public.backshop_custom_products FOR SELECT
  USING (public.is_super_admin() OR store_id IN (SELECT public.get_user_store_ids()));

DROP POLICY IF EXISTS "users_read_backshop_hidden_items_for_own_stores" ON public.backshop_hidden_items;
CREATE POLICY "users_read_backshop_hidden_items_for_own_stores"
  ON public.backshop_hidden_items FOR SELECT
  USING (public.is_super_admin() OR store_id IN (SELECT public.get_user_store_ids()));

DROP POLICY IF EXISTS "users_read_backshop_version_notifications_for_own_stores" ON public.backshop_version_notifications;
CREATE POLICY "users_read_backshop_version_notifications_for_own_stores"
  ON public.backshop_version_notifications FOR SELECT
  USING (
    public.is_super_admin()
    OR (user_id = auth.uid() AND store_id IN (SELECT public.get_user_store_ids()))
  );

-- ============================================================
-- 4. Offer/Renamed Tables (Migration 030/031)
-- ============================================================

DROP POLICY IF EXISTS "users_read_offer_items_for_own_stores" ON public.plu_offer_items;
CREATE POLICY "users_read_offer_items_for_own_stores"
  ON public.plu_offer_items FOR SELECT
  USING (public.is_super_admin() OR store_id IN (SELECT public.get_user_store_ids()));

DROP POLICY IF EXISTS "users_read_backshop_offer_items_for_own_stores" ON public.backshop_offer_items;
CREATE POLICY "users_read_backshop_offer_items_for_own_stores"
  ON public.backshop_offer_items FOR SELECT
  USING (public.is_super_admin() OR store_id IN (SELECT public.get_user_store_ids()));

-- backshop_renamed_items: nur wenn Tabelle existiert
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'backshop_renamed_items'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "users_read_backshop_renamed_items_for_own_stores" ON public.backshop_renamed_items';
    EXECUTE '
      CREATE POLICY "users_read_backshop_renamed_items_for_own_stores"
        ON public.backshop_renamed_items FOR SELECT
        USING (public.is_super_admin() OR store_id IN (SELECT public.get_user_store_ids()))
    ';
  END IF;
END $$;
