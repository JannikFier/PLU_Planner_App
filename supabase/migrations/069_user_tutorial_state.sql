-- ============================================================
-- PLU Planner – Migration 069: Tutorial-Fortschritt pro User/Markt
-- Modulares Onboarding (Vier); state als JSON für Module/Steps.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_tutorial_state (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  state jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, store_id)
);

CREATE INDEX IF NOT EXISTS idx_user_tutorial_state_store
  ON public.user_tutorial_state(store_id);

ALTER TABLE public.user_tutorial_state ENABLE ROW LEVEL SECURITY;

-- Eigene Zeilen lesen (Markt muss zugänglich sein)
CREATE POLICY "user_tutorial_state_select_own"
  ON public.user_tutorial_state FOR SELECT
  USING (
    user_id = auth.uid()
    AND (
      store_id IN (SELECT public.get_user_store_ids())
      OR (
        public.is_super_admin()
        AND EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.is_active = TRUE)
      )
    )
  );

CREATE POLICY "user_tutorial_state_insert_own"
  ON public.user_tutorial_state FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (
      store_id IN (SELECT public.get_user_store_ids())
      OR (
        public.is_super_admin()
        AND EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.is_active = TRUE)
      )
    )
  );

CREATE POLICY "user_tutorial_state_update_own"
  ON public.user_tutorial_state FOR UPDATE
  USING (
    user_id = auth.uid()
    AND (
      store_id IN (SELECT public.get_user_store_ids())
      OR (
        public.is_super_admin()
        AND EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.is_active = TRUE)
      )
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    AND (
      store_id IN (SELECT public.get_user_store_ids())
      OR (
        public.is_super_admin()
        AND EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.is_active = TRUE)
      )
    )
  );

CREATE POLICY "user_tutorial_state_delete_own"
  ON public.user_tutorial_state FOR DELETE
  USING (
    user_id = auth.uid()
    AND (
      store_id IN (SELECT public.get_user_store_ids())
      OR (
        public.is_super_admin()
        AND EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.is_active = TRUE)
      )
    )
  );

CREATE OR REPLACE FUNCTION public.set_user_tutorial_state_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_tutorial_state_updated_at ON public.user_tutorial_state;
CREATE TRIGGER trg_user_tutorial_state_updated_at
  BEFORE UPDATE ON public.user_tutorial_state
  FOR EACH ROW
  EXECUTE FUNCTION public.set_user_tutorial_state_updated_at();
