-- 021_multi_tenancy_core_tables.sql
-- Kern-Tabellen für Multi-Tenancy (Firmen, Märkte, Markt-Zugriffe, Listen-Sichtbarkeit)
-- Siehe Spezifikation: ERWEITERUNG_MULTI_TENANCY_UND_TESTMODUS.md (Feature 1: Multi-Tenancy)

-- Firmen
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Märkte
CREATE TABLE IF NOT EXISTS public.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subdomain TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Subdomain-Validierung:
-- - nur Kleinbuchstaben, Ziffern, Bindestriche
-- - muss mit einem Buchstaben beginnen
-- - reservierte Subdomains (admin, app, api, www, mail) sind nicht erlaubt
ALTER TABLE public.stores
  ADD CONSTRAINT stores_subdomain_format_chk
  CHECK (
    subdomain ~ '^[a-z][a-z0-9-]*$'
  );

ALTER TABLE public.stores
  ADD CONSTRAINT stores_subdomain_reserved_chk
  CHECK (
    lower(subdomain) NOT IN ('admin', 'app', 'api', 'www', 'mail')
  );

CREATE INDEX IF NOT EXISTS idx_stores_subdomain
  ON public.stores (subdomain);

CREATE INDEX IF NOT EXISTS idx_stores_company_id
  ON public.stores (company_id);

-- Welcher User hat Zugriff auf welchen Markt
CREATE TABLE IF NOT EXISTS public.user_store_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  is_home_store BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, store_id)
);

-- Genau ein Heimatmarkt pro User (Partial Unique Index)
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_home_store_per_user
  ON public.user_store_access (user_id)
  WHERE is_home_store = TRUE;

CREATE INDEX IF NOT EXISTS idx_user_store_access_user_id_store_id
  ON public.user_store_access (user_id, store_id);

-- Sichtbarkeit von Listen pro Markt
CREATE TABLE IF NOT EXISTS public.store_list_visibility (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  list_type TEXT NOT NULL,
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (store_id, list_type)
);

