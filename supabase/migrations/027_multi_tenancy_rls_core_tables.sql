-- 027_multi_tenancy_rls_core_tables.sql
-- RLS fuer neue Multi-Tenancy-Kerntabellen:
-- companies, stores, user_store_access, store_list_visibility

-- Firmen: nur Super-Admin darf alles
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_manage_companies"
  ON public.companies
  FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Stores: Super-Admin sieht/verwalten alle; andere sehen nur eigene aktive Stores
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_manage_stores"
  ON public.stores
  FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "users_see_own_active_stores"
  ON public.stores
  FOR SELECT
  USING (
    public.is_super_admin()
    OR (
      is_active = TRUE
      AND id IN (
        SELECT usa.store_id
        FROM public.user_store_access usa
        WHERE usa.user_id = auth.uid()
      )
    )
  );

-- User-Store-Zuordnungen
ALTER TABLE public.user_store_access ENABLE ROW LEVEL SECURITY;

-- Super-Admin/Admin duerfen Zuordnungen sehen, die ihre eigenen Stores betreffen
CREATE POLICY "admins_see_user_store_access_for_own_stores"
  ON public.user_store_access
  FOR SELECT
  USING (
    public.is_super_admin()
    OR (
      public.is_admin()
      AND store_id IN (
        SELECT store_id
        FROM public.user_store_access usa2
        WHERE usa2.user_id = auth.uid()
      )
    )
  );

-- User sieht eigene Zuordnungen
CREATE POLICY "users_see_own_user_store_access"
  ON public.user_store_access
  FOR SELECT
  USING (user_id = auth.uid());

-- Schreiben nur ueber Edge Functions (Admins/Super-Admins)
CREATE POLICY "admins_manage_user_store_access"
  ON public.user_store_access
  FOR ALL
  USING (public.is_admin() OR public.is_super_admin())
  WITH CHECK (public.is_admin() OR public.is_super_admin());

-- Listen-Sichtbarkeit: nur Super-Admin verwaltet
ALTER TABLE public.store_list_visibility ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_manage_store_list_visibility"
  ON public.store_list_visibility
  FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Lesen: Admins/Super-Admins koennen Sichtbarkeit fuer eigene Stores sehen
CREATE POLICY "admins_see_store_list_visibility_for_own_stores"
  ON public.store_list_visibility
  FOR SELECT
  USING (
    public.is_super_admin()
    OR (
      public.is_admin()
      AND store_id IN (
        SELECT store_id
        FROM public.user_store_access usa
        WHERE usa.user_id = auth.uid()
      )
    )
  );

