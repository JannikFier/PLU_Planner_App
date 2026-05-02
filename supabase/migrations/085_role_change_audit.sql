-- Audit-Log für Rollenänderungen (insbesondere Super-Admin Cross-Company Edits).
-- Schreibt update-user-role Edge Function via Service-Role-Key (RLS für Insert irrelevant).
-- Lesen: nur Super-Admin.

CREATE TABLE IF NOT EXISTS public.role_change_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_role TEXT NOT NULL,
  actor_company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  target_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  old_role TEXT NOT NULL,
  new_role TEXT NOT NULL,
  cross_company BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_role_change_audit_actor
  ON public.role_change_audit(actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_role_change_audit_target
  ON public.role_change_audit(target_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_role_change_audit_cross_company
  ON public.role_change_audit(created_at DESC) WHERE cross_company = true;

ALTER TABLE public.role_change_audit ENABLE ROW LEVEL SECURITY;

-- Nur Super-Admin liest. Insert läuft über Service-Role aus Edge Function (umgeht RLS).
CREATE POLICY "role_change_audit_select_super_admin"
  ON public.role_change_audit FOR SELECT
  USING (public.is_super_admin());
