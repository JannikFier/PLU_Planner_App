-- ============================================================
-- PLU PLANNER – Migration 013: Backshop-Cron-Jobs
-- Automatisierte Aufgaben für Backshop (KW-Switch, Auto-Delete, Notification-Cleanup)
-- HINWEIS: pg_cron muss im Supabase Dashboard unter
--          Database > Extensions aktiviert sein (wie bei Migration 007).
-- ============================================================

-- ============================================================
-- Job 1: Backshop KW-Switch (Samstag 23:59 UTC)
-- Aktive Backshop-Version einfrieren, älteste Draft-Version aktivieren
-- ============================================================
SELECT cron.schedule(
  'backshop-kw-switch',
  '59 23 * * 6',  -- Samstag 23:59 UTC
  $$
    UPDATE public.backshop_versions
    SET status = 'frozen',
        frozen_at = now(),
        delete_after = now() + INTERVAL '7 days'
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
-- Job 2: Backshop Auto-Delete alte Versionen (täglich 02:00 UTC)
-- ============================================================
SELECT cron.schedule(
  'backshop-auto-delete-old-versions',
  '0 2 * * *',
  $$
    DELETE FROM public.backshop_versions
    WHERE status = 'frozen'
      AND delete_after IS NOT NULL
      AND delete_after <= now();
  $$
);

-- ============================================================
-- Job 3: Backshop Notification Cleanup (täglich 03:00 UTC)
-- Gelesene Backshop-Benachrichtigungen älter als 30 Tage löschen
-- ============================================================
SELECT cron.schedule(
  'backshop-notification-cleanup',
  '0 3 * * *',
  $$
    DELETE FROM public.backshop_version_notifications
    WHERE is_read = true
      AND read_at IS NOT NULL
      AND read_at < now() - INTERVAL '30 days';
  $$
);
