-- Row-basierte Publish-Sperre: ersetzt Session-pg_advisory_lock (042) fuer gepoolte PostgREST-Verbindungen.
-- Vorher: acquire/release konnten auf unterschiedlichen DB-Sessions landen → Unlock wirkte nicht → naechster acquire schlug fehl.

CREATE TABLE IF NOT EXISTS public.publish_connection_locks (
  lock_key bigint PRIMARY KEY,
  locked_until timestamptz NOT NULL
);

COMMENT ON TABLE public.publish_connection_locks IS 'Globale Publish-Mutex pro lock_key (1=Obst, 2=Backshop); locked_until in der Zukunft = gesperrt.';

INSERT INTO public.publish_connection_locks (lock_key, locked_until)
VALUES (1, to_timestamp(0)), (2, to_timestamp(0))
ON CONFLICT (lock_key) DO NOTHING;

ALTER TABLE public.publish_connection_locks ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.publish_connection_locks FROM PUBLIC;
REVOKE ALL ON TABLE public.publish_connection_locks FROM anon;
REVOKE ALL ON TABLE public.publish_connection_locks FROM authenticated;

CREATE OR REPLACE FUNCTION public.acquire_publish_lock(lock_key bigint DEFAULT 1)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_until timestamptz := clock_timestamp() + interval '10 minutes';
  updated int;
BEGIN
  UPDATE public.publish_connection_locks
  SET locked_until = v_until
  WHERE publish_connection_locks.lock_key = acquire_publish_lock.lock_key
    AND locked_until < clock_timestamp();
  GET DIAGNOSTICS updated = ROW_COUNT;
  RETURN updated > 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_publish_lock(lock_key bigint DEFAULT 1)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.publish_connection_locks
  SET locked_until = to_timestamp(0)
  WHERE publish_connection_locks.lock_key = release_publish_lock.lock_key;
END;
$$;

GRANT EXECUTE ON FUNCTION public.acquire_publish_lock(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_publish_lock(bigint) TO authenticated;
