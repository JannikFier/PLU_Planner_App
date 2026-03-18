-- 048_anon_store_company_subdomain_branding.sql
-- BEHEBT: 406 Not Acceptable bei stores/companies auf der Login-Seite (Subdomain-Branding)
--
-- Ursache: Bei Subdomain (z.B. angerbogen.domain.de oder ?store=angerbogen) laedt
-- StoreContext.resolveBySubdomain() Store und Company – ohne gültige Session.
-- RLS blockierte anonyme Zugriffe.
--
-- Loesung: Anonymes Lesen erlauben fuer:
-- - stores: aktive Stores mit Subdomain (Branding auf Login-Seite)
-- - companies: Firmen, die zu solchen Stores gehoeren

CREATE POLICY "anon_read_stores_by_subdomain_for_branding"
  ON public.stores FOR SELECT
  USING (
    auth.role() = 'anon'
    AND subdomain IS NOT NULL
    AND subdomain != ''
    AND is_active = TRUE
  );

CREATE POLICY "anon_read_companies_for_subdomain_stores"
  ON public.companies FOR SELECT
  USING (
    auth.role() = 'anon'
    AND id IN (
      SELECT company_id
      FROM public.stores
      WHERE subdomain IS NOT NULL
        AND subdomain != ''
        AND is_active = TRUE
    )
  );
