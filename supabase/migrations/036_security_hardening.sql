-- 036_security_hardening.sql
-- Sicherheitshaertung:
-- 1. handle_new_user: Rollen-Eskalation ueber user_metadata verhindern
-- 2. profiles UPDATE Policy: current_store_id nur auf eigene Stores erlauben
-- 3. SECURITY DEFINER Funktionen: search_path setzen

-- ============================================================
-- 1. handle_new_user: Rolle erzwingen (nie super_admin ueber Trigger)
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
BEGIN
    IF NEW.is_anonymous = TRUE THEN
        RETURN NEW;
    END IF;

    -- Rolle aus Metadata lesen, aber auf erlaubte Werte beschraenken
    v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'user');
    IF v_role NOT IN ('user', 'admin', 'viewer') THEN
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

-- ============================================================
-- 2. profiles UPDATE Policy: current_store_id einschraenken
-- ============================================================

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (
        id = auth.uid()
        AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid() LIMIT 1)
        AND (
            current_store_id IS NULL
            OR current_store_id IN (SELECT public.get_user_store_ids())
        )
    );

-- ============================================================
-- 3. SECURITY DEFINER Funktionen: search_path setzen
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_user_store_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT usa.store_id
  FROM public.user_store_access usa
  JOIN public.stores s ON s.id = usa.store_id
  WHERE usa.user_id = auth.uid()
    AND s.is_active = TRUE;
$$;

CREATE OR REPLACE FUNCTION public.get_current_store_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT current_store_id
  FROM public.profiles
  WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'super_admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
