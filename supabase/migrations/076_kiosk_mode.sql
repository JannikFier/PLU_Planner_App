-- ============================================================
-- Kassenmodus: Einstiegs-URL, Kassen (Auth-User pro Kasse), Rolle kiosk
-- Viewer-Paritaet: is_viewer() umfasst kiosk; Schreib-Policies schliessen Viewer+kiosk aus
-- ============================================================

-- 1) Profil-Rolle kiosk
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('super_admin', 'admin', 'user', 'viewer', 'kiosk'));

-- 2) handle_new_user: Kiosk nur bei interner E-Mail (von Edge Functions angelegt)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
BEGIN
    IF NEW.is_anonymous = TRUE THEN
        RETURN NEW;
    END IF;

    v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'user');
    IF NEW.email LIKE 'kiosk_reg_%@kiosk.pluplanner.invalid' THEN
        v_role := 'kiosk';
    ELSIF v_role NOT IN ('user', 'admin', 'viewer') THEN
        v_role := 'user';
    END IF;

    INSERT INTO public.profiles (id, email, personalnummer, display_name, role, must_change_password)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'personalnummer', ''),
        COALESCE(NEW.raw_user_meta_data->>'display_name', ''),
        v_role,
        COALESCE((NEW.raw_user_meta_data->>'must_change_password')::BOOLEAN, false)
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        display_name = EXCLUDED.display_name;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3) is_viewer(): auch kiosk (Lesemodus / keine Schreib-RLS-Pfade die NOT is_viewer nutzen)
CREATE OR REPLACE FUNCTION public.is_viewer()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('viewer', 'kiosk')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4) Tabellen Kassen-Einstieg und Kassen
CREATE TABLE IF NOT EXISTS public.store_kiosk_entrances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_store_kiosk_entrances_store
  ON public.store_kiosk_entrances(store_id) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS public.store_kiosk_registers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  sort_order INT NOT NULL,
  display_label TEXT NOT NULL,
  auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(store_id, sort_order)
);

CREATE INDEX IF NOT EXISTS idx_store_kiosk_registers_store ON public.store_kiosk_registers(store_id);

ALTER TABLE public.store_kiosk_entrances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_kiosk_registers ENABLE ROW LEVEL SECURITY;

