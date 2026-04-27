-- Update-RPCs für zentrale Nachbesserungen (Duplikat-Check wie Insert, ausgenommen eigene Zeile)

BEGIN;

CREATE OR REPLACE FUNCTION public.update_obst_manual_supplement(
  p_id uuid,
  p_plu text,
  p_system_name text,
  p_item_type text,
  p_block_id uuid DEFAULT NULL,
  p_preis numeric DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_version_id uuid;
  v_norm text;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Nur Super-Admin';
  END IF;

  SELECT m.version_id INTO v_version_id
  FROM public.master_plu_items m
  WHERE m.id = p_id AND m.is_manual_supplement = true;

  IF v_version_id IS NULL THEN
    RAISE EXCEPTION 'Nachbesserung nicht gefunden oder keine manuelle Zeile';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.versions v
    WHERE v.id = v_version_id AND v.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Nur für die aktuell aktive KW-Version möglich';
  END IF;

  v_norm := lower(trim(p_system_name));
  IF length(v_norm) < 2 THEN
    RAISE EXCEPTION 'Bezeichnung ist zu kurz';
  END IF;

  IF p_item_type NOT IN ('PIECE', 'WEIGHT') THEN
    RAISE EXCEPTION 'Ungültiger Listentyp';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.master_plu_items m
    WHERE m.version_id = v_version_id
      AND m.id <> p_id
      AND (m.plu = p_plu OR lower(trim(m.system_name)) = v_norm)
  ) THEN
    RAISE EXCEPTION 'PLU oder Bezeichnung existiert bereits in dieser Version';
  END IF;

  UPDATE public.master_plu_items
  SET
    plu = p_plu,
    system_name = trim(p_system_name),
    item_type = p_item_type,
    block_id = p_block_id,
    preis = p_preis
  WHERE id = p_id;
END;
$$;

REVOKE ALL ON FUNCTION public.update_obst_manual_supplement(uuid, text, text, text, uuid, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_obst_manual_supplement(uuid, text, text, text, uuid, numeric) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_backshop_manual_supplement(
  p_id uuid,
  p_plu text,
  p_system_name text,
  p_image_url text,
  p_block_id uuid DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_version_id uuid;
  v_norm text;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Nur Super-Admin';
  END IF;

  SELECT m.version_id INTO v_version_id
  FROM public.backshop_master_plu_items m
  WHERE m.id = p_id
    AND m.is_manual_supplement = true
    AND m.source = 'manual';

  IF v_version_id IS NULL THEN
    RAISE EXCEPTION 'Nachbesserung nicht gefunden oder keine manuelle Zeile';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.backshop_versions v
    WHERE v.id = v_version_id AND v.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Nur für die aktuell aktive Backshop-KW-Version möglich';
  END IF;

  IF p_image_url IS NULL OR length(trim(p_image_url)) = 0 THEN
    RAISE EXCEPTION 'Bild-URL ist erforderlich';
  END IF;

  v_norm := lower(trim(p_system_name));
  IF length(v_norm) < 2 THEN
    RAISE EXCEPTION 'Bezeichnung ist zu kurz';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.backshop_master_plu_items m
    WHERE m.version_id = v_version_id
      AND m.id <> p_id
      AND (m.plu = p_plu OR lower(trim(m.system_name)) = v_norm)
  ) THEN
    RAISE EXCEPTION 'PLU oder Bezeichnung existiert bereits in dieser Version';
  END IF;

  UPDATE public.backshop_master_plu_items
  SET
    plu = p_plu,
    system_name = trim(p_system_name),
    image_url = trim(p_image_url),
    block_id = p_block_id
  WHERE id = p_id;
END;
$$;

REVOKE ALL ON FUNCTION public.update_backshop_manual_supplement(uuid, text, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_backshop_manual_supplement(uuid, text, text, text, uuid) TO authenticated;

COMMIT;
