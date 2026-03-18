-- ============================================================
-- PLU Planner – Migration 038: Per-User Bereichs-Sichtbarkeit
-- Ermöglicht Admin/Super-Admin pro User festzulegen, welche
-- Bereiche (Obst/Gemüse, Backshop) sichtbar sind.
-- Default: Beide sichtbar (kein Eintrag = sichtbar).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_list_visibility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  list_type text NOT NULL CHECK (list_type IN ('obst_gemuese', 'backshop')),
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, store_id, list_type)
);

ALTER TABLE public.user_list_visibility ENABLE ROW LEVEL SECURITY;

-- User darf eigene Einträge lesen
CREATE POLICY "user_list_visibility_select_own"
  ON public.user_list_visibility FOR SELECT
  USING (user_id = auth.uid());

-- Admin/Super-Admin darf alle Einträge im eigenen Markt lesen
CREATE POLICY "user_list_visibility_select_admin"
  ON public.user_list_visibility FOR SELECT
  USING (
    public.is_admin()
    AND store_id IN (SELECT store_id FROM public.user_store_access WHERE user_id = auth.uid())
  );

-- Admin/Super-Admin darf Einträge im eigenen Markt einfügen
CREATE POLICY "user_list_visibility_insert_admin"
  ON public.user_list_visibility FOR INSERT
  WITH CHECK (
    public.is_admin()
    AND store_id IN (SELECT store_id FROM public.user_store_access WHERE user_id = auth.uid())
  );

-- Admin/Super-Admin darf Einträge im eigenen Markt ändern
CREATE POLICY "user_list_visibility_update_admin"
  ON public.user_list_visibility FOR UPDATE
  USING (
    public.is_admin()
    AND store_id IN (SELECT store_id FROM public.user_store_access WHERE user_id = auth.uid())
  );

-- Admin/Super-Admin darf Einträge im eigenen Markt löschen
CREATE POLICY "user_list_visibility_delete_admin"
  ON public.user_list_visibility FOR DELETE
  USING (
    public.is_admin()
    AND store_id IN (SELECT store_id FROM public.user_store_access WHERE user_id = auth.uid())
  );

-- Super-Admin darf alles (hat ggf. keinen user_store_access)
CREATE POLICY "user_list_visibility_super_admin_all"
  ON public.user_list_visibility FOR ALL
  USING (public.is_super_admin());
