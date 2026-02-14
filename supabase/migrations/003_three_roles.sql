-- ============================================================
-- PLU PLANNER – Migration 003: Drei-Rollen-System
-- Dieses Script im Supabase SQL Editor ausführen
-- NACHDEM 001 und 002 bereits gelaufen sind.
-- ============================================================

-- ============================================================
-- 1. PROFILES: Rolle erweitern auf drei Stufen
-- ============================================================

-- Alten CHECK Constraint entfernen und neuen setzen
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
    CHECK (role IN ('super_admin', 'admin', 'user'));

-- Neue Spalte: Einmalpasswort-Flag (User muss Passwort ändern)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS 
    must_change_password BOOLEAN NOT NULL DEFAULT false;

-- Neue Spalte: Wer hat diesen User angelegt?
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS 
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- ============================================================
-- 2. DEINEN BESTEHENDEN USER ZUM SUPER-ADMIN MACHEN
-- ============================================================
-- WICHTIG: Passe die Email an deine eigene Email an!
-- UPDATE public.profiles SET role = 'super_admin' WHERE email = 'deine@email.de';

-- ============================================================
-- 3. HELPER FUNCTIONS AKTUALISIEREN
-- ============================================================

-- is_admin() gibt true für super_admin UND admin zurück
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- NEUE Funktion: is_super_admin() – nur für den Inhaber
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'super_admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger aktualisieren: Neue User bekommen 'user' als Standard
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, personalnummer, display_name, role, must_change_password)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'personalnummer', ''),
        COALESCE(NEW.raw_user_meta_data->>'display_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
        COALESCE((NEW.raw_user_meta_data->>'must_change_password')::BOOLEAN, false)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 4. RLS POLICIES AKTUALISIEREN
-- Nur super_admin darf Upload/Layout/Versionen/Blöcke/Regeln
-- admin + super_admin dürfen User verwalten
-- ============================================================

-- === VERSIONS: Nur super_admin darf schreiben ===
DROP POLICY IF EXISTS "Only admins can insert versions" ON public.versions;
DROP POLICY IF EXISTS "Only admins can update versions" ON public.versions;
DROP POLICY IF EXISTS "Only admins can delete versions" ON public.versions;

CREATE POLICY "Only super_admins can insert versions"
    ON public.versions FOR INSERT
    WITH CHECK (public.is_super_admin());

CREATE POLICY "Only super_admins can update versions"
    ON public.versions FOR UPDATE
    USING (public.is_super_admin());

CREATE POLICY "Only super_admins can delete versions"
    ON public.versions FOR DELETE
    USING (public.is_super_admin());

-- === MASTER_PLU_ITEMS: Nur super_admin darf schreiben ===
DROP POLICY IF EXISTS "Only admins can insert master items" ON public.master_plu_items;
DROP POLICY IF EXISTS "Only admins can update master items" ON public.master_plu_items;
DROP POLICY IF EXISTS "Only admins can delete master items" ON public.master_plu_items;

CREATE POLICY "Only super_admins can insert master items"
    ON public.master_plu_items FOR INSERT
    WITH CHECK (public.is_super_admin());

CREATE POLICY "Only super_admins can update master items"
    ON public.master_plu_items FOR UPDATE
    USING (public.is_super_admin());

CREATE POLICY "Only super_admins can delete master items"
    ON public.master_plu_items FOR DELETE
    USING (public.is_super_admin());

-- === BLOCKS: Nur super_admin darf schreiben ===
DROP POLICY IF EXISTS "Only admins can insert blocks" ON public.blocks;
DROP POLICY IF EXISTS "Only admins can update blocks" ON public.blocks;
DROP POLICY IF EXISTS "Only admins can delete blocks" ON public.blocks;
DROP POLICY IF EXISTS "Only admins can modify blocks" ON public.blocks;

CREATE POLICY "Only super_admins can insert blocks"
    ON public.blocks FOR INSERT
    WITH CHECK (public.is_super_admin());

CREATE POLICY "Only super_admins can update blocks"
    ON public.blocks FOR UPDATE
    USING (public.is_super_admin());

CREATE POLICY "Only super_admins can delete blocks"
    ON public.blocks FOR DELETE
    USING (public.is_super_admin());

-- === BLOCK_RULES: Nur super_admin darf schreiben ===
DROP POLICY IF EXISTS "Only admins can insert block rules" ON public.block_rules;
DROP POLICY IF EXISTS "Only admins can update block rules" ON public.block_rules;
DROP POLICY IF EXISTS "Only admins can delete block rules" ON public.block_rules;
DROP POLICY IF EXISTS "Only admins can modify block rules" ON public.block_rules;

CREATE POLICY "Only super_admins can insert block rules"
    ON public.block_rules FOR INSERT
    WITH CHECK (public.is_super_admin());

CREATE POLICY "Only super_admins can update block rules"
    ON public.block_rules FOR UPDATE
    USING (public.is_super_admin());

CREATE POLICY "Only super_admins can delete block rules"
    ON public.block_rules FOR DELETE
    USING (public.is_super_admin());

-- === LAYOUT_SETTINGS: Nur super_admin darf schreiben ===
DROP POLICY IF EXISTS "Only admins can update layout settings" ON public.layout_settings;

CREATE POLICY "Only super_admins can update layout settings"
    ON public.layout_settings FOR UPDATE
    USING (public.is_super_admin());

-- === BEZEICHNUNGSREGELN: Nur super_admin darf schreiben ===
DROP POLICY IF EXISTS "Only admins can insert bezeichnungsregeln" ON public.bezeichnungsregeln;
DROP POLICY IF EXISTS "Only admins can update bezeichnungsregeln" ON public.bezeichnungsregeln;
DROP POLICY IF EXISTS "Only admins can delete bezeichnungsregeln" ON public.bezeichnungsregeln;
DROP POLICY IF EXISTS "Only admins can modify bezeichnungsregeln" ON public.bezeichnungsregeln;

CREATE POLICY "Only super_admins can insert bezeichnungsregeln"
    ON public.bezeichnungsregeln FOR INSERT
    WITH CHECK (public.is_super_admin());

CREATE POLICY "Only super_admins can update bezeichnungsregeln"
    ON public.bezeichnungsregeln FOR UPDATE
    USING (public.is_super_admin());

CREATE POLICY "Only super_admins can delete bezeichnungsregeln"
    ON public.bezeichnungsregeln FOR DELETE
    USING (public.is_super_admin());

-- === NOTIFICATIONS: admin + super_admin dürfen einfügen ===
-- (bleibt bei is_admin(), das jetzt super_admin + admin abdeckt)
-- Keine Änderung nötig

-- === PROFILES: admin + super_admin dürfen alle Profile lesen ===
-- (bleibt bei is_admin(), das jetzt super_admin + admin abdeckt)
-- Keine Änderung nötig
