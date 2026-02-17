-- ============================================================
-- PLU PLANNER – Migration 008: Rollen-Eskalation verhindern
-- User dürfen das eigene Profil updaten, aber NICHT die Rolle ändern.
-- ============================================================

-- Alte Policy entfernen (erlaubte beliebige Spalten-Updates inkl. role)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Neue Policy: Eigenes Profil updaten, Rolle muss unverändert bleiben
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (
        id = auth.uid()
        AND role = (SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1)
    );
