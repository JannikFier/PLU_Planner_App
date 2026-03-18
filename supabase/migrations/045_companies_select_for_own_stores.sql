-- 045_companies_select_for_own_stores.sql
-- BEHEBT: 406 Not Acceptable bei companies-Abfrage (loadCompanyInBackground)
--
-- Ursache: companies hatte nur super_admin_manage_companies – Admin/User konnten
-- keine Firmendaten lesen. PostgREST liefert 406 wenn .single() 0 Zeilen bekommt.
--
-- Loesung: Zusaetzliche SELECT-Policy – User duerfen Firmen lesen, zu deren
-- Maerkten sie Zugriff haben (ueber user_store_access).

CREATE POLICY "users_read_companies_for_own_stores"
  ON public.companies FOR SELECT
  USING (
    public.is_super_admin()
    OR id IN (
      SELECT s.company_id
      FROM public.stores s
      WHERE s.id IN (SELECT public.get_user_store_ids())
    )
  );
