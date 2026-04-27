-- Carryover-RLS: Super-Admin wie bei hidden_items / version_notifications (061 hatte nur admin/user).

DROP POLICY IF EXISTS "users_read_store_list_carryover_for_own_stores" ON public.store_list_carryover;
CREATE POLICY "users_read_store_list_carryover_for_own_stores"
  ON public.store_list_carryover
  FOR SELECT
  USING (
    public.is_super_admin()
    OR store_id IN (
      SELECT usa.store_id
      FROM public.user_store_access usa
      JOIN public.stores s ON s.id = usa.store_id
      WHERE usa.user_id = auth.uid()
        AND s.is_active = TRUE
    )
  );

DROP POLICY IF EXISTS "users_write_store_list_carryover_in_current_store" ON public.store_list_carryover;
CREATE POLICY "users_write_store_list_carryover_in_current_store"
  ON public.store_list_carryover
  FOR ALL
  USING (
    public.is_super_admin()
    OR (
      store_id = public.get_current_store_id()
      AND public.get_current_store_id() IS NOT NULL
      AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'user')
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      store_id = public.get_current_store_id()
      AND public.get_current_store_id() IS NOT NULL
      AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'user')
    )
  );
