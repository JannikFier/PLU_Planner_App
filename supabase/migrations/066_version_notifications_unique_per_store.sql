-- Benachrichtigungen sind pro Markt (store_id); die App filtert/insertet mit store_id.
-- Historisch: UNIQUE(user_id, version_id) verhinderte einen zweiten Eintrag nach Marktwechsel → 409.
-- Neu: Eindeutigkeit über (user_id, version_id, store_id).

ALTER TABLE public.version_notifications
  DROP CONSTRAINT IF EXISTS version_notifications_user_id_version_id_key;

ALTER TABLE public.version_notifications
  ADD CONSTRAINT version_notifications_user_version_store_key
  UNIQUE (user_id, version_id, store_id);

ALTER TABLE public.backshop_version_notifications
  DROP CONSTRAINT IF EXISTS backshop_version_notifications_user_id_version_id_key;

ALTER TABLE public.backshop_version_notifications
  ADD CONSTRAINT backshop_version_notifications_user_version_store_key
  UNIQUE (user_id, version_id, store_id);
