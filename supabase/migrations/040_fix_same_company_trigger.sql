-- 040_fix_same_company_trigger.sql
-- Behebt zwei Probleme in 039:
-- 1. Fehlender SET search_path = public (search-path Injection bei SECURITY DEFINER)
-- 2. Trigger greift nur bei INSERT, nicht bei UPDATE (store_id-Aenderung umgeht Pruefung)

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

  SELECT DISTINCT s.company_id INTO v_existing_company_id
  FROM public.user_store_access usa
  JOIN public.stores s ON s.id = usa.store_id
  WHERE usa.user_id = NEW.user_id
    AND usa.id != NEW.id
  LIMIT 1;

  IF v_existing_company_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF v_existing_company_id != v_new_company_id THEN
    RAISE EXCEPTION 'Benutzer kann nur Maerkten der gleichen Firma zugewiesen werden.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS enforce_same_company_user_store_access ON public.user_store_access;

CREATE TRIGGER enforce_same_company_user_store_access
  BEFORE INSERT OR UPDATE ON public.user_store_access
  FOR EACH ROW
  EXECUTE FUNCTION public.check_same_company_user_store_access();
