-- 042_publish_advisory_lock.sql
-- Advisory Lock RPCs fuer Publish-Operationen.
-- Verhindert, dass zwei gleichzeitige Uploads die aktive Version korrumpieren.

CREATE OR REPLACE FUNCTION public.acquire_publish_lock(lock_key BIGINT DEFAULT 1)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN pg_try_advisory_lock(lock_key);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.release_publish_lock(lock_key BIGINT DEFAULT 1)
RETURNS VOID AS $$
BEGIN
  PERFORM pg_advisory_unlock(lock_key);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.acquire_publish_lock(BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_publish_lock(BIGINT) TO authenticated;
