-- ============================================================
-- PLU Planner – Migration 014: Backshop Layout – Seite pro Warengruppe
-- Option: Jede Warengruppe im PDF auf eigener Seite beginnen.
-- ============================================================

ALTER TABLE public.backshop_layout_settings
  ADD COLUMN IF NOT EXISTS page_break_per_block BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.backshop_layout_settings.page_break_per_block IS
  'Bei Nach Warengruppen: jede Warengruppe im PDF auf neuer Seite (true) oder durchlaufend (false).';
