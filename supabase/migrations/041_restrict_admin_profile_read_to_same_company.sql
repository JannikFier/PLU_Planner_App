-- 041_restrict_admin_profile_read_to_same_company.sql
-- Admins duerfen nur Profile von Usern derselben Firma sehen.
-- Super-Admins sehen weiterhin alle Profile.

DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;

CREATE POLICY "Admins can read profiles of same company"
  ON public.profiles FOR SELECT
  USING (
    id = auth.uid()
    OR public.is_super_admin()
    OR (
      public.is_admin()
      AND EXISTS (
        SELECT 1
        FROM public.user_store_access usa_self
        JOIN public.stores s_self ON s_self.id = usa_self.store_id
        JOIN public.stores s_other ON s_other.company_id = s_self.company_id
        JOIN public.user_store_access usa_other ON usa_other.store_id = s_other.id
        WHERE usa_self.user_id = auth.uid()
          AND usa_other.user_id = profiles.id
      )
    )
  );
