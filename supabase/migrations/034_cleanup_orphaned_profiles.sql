-- 034_cleanup_orphaned_profiles.sql
-- Entfernt verwaiste Profile-Eintraege und soft-geloeschte Auth-User.
-- Ursache: delete-user Edge Function hat frueher nur auth.admin.deleteUser aufgerufen,
-- was bei Soft-Delete das CASCADE nicht ausloeste.

-- 1. Verwaiste user_store_access loeschen (Profile existiert nicht mehr)
DELETE FROM public.user_store_access usa
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = usa.user_id);

-- 2. Verwaiste profiles loeschen (Auth-User existiert nicht mehr oder ist soft-deleted)
DELETE FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users u
  WHERE u.id = p.id AND u.deleted_at IS NULL
);

-- 3. Soft-geloeschte Auth-User hart loeschen (damit E-Mail/Personalnummer frei wird)
-- ACHTUNG: Das entfernt alle soft-geloeschten User endgueltig!
DELETE FROM auth.users WHERE deleted_at IS NOT NULL;
