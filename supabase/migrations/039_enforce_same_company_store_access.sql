-- 039_enforce_same_company_store_access.sql
-- Verhindert firmenuebergreifende User-Store-Zuweisungen.
-- Ein User darf nur Maerkten der gleichen Firma zugewiesen werden.

CREATE OR REPLACE FUNCTION public.check_same_company_user_store_access()
RETURNS TRIGGER AS $$
DECLARE
  v_new_company_id UUID;
  v_existing_company_id UUID;
BEGIN
  SELECT company_id INTO v_new_company_id
  FROM public.stores WHERE id = NEW.store_id;

  IF v_new_company_id IS NULL THEN
    RAISE EXCEPTION 'Store nicht gefunden.';
  END IF;

  -- Pruefe ob der User bereits einem Store zugewiesen ist
  SELECT DISTINCT s.company_id INTO v_existing_company_id
  FROM public.user_store_access usa
  JOIN public.stores s ON s.id = usa.store_id
  WHERE usa.user_id = NEW.user_id
  LIMIT 1;

  -- Erste Zuweisung: immer erlaubt
  IF v_existing_company_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Bestehende Zuweisung: nur gleiche Firma
  IF v_existing_company_id != v_new_company_id THEN
    RAISE EXCEPTION 'Benutzer kann nur Maerkten der gleichen Firma zugewiesen werden.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER enforce_same_company_user_store_access
  BEFORE INSERT ON public.user_store_access
  FOR EACH ROW
  EXECUTE FUNCTION public.check_same_company_user_store_access();
