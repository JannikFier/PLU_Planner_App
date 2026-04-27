-- Markt (User/Admin): „Transfer-Woche“ für die aktive Backshop-Version starten
-- (Backshop-Versionszeilen sind sonst nur für Super-Admin schreibbar.)

CREATE OR REPLACE FUNCTION public.set_backshop_transfer_week_started()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  vid uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Nicht angemeldet';
  END IF;

  IF (SELECT role FROM public.profiles WHERE id = auth.uid()) NOT IN ('admin', 'user') THEN
    RAISE EXCEPTION 'Nur Markt-Benutzer';
  END IF;

  IF public.get_current_store_id() IS NULL THEN
    RAISE EXCEPTION 'Kein Markt gewaehlt';
  END IF;

  SELECT bv.id INTO vid
  FROM public.backshop_versions bv
  WHERE bv.status = 'active'
  LIMIT 1;

  IF vid IS NULL THEN
    RAISE EXCEPTION 'Keine aktive Backshop-Version';
  END IF;

  UPDATE public.backshop_versions
  SET transfer_week_started_at = now()
  WHERE id = vid;
END;
$$;

REVOKE ALL ON FUNCTION public.set_backshop_transfer_week_started() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_backshop_transfer_week_started() TO authenticated;
