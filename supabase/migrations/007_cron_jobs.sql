-- ============================================================
-- PLU PLANNER – Migration 007: Cron-Jobs
-- Automatisierte Aufgaben mit pg_cron
-- HINWEIS: pg_cron muss im Supabase Dashboard unter
--          Database > Extensions aktiviert werden!
-- ============================================================

-- ============================================================
-- Job 1: KW-Switch (Samstag 23:59 UTC)
-- Aktive Version einfrieren, naechste Draft-Version aktivieren
-- ============================================================
SELECT cron.schedule(
  'kw-switch',
  '59 23 * * 6',  -- Samstag 23:59 UTC
  $$
    -- Aktive Version einfrieren
    UPDATE public.versions
    SET status = 'frozen',
        frozen_at = now(),
        delete_after = now() + INTERVAL '7 days'
    WHERE status = 'active';

    -- Älteste Draft-Version aktivieren (falls vorhanden)
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
-- Job 2: Auto-Delete alte Versionen (täglich 02:00 UTC)
-- Löscht eingefrorene Versionen deren delete_after abgelaufen ist
-- ============================================================
SELECT cron.schedule(
  'auto-delete-old-versions',
  '0 2 * * *',  -- Täglich um 02:00 UTC
  $$
    -- Zugehörige master_plu_items werden durch ON DELETE CASCADE gelöscht
    DELETE FROM public.versions
    WHERE status = 'frozen'
      AND delete_after IS NOT NULL
      AND delete_after <= now();
  $$
);

-- ============================================================
-- Job 3: Notification Cleanup (täglich 03:00 UTC)
-- Löscht gelesene Notifications die älter als 30 Tage sind
-- ============================================================
SELECT cron.schedule(
  'notification-cleanup',
  '0 3 * * *',  -- Täglich um 03:00 UTC
  $$
    DELETE FROM public.version_notifications
    WHERE is_read = true
      AND read_at < now() - INTERVAL '30 days';
  $$
);
