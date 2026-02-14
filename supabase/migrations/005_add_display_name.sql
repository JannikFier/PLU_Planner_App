-- ============================================================
-- PLU PLANNER – Migration: display_name Spalte
-- Dieses Script im Supabase SQL Editor ausführen.
-- ============================================================

ALTER TABLE public.master_plu_items
  ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Initialwert: system_name kopieren für bestehende Einträge
UPDATE public.master_plu_items
SET display_name = system_name
WHERE display_name IS NULL;
