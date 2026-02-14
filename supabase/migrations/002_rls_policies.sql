-- ============================================================
-- PLU PLANNER – Row Level Security (RLS) Policies
-- NACH dem Schema-Script ausführen!
-- ============================================================

-- Alle Tabellen: RLS aktivieren
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_plu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.block_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.layout_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bezeichnungsregeln ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications_queue ENABLE ROW LEVEL SECURITY;

-- ============ PROFILES ============
CREATE POLICY "Users can read own profile"
    ON public.profiles FOR SELECT
    USING (id = auth.uid());

CREATE POLICY "Admins can read all profiles"
    ON public.profiles FOR SELECT
    USING (public.is_admin());

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- ============ VERSIONS ============
CREATE POLICY "Everyone can read versions"
    ON public.versions FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can insert versions"
    ON public.versions FOR INSERT
    WITH CHECK (public.is_admin());

CREATE POLICY "Only admins can update versions"
    ON public.versions FOR UPDATE
    USING (public.is_admin());

CREATE POLICY "Only admins can delete versions"
    ON public.versions FOR DELETE
    USING (public.is_admin());

-- ============ MASTER_PLU_ITEMS ============
CREATE POLICY "Everyone can read master items"
    ON public.master_plu_items FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can insert master items"
    ON public.master_plu_items FOR INSERT
    WITH CHECK (public.is_admin());

CREATE POLICY "Only admins can update master items"
    ON public.master_plu_items FOR UPDATE
    USING (public.is_admin());

CREATE POLICY "Only admins can delete master items"
    ON public.master_plu_items FOR DELETE
    USING (public.is_admin());

-- ============ USER_OVERRIDES ============
CREATE POLICY "Users can read own overrides"
    ON public.user_overrides FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own overrides"
    ON public.user_overrides FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own overrides"
    ON public.user_overrides FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete own overrides"
    ON public.user_overrides FOR DELETE
    USING (user_id = auth.uid());

CREATE POLICY "Admins can read all overrides"
    ON public.user_overrides FOR SELECT
    USING (public.is_admin());

-- ============ BLOCKS ============
CREATE POLICY "Everyone can read blocks"
    ON public.blocks FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can insert blocks"
    ON public.blocks FOR INSERT
    WITH CHECK (public.is_admin());

CREATE POLICY "Only admins can update blocks"
    ON public.blocks FOR UPDATE
    USING (public.is_admin());

CREATE POLICY "Only admins can delete blocks"
    ON public.blocks FOR DELETE
    USING (public.is_admin());

-- ============ BLOCK_RULES ============
CREATE POLICY "Everyone can read block rules"
    ON public.block_rules FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can insert block rules"
    ON public.block_rules FOR INSERT
    WITH CHECK (public.is_admin());

CREATE POLICY "Only admins can update block rules"
    ON public.block_rules FOR UPDATE
    USING (public.is_admin());

CREATE POLICY "Only admins can delete block rules"
    ON public.block_rules FOR DELETE
    USING (public.is_admin());

-- ============ LAYOUT_SETTINGS ============
CREATE POLICY "Everyone can read layout settings"
    ON public.layout_settings FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can update layout settings"
    ON public.layout_settings FOR UPDATE
    USING (public.is_admin());

-- ============ BEZEICHNUNGSREGELN ============
CREATE POLICY "Everyone can read bezeichnungsregeln"
    ON public.bezeichnungsregeln FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can insert bezeichnungsregeln"
    ON public.bezeichnungsregeln FOR INSERT
    WITH CHECK (public.is_admin());

CREATE POLICY "Only admins can update bezeichnungsregeln"
    ON public.bezeichnungsregeln FOR UPDATE
    USING (public.is_admin());

CREATE POLICY "Only admins can delete bezeichnungsregeln"
    ON public.bezeichnungsregeln FOR DELETE
    USING (public.is_admin());

-- ============ NOTIFICATIONS_QUEUE ============
CREATE POLICY "Users can read own notifications"
    ON public.notifications_queue FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
    ON public.notifications_queue FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Admins can insert notifications"
    ON public.notifications_queue FOR INSERT
    WITH CHECK (public.is_admin());

CREATE POLICY "Admins can read all notifications"
    ON public.notifications_queue FOR SELECT
    USING (public.is_admin());