-- Admins / Super-Admin: Kiosk-Verwaltung fuer eigene Maerkte
CREATE POLICY "store_kiosk_entrances_select_admin"
  ON public.store_kiosk_entrances FOR SELECT
  USING (
    public.is_super_admin()
    OR (
      public.is_admin()
      AND store_id IN (SELECT store_id FROM public.user_store_access WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "store_kiosk_entrances_write_admin"
  ON public.store_kiosk_entrances FOR ALL
  USING (
    public.is_super_admin()
    OR (
      public.is_admin()
      AND store_id IN (SELECT store_id FROM public.user_store_access WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_admin()
      AND store_id IN (SELECT store_id FROM public.user_store_access WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "store_kiosk_registers_select_admin"
  ON public.store_kiosk_registers FOR SELECT
  USING (
    public.is_super_admin()
    OR (
      public.is_admin()
      AND store_id IN (SELECT store_id FROM public.user_store_access WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "store_kiosk_registers_write_admin"
  ON public.store_kiosk_registers FOR ALL
  USING (
    public.is_super_admin()
    OR (
      public.is_admin()
      AND store_id IN (SELECT store_id FROM public.user_store_access WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_admin()
      AND store_id IN (SELECT store_id FROM public.user_store_access WHERE user_id = auth.uid())
    )
  );

-- Oeffentliche Liste der Kassen (nur bei gueltigem Einstiegs-Token)
CREATE OR REPLACE FUNCTION public.kiosk_list_registers(p_token TEXT)
RETURNS TABLE(id UUID, display_label TEXT, sort_order INT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id, r.display_label, r.sort_order
  FROM public.store_kiosk_entrances e
  JOIN public.store_kiosk_registers r ON r.store_id = e.store_id
  WHERE e.token = p_token
    AND e.revoked_at IS NULL
    AND r.active = true
  ORDER BY r.sort_order;
$$;

GRANT EXECUTE ON FUNCTION public.kiosk_list_registers(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.kiosk_list_registers(TEXT) TO authenticated;

-- 5) Schreib-RLS: kiosk wie viewer von marktbezogenen ALL-Policies ausschliessen
-- custom_products
DROP POLICY IF EXISTS "users_write_custom_products_in_current_store" ON public.custom_products;
CREATE POLICY "users_write_custom_products_in_current_store"
  ON public.custom_products FOR ALL
  USING (public.is_super_admin() OR (NOT public.is_viewer() AND store_id = public.get_current_store_id()))
  WITH CHECK (public.is_super_admin() OR (NOT public.is_viewer() AND store_id = public.get_current_store_id()));

-- version_notifications
DROP POLICY IF EXISTS "users_write_version_notifications_in_current_store" ON public.version_notifications;
CREATE POLICY "users_write_version_notifications_in_current_store"
  ON public.version_notifications FOR ALL
  USING (public.is_super_admin() OR (NOT public.is_viewer() AND user_id = auth.uid() AND store_id = public.get_current_store_id()))
  WITH CHECK (public.is_super_admin() OR (NOT public.is_viewer() AND user_id = auth.uid() AND store_id = public.get_current_store_id()));

-- backshop_custom_products
DROP POLICY IF EXISTS "users_write_backshop_custom_products_in_current_store" ON public.backshop_custom_products;
CREATE POLICY "users_write_backshop_custom_products_in_current_store"
  ON public.backshop_custom_products FOR ALL
  USING (public.is_super_admin() OR (NOT public.is_viewer() AND store_id = public.get_current_store_id()))
  WITH CHECK (public.is_super_admin() OR (NOT public.is_viewer() AND store_id = public.get_current_store_id()));

-- backshop_version_notifications
DROP POLICY IF EXISTS "users_write_backshop_version_notifications_in_current_store" ON public.backshop_version_notifications;
CREATE POLICY "users_write_backshop_version_notifications_in_current_store"
  ON public.backshop_version_notifications FOR ALL
  USING (public.is_super_admin() OR (NOT public.is_viewer() AND user_id = auth.uid() AND store_id = public.get_current_store_id()))
  WITH CHECK (public.is_super_admin() OR (NOT public.is_viewer() AND user_id = auth.uid() AND store_id = public.get_current_store_id()));

-- plu_offer_items
DROP POLICY IF EXISTS "users_write_offer_items_in_current_store" ON public.plu_offer_items;
CREATE POLICY "users_write_offer_items_in_current_store"
  ON public.plu_offer_items FOR ALL
  USING (public.is_super_admin() OR (NOT public.is_viewer() AND store_id = public.get_current_store_id()))
  WITH CHECK (public.is_super_admin() OR (NOT public.is_viewer() AND store_id = public.get_current_store_id()));

-- backshop_offer_items
DROP POLICY IF EXISTS "users_write_backshop_offer_items_in_current_store" ON public.backshop_offer_items;
CREATE POLICY "users_write_backshop_offer_items_in_current_store"
  ON public.backshop_offer_items FOR ALL
  USING (public.is_super_admin() OR (NOT public.is_viewer() AND store_id = public.get_current_store_id()))
  WITH CHECK (public.is_super_admin() OR (NOT public.is_viewer() AND store_id = public.get_current_store_id()));

-- backshop_renamed_items
DROP POLICY IF EXISTS "users_write_backshop_renamed_items_in_current_store" ON public.backshop_renamed_items;
CREATE POLICY "users_write_backshop_renamed_items_in_current_store"
  ON public.backshop_renamed_items FOR ALL
  USING (public.is_super_admin() OR (NOT public.is_viewer() AND store_id = public.get_current_store_id()))
  WITH CHECK (public.is_super_admin() OR (NOT public.is_viewer() AND store_id = public.get_current_store_id()));

-- renamed_items (Obst)
DROP POLICY IF EXISTS "users_write_renamed_items_in_current_store" ON public.renamed_items;
CREATE POLICY "users_write_renamed_items_in_current_store"
  ON public.renamed_items FOR ALL
  USING (public.is_super_admin() OR (NOT public.is_viewer() AND store_id = public.get_current_store_id()))
  WITH CHECK (public.is_super_admin() OR (NOT public.is_viewer() AND store_id = public.get_current_store_id()));

-- 049: hidden_items / backshop_hidden_items (ohne Super-Admin-Bypass)
DROP POLICY IF EXISTS "users_write_hidden_items_in_current_store" ON public.hidden_items;
CREATE POLICY "users_write_hidden_items_in_current_store"
  ON public.hidden_items FOR ALL
  USING (
    NOT public.is_viewer()
    AND store_id = public.get_current_store_id()
    AND public.get_current_store_id() IS NOT NULL
  )
  WITH CHECK (
    NOT public.is_viewer()
    AND store_id = public.get_current_store_id()
    AND public.get_current_store_id() IS NOT NULL
  );

DROP POLICY IF EXISTS "users_write_backshop_hidden_items_in_current_store" ON public.backshop_hidden_items;
CREATE POLICY "users_write_backshop_hidden_items_in_current_store"
  ON public.backshop_hidden_items FOR ALL
  USING (
    NOT public.is_viewer()
    AND store_id = public.get_current_store_id()
    AND public.get_current_store_id() IS NOT NULL
  )
  WITH CHECK (
    NOT public.is_viewer()
    AND store_id = public.get_current_store_id()
    AND public.get_current_store_id() IS NOT NULL
  );

-- backshop_werbung_weekday_quantities: Schreiben ohne Viewer/Kiosk in USING
DROP POLICY IF EXISTS "backshop_werbung_weekday_write_own_stores" ON public.backshop_werbung_weekday_quantities;
CREATE POLICY "backshop_werbung_weekday_write_own_stores"
  ON public.backshop_werbung_weekday_quantities FOR ALL
  USING (
    public.is_super_admin()
    OR (store_id IN (SELECT public.get_user_store_ids()) AND NOT public.is_viewer())
  )
  WITH CHECK (
    public.is_super_admin()
    OR (store_id IN (SELECT public.get_user_store_ids()) AND NOT public.is_viewer())
  );
