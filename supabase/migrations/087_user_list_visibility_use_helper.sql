-- Konsistenz-Fix: user_list_visibility Admin-Policies (Migration 038) verwenden noch das
-- veraltete Subquery-Pattern (SELECT ... FROM user_store_access WHERE user_id = auth.uid()),
-- das in Migration 033 für andere Tabellen mit get_user_store_ids() ersetzt wurde.
-- Aktuell harmlos (App läuft), aber inkonsistent + potentielle Performance-/Recursion-Falle.
-- Diese Migration zieht user_list_visibility auf den gleichen Pattern.
--
-- Unverändert bleiben:
--  - user_list_visibility_select_own (eigener User, kein Subquery)
--  - user_list_visibility_super_admin_all (Super-Admin via is_super_admin())

DROP POLICY IF EXISTS "user_list_visibility_select_admin" ON public.user_list_visibility;
CREATE POLICY "user_list_visibility_select_admin"
  ON public.user_list_visibility FOR SELECT
  USING (
    public.is_admin()
    AND store_id IN (SELECT public.get_user_store_ids())
  );

DROP POLICY IF EXISTS "user_list_visibility_insert_admin" ON public.user_list_visibility;
CREATE POLICY "user_list_visibility_insert_admin"
  ON public.user_list_visibility FOR INSERT
  WITH CHECK (
    public.is_admin()
    AND store_id IN (SELECT public.get_user_store_ids())
  );

DROP POLICY IF EXISTS "user_list_visibility_update_admin" ON public.user_list_visibility;
CREATE POLICY "user_list_visibility_update_admin"
  ON public.user_list_visibility FOR UPDATE
  USING (
    public.is_admin()
    AND store_id IN (SELECT public.get_user_store_ids())
  );

DROP POLICY IF EXISTS "user_list_visibility_delete_admin" ON public.user_list_visibility;
CREATE POLICY "user_list_visibility_delete_admin"
  ON public.user_list_visibility FOR DELETE
  USING (
    public.is_admin()
    AND store_id IN (SELECT public.get_user_store_ids())
  );
