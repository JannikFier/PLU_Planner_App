-- 035_cleanup_orphaned_users_no_store.sql
-- Entfernt User die in profiles/auth.users existieren,
-- aber KEINE user_store_access-Eintraege mehr haben (z.B. nur "vom Markt entfernt").
-- Super-Admins werden NICHT geloescht.

-- 1. Profile loeschen wo kein user_store_access existiert (ausser super_admin)
DELETE FROM public.profiles p
WHERE p.role <> 'super_admin'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_store_access usa
    WHERE usa.user_id = p.id
  );

-- 2. Auth-User hart loeschen wo kein Profil mehr existiert
--    (betrifft User die gerade in Schritt 1 geloescht wurden, plus vorherige Waisen)
DELETE FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = u.id
)
AND u.id NOT IN (
  SELECT id FROM public.profiles WHERE role = 'super_admin'
);
