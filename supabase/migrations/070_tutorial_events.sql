-- ============================================================
-- PLU Planner – Migration 070: Tutorial-Events (Analytics)
-- Erfasst Ereignisse wie start | step | skip | dismiss | complete | error
-- und anchor-missing. Insert-only, kein Update/Delete durch Clients.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.tutorial_events (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  event text NOT NULL,
  module text,
  step_index integer,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tutorial_events_user
  ON public.tutorial_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tutorial_events_store
  ON public.tutorial_events(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tutorial_events_event
  ON public.tutorial_events(event, created_at DESC);

ALTER TABLE public.tutorial_events ENABLE ROW LEVEL SECURITY;

-- Insert: jeder eingeloggte Nutzer darf nur für sich selbst Events schreiben
CREATE POLICY "tutorial_events_insert_own"
  ON public.tutorial_events FOR INSERT
  WITH CHECK (
    user_id IS NULL
    OR user_id = auth.uid()
  );

-- Select: eigene Events lesen; Super-Admin darf alle sehen (für Debug).
CREATE POLICY "tutorial_events_select_own"
  ON public.tutorial_events FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_super_admin()
  );

-- Kein Update/Delete durch Clients (Events sind Append-only).
