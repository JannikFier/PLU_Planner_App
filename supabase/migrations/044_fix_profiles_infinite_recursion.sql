-- 044_fix_profiles_infinite_recursion.sql
-- BEHEBT: "infinite recursion detected in policy for relation 'profiles'" (42P17)
--
-- ROOT CAUSE: Migration 041 fuehrte eine profiles-SELECT-Policy ein, die stores JOINt.
-- Die stores-RLS ruft is_super_admin() auf, das wiederum profiles liest.
-- Migration 043 hat eine UPDATE-Policy mit einem selbstreferenzierenden Subquery
-- (SELECT p.role FROM profiles ...) angelegt. Zusammen ergibt sich:
--
--   profiles UPDATE → WITH CHECK → SELECT profiles → profiles SELECT policy
--   → JOIN stores → stores RLS → is_super_admin() → profiles → REKURSION
--
-- FIX: SECURITY DEFINER Hilfsfunktion, die die Same-Company-Pruefung kapselt.
-- SECURITY DEFINER umgeht RLS → kein zirkulaerer Zugriff mehr.

-- 1. Hilfsfunktion: Prueft ob target_user_id zur selben Firma gehoert wie auth.uid()
CREATE OR REPLACE FUNCTION public.is_same_company_user(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_store_access usa_self
    JOIN public.stores s_self ON s_self.id = usa_self.store_id
    JOIN public.stores s_other ON s_other.company_id = s_self.company_id
    JOIN public.user_store_access usa_other ON usa_other.store_id = s_other.id
    WHERE usa_self.user_id = auth.uid()
      AND usa_other.user_id = target_user_id
  );
$$;

-- 2. Hilfsfunktion: Liest die eigene Rolle ohne RLS (verhindert Selbstreferenz im UPDATE)
CREATE OR REPLACE FUNCTION public.get_own_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- 3. profiles SELECT-Policy neu erstellen (ersetzt direkten stores-JOIN durch Funktion)
DROP POLICY IF EXISTS "Admins can read profiles of same company" ON public.profiles;

CREATE POLICY "Admins can read profiles of same company"
  ON public.profiles FOR SELECT
  USING (
    id = auth.uid()
    OR public.is_super_admin()
    OR (
      public.is_admin()
      AND public.is_same_company_user(id)
    )
  );

-- 4. profiles UPDATE-Policy neu erstellen (ersetzt Selbstreferenz durch get_own_role())
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (
        id = auth.uid()
        AND role = public.get_own_role()
        AND public.profiles_update_current_store_allowed(current_store_id)
    );
