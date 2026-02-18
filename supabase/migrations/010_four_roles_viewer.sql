-- ============================================================
-- PLU Planner – Migration 010: Vier Rollen (Viewer hinzufügen)
-- Viewer: Nur PLU-Liste ansehen + PDF. Keine Toolbar (Eigene Produkte, Ausblenden, Umbenennen).
-- ============================================================

-- Profile-Rolle um 'viewer' erweitern
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('super_admin', 'admin', 'user', 'viewer'));

-- is_admin() unverändert: nur super_admin und admin (Viewer zählt nicht als Admin)
-- Bereits in 003 definiert; keine Änderung nötig.

-- Trigger handle_new_user: Standard-Rolle 'user' bleibt; role aus meta kann 'viewer' sein
-- Keine Änderung nötig (COALESCE nimmt bereits meta role oder 'user').
