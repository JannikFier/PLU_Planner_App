-- ============================================================
-- PLU PLANNER – Migration 019: Retention „max. 3 Versionen behalten“
-- Ersetzt die 7-Tage-Auto-Löschung durch: Es werden nur die 3 neuesten
-- Versionen (nach Jahr/KW) behalten; ältere werden gelöscht.
-- KW-Switch setzt beim Einfrieren kein delete_after mehr.
-- ============================================================

-- ============================================================
-- 1. Obst/Gemüse: KW-Switch ohne delete_after
-- ============================================================
SELECT cron.unschedule('kw-switch');

SELECT cron.schedule(
  'kw-switch',
  '59 23 * * 6',
  $$
    UPDATE public.versions
    SET status = 'frozen',
        frozen_at = now(),
        delete_after = NULL
    WHERE status = 'active';

    UPDATE public.versions
    SET status = 'active',
        published_at = now()
    WHERE id = (
      SELECT id FROM public.versions
      WHERE status = 'draft'
      ORDER BY created_at ASC
      LIMIT 1
    );
  $$
);

-- ============================================================
-- 2. Obst/Gemüse: Auto-Delete nur älteste Versionen (behalte max. 3)
-- ============================================================
SELECT cron.unschedule('auto-delete-old-versions');

SELECT cron.schedule(
  'auto-delete-old-versions',
  '0 2 * * *',
  $$
    DELETE FROM public.versions
    WHERE id IN (
      SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (ORDER BY jahr DESC, kw_nummer DESC) AS rn
        FROM public.versions
      ) sub
      WHERE rn > 3
    );
  $$
);

-- ============================================================
-- 3. Backshop: KW-Switch ohne delete_after
-- ============================================================
SELECT cron.unschedule('backshop-kw-switch');

SELECT cron.schedule(
  'backshop-kw-switch',
  '59 23 * * 6',
  $$
    UPDATE public.backshop_versions
    SET status = 'frozen',
        frozen_at = now(),
        delete_after = NULL
    WHERE status = 'active';

    UPDATE public.backshop_versions
    SET status = 'active',
        published_at = now()
    WHERE id = (
      SELECT id FROM public.backshop_versions
      WHERE status = 'draft'
      ORDER BY created_at ASC
      LIMIT 1
    );
  $$
);

-- ============================================================
-- 4. Backshop: Auto-Delete nur älteste Versionen (behalte max. 3)
-- ============================================================
SELECT cron.unschedule('backshop-auto-delete-old-versions');

SELECT cron.schedule(
  'backshop-auto-delete-old-versions',
  '0 2 * * *',
  $$
    DELETE FROM public.backshop_versions
    WHERE id IN (
      SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (ORDER BY jahr DESC, kw_nummer DESC) AS rn
        FROM public.backshop_versions
      ) sub
      WHERE rn > 3
    );
  $$
);
