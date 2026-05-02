-- Generischer Audit-Log für privilegierte Edge-Function-Aktionen.
-- Ergänzt die spezifische role_change_audit-Tabelle (Migration 085) — beide bleiben parallel:
-- role_change_audit für detaillierte Rollenwechsel-Forensik, admin_action_audit für jeden
-- Schreibvorgang (User anlegen/löschen, Passwort reset, Kiosk-Register CRUD, Marktzugriff ändern).
--
-- Schreibt: Edge Functions via Service-Role-Key (RLS für INSERT umgangen).
-- Liest: nur Super-Admin.

CREATE TABLE IF NOT EXISTS public.admin_action_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_role TEXT NOT NULL,
  actor_company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  target_company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  target_resource_id UUID,
  details JSONB,
  cross_company BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_action_audit_actor
  ON public.admin_action_audit(actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_action_audit_target
  ON public.admin_action_audit(target_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_action_audit_action
  ON public.admin_action_audit(action_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_action_audit_cross_company
  ON public.admin_action_audit(created_at DESC) WHERE cross_company = true;

ALTER TABLE public.admin_action_audit ENABLE ROW LEVEL SECURITY;

-- Lesen: nur Super-Admin. INSERT läuft über Service-Role aus Edge Functions (umgeht RLS).
CREATE POLICY "admin_action_audit_select_super_admin"
  ON public.admin_action_audit FOR SELECT
  USING (public.is_super_admin());
