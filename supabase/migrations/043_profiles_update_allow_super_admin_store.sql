-- 043_profiles_update_allow_super_admin_store.sql
-- Behebt 500 beim Wechsel zu einem Markt (z. B. Super-Admin klickt auf Firma → Markt):
-- Super-Admins haben oft keine user_store_access-Eintraege; get_user_store_ids() ist dann leer.
-- Hilfsfunktion umgeht mehrfaches Lesen aus profiles in der Policy (stabiler).

CREATE OR REPLACE FUNCTION public.profiles_update_current_store_allowed(
  p_new_current_store_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  OR p_new_current_store_id IS NULL
  OR p_new_current_store_id IN (SELECT public.get_user_store_ids());
$$;

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (
        id = auth.uid()
        AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid() LIMIT 1)
        AND public.profiles_update_current_store_allowed(current_store_id)
    );
