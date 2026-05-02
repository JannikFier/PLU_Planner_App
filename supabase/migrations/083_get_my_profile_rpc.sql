-- 083_get_my_profile_rpc.sql
-- Eigenes Profil nach Login zuverlaessig laden: REST-SELECT unter RLS kann bei Timing/Cookies
-- kurz 0 Zeilen liefern. SECURITY DEFINER liest nur die Zeile auth.uid() ohne RLS-Filter.

CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT to_jsonb(p.*)
  FROM public.profiles p
  WHERE p.id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.get_my_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;
