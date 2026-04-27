-- Backshop: letzter Publish pro KW-Version und Quelle (Edeka/Harry/Aryzta) + RPC zum Löschen einer Quelle

BEGIN;

CREATE TABLE public.backshop_version_source_publish (
  version_id UUID NOT NULL REFERENCES public.backshop_versions(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('edeka', 'harry', 'aryzta')),
  published_at TIMESTAMPTZ NOT NULL,
  published_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  row_count INT NOT NULL CHECK (row_count >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (version_id, source)
);

CREATE INDEX idx_backshop_version_source_publish_version
  ON public.backshop_version_source_publish(version_id);

COMMENT ON TABLE public.backshop_version_source_publish
  IS 'Letzter erfolgreicher Publish pro Backshop-KW-Version und Excel-Quelle (edeka/harry/aryzta).';

ALTER TABLE public.backshop_version_source_publish ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Alle koennen backshop_version_source_publish lesen"
  ON public.backshop_version_source_publish FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Nur Super-Admin kann backshop_version_source_publish einfuegen"
  ON public.backshop_version_source_publish FOR INSERT
  WITH CHECK (public.is_super_admin());

CREATE POLICY "Nur Super-Admin kann backshop_version_source_publish aendern"
  ON public.backshop_version_source_publish FOR UPDATE
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "Nur Super-Admin kann backshop_version_source_publish loeschen"
  ON public.backshop_version_source_publish FOR DELETE
  USING (public.is_super_admin());

-- Bestehende Master-Zeilen: ein Eintrag pro (version_id, source) mit COUNT und letztem created_at
INSERT INTO public.backshop_version_source_publish (version_id, source, published_at, published_by, row_count)
SELECT
  i.version_id,
  i.source,
  max(i.created_at),
  NULL,
  count(*)::int
FROM public.backshop_master_plu_items i
WHERE i.source IN ('edeka', 'harry', 'aryzta')
GROUP BY i.version_id, i.source
ON CONFLICT (version_id, source) DO UPDATE SET
  published_at = EXCLUDED.published_at,
  row_count = EXCLUDED.row_count,
  updated_at = now();

CREATE OR REPLACE FUNCTION public.delete_backshop_master_items_by_source(
  p_version_id uuid,
  p_source text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Nur Super-Admin kann Backshop-Quellen-Daten loeschen';
  END IF;

  IF p_source IS NULL OR p_source NOT IN ('edeka', 'harry', 'aryzta') THEN
    RAISE EXCEPTION 'Ungueltige Quelle (nur edeka, harry, aryzta)';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.backshop_versions v WHERE v.id = p_version_id) THEN
    RAISE EXCEPTION 'Backshop-Version nicht gefunden';
  END IF;

  DELETE FROM public.backshop_product_group_members m
  USING public.backshop_master_plu_items i
  WHERE i.version_id = p_version_id
    AND i.source = p_source
    AND i.plu = m.plu
    AND m.source = p_source;

  DELETE FROM public.backshop_master_plu_items
  WHERE version_id = p_version_id AND source = p_source;

  DELETE FROM public.backshop_version_source_publish
  WHERE version_id = p_version_id AND source = p_source;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_backshop_master_items_by_source(uuid, text) TO authenticated;

COMMIT;
