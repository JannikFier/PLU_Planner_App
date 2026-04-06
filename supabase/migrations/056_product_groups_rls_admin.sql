-- Tabelle product_groups (falls im Supabase-Projekt genutzt, z. B. statt oder parallel zu public.blocks):
-- RLS so setzen, dass Admin + Super-Admin schreiben duerfen (403 bei POST /product_groups beheben).
-- Wenn die Tabelle nicht existiert, wird nichts geaendert.

DO $migration$
DECLARE
  r RECORD;
BEGIN
  IF to_regclass('public.product_groups') IS NULL THEN
    RAISE NOTICE '056: public.product_groups fehlt – übersprungen.';
    RETURN;
  END IF;

  ALTER TABLE public.product_groups ENABLE ROW LEVEL SECURITY;

  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'product_groups'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.product_groups', r.policyname);
  END LOOP;

  CREATE POLICY "product_groups_select_authenticated"
    ON public.product_groups FOR SELECT
    USING (auth.uid() IS NOT NULL);

  CREATE POLICY "product_groups_insert_admin"
    ON public.product_groups FOR INSERT
    WITH CHECK (public.is_admin());

  CREATE POLICY "product_groups_update_admin"
    ON public.product_groups FOR UPDATE
    USING (public.is_admin());

  CREATE POLICY "product_groups_delete_admin"
    ON public.product_groups FOR DELETE
    USING (public.is_admin());
END
$migration$;
