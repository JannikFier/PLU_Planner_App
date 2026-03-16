-- 029_fix_anonymous_trigger_and_rename.sql
-- 1. handle_new_user() Trigger absichern: Anonyme User ignorieren
-- 2. Standard-Firma/Markt umbenennen auf echte Daten
-- 3. store_list_visibility: Leserecht fuer alle authentifizierten User

-- ============================================================
-- 1. Trigger: Anonyme User ignorieren
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Anonyme User erhalten kein Profil
    IF NEW.is_anonymous = TRUE THEN
        RETURN NEW;
    END IF;

    INSERT INTO public.profiles (id, email, personalnummer, display_name, role, must_change_password)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'personalnummer', ''),
        COALESCE(NEW.raw_user_meta_data->>'display_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
        COALESCE((NEW.raw_user_meta_data->>'must_change_password')::BOOLEAN, false)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 2. Standard-Firma und Standard-Markt umbenennen
-- ============================================================

UPDATE public.companies
SET name = 'Friedrich-Tonscheit-KG', updated_at = now()
WHERE name = 'Standard';

UPDATE public.stores
SET name = 'Angerbogen', subdomain = 'angerbogen', updated_at = now()
WHERE subdomain = 'standard';

-- ============================================================
-- 3. store_list_visibility: Alle User koennen die Sichtbarkeit
--    ihres eigenen Stores lesen (fuer Listen-Anzeige im Frontend)
-- ============================================================

DROP POLICY IF EXISTS "users_see_store_list_visibility_for_own_stores" ON public.store_list_visibility;

CREATE POLICY "users_see_store_list_visibility_for_own_stores"
  ON public.store_list_visibility
  FOR SELECT
  USING (
    store_id IN (
      SELECT usa.store_id
      FROM public.user_store_access usa
      WHERE usa.user_id = auth.uid()
    )
  );
