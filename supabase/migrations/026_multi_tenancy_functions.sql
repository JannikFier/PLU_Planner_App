-- 026_multi_tenancy_functions.sql
-- Hilfsfunktionen fuer Multi-Tenancy (Stores/Firmen)
-- Siehe: ERWEITERUNG_MULTI_TENANCY_UND_TESTMODUS.md – Abschnitt 1.19 Datenbank-Aenderungen

-- Liefert alle Store-IDs auf die der aktuelle User Zugriff hat.
CREATE OR REPLACE FUNCTION public.get_user_store_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT usa.store_id
  FROM public.user_store_access usa
  JOIN public.stores s ON s.id = usa.store_id
  WHERE usa.user_id = auth.uid()
    AND s.is_active = TRUE;
$$;

-- Liefert den aktuell ausgewaehlten Store des Users.
CREATE OR REPLACE FUNCTION public.get_current_store_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT p.current_store_id
  FROM public.profiles p
  WHERE p.id = auth.uid();
$$;

-- Liefert die Company-ID zu einer Store-ID.
CREATE OR REPLACE FUNCTION public.get_store_company_id(p_store_id UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT company_id
  FROM public.stores
  WHERE id = p_store_id;
$$;

-- Liefert die Subdomain des Heimatmarkts eines Users.
CREATE OR REPLACE FUNCTION public.get_home_store_subdomain(p_user_id UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT s.subdomain
  FROM public.user_store_access usa
  JOIN public.stores s ON s.id = usa.store_id
  WHERE usa.user_id = p_user_id
    AND usa.is_home_store = TRUE
  LIMIT 1;
$$;

