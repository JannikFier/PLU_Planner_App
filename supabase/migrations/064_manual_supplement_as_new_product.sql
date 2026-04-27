-- Manuelle Nachbesserungen: wie neue Produkte (NEW_PRODUCT_YELLOW), Benachrichtigungen wieder öffnen;
-- Verlängern (Carryover): Backshop wie Obst mit UNCHANGED, kein Gelb.

BEGIN;

CREATE OR REPLACE FUNCTION public.insert_obst_manual_supplement(
  p_version_id uuid,
  p_plu text,
  p_system_name text,
  p_item_type text,
  p_block_id uuid DEFAULT NULL,
  p_preis numeric DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_norm text;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Nur Super-Admin kann zentrale Nachbesserungen anlegen';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.versions v
    WHERE v.id = p_version_id AND v.status = 'active'
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
    WHERE m.version_id = p_version_id
      AND (m.plu = p_plu OR lower(trim(m.system_name)) = v_norm)
  ) THEN
    RAISE EXCEPTION 'PLU oder Bezeichnung existiert bereits in dieser Version';
  END IF;

  INSERT INTO public.master_plu_items (
    version_id,
    plu,
    system_name,
    item_type,
    status,
    old_plu,
    warengruppe,
    block_id,
    is_admin_eigen,
    is_manually_renamed,
    preis,
    is_manual_supplement
  ) VALUES (
    p_version_id,
    p_plu,
    trim(p_system_name),
    p_item_type,
    'NEW_PRODUCT_YELLOW',
    NULL,
    NULL,
    p_block_id,
    true,
    false,
    p_preis,
    true
  )
  RETURNING id INTO v_id;

  UPDATE public.version_notifications
  SET is_read = false, read_at = NULL
  WHERE version_id = p_version_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.insert_backshop_manual_supplement(
  p_version_id uuid,
  p_plu text,
  p_system_name text,
  p_image_url text,
  p_block_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_norm text;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Nur Super-Admin kann zentrale Nachbesserungen anlegen';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.backshop_versions v
    WHERE v.id = p_version_id AND v.status = 'active'
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
    WHERE m.version_id = p_version_id
      AND m.source = 'manual'
      AND (m.plu = p_plu OR lower(trim(m.system_name)) = v_norm)
  ) THEN
    RAISE EXCEPTION 'PLU oder Bezeichnung existiert bereits (manuelle Nachbesserung)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.backshop_master_plu_items m
    WHERE m.version_id = p_version_id
      AND m.source <> 'manual'
      AND (m.plu = p_plu OR lower(trim(m.system_name)) = v_norm)
  ) THEN
    RAISE EXCEPTION 'PLU oder Bezeichnung existiert bereits in dieser Version';
  END IF;

  INSERT INTO public.backshop_master_plu_items (
    version_id,
    plu,
    system_name,
    display_name,
    status,
    old_plu,
    warengruppe,
    block_id,
    is_manually_renamed,
    image_url,
    source,
    is_manual_supplement
  ) VALUES (
    p_version_id,
    p_plu,
    trim(p_system_name),
    NULL,
    'NEW_PRODUCT_YELLOW',
    NULL,
    NULL,
    p_block_id,
    false,
    trim(p_image_url),
    'manual',
    true
  )
  RETURNING id INTO v_id;

  UPDATE public.backshop_version_notifications
  SET is_read = false, read_at = NULL
  WHERE version_id = p_version_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.carry_over_backshop_manual_supplements(
  p_from_version_id uuid,
  p_to_version_id uuid
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted integer := 0;
  r RECORD;
  v_norm text;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Nur Super-Admin';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.backshop_versions v WHERE v.id = p_to_version_id AND v.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Ziel muss die aktive Backshop-Version sein';
  END IF;

  FOR r IN
    SELECT m.*
    FROM public.backshop_master_plu_items m
    WHERE m.version_id = p_from_version_id
      AND m.is_manual_supplement = true
      AND m.source = 'manual'
  LOOP
    v_norm := lower(trim(r.system_name));
    IF EXISTS (
      SELECT 1 FROM public.backshop_master_plu_items x
      WHERE x.version_id = p_to_version_id
        AND (x.plu = r.plu OR lower(trim(x.system_name)) = v_norm)
    ) THEN
      CONTINUE;
    END IF;

    INSERT INTO public.backshop_master_plu_items (
      version_id, plu, system_name, display_name, status,
      old_plu, warengruppe, block_id, is_manually_renamed,
      image_url, source, is_manual_supplement
    ) VALUES (
      p_to_version_id, r.plu, r.system_name, r.display_name, 'UNCHANGED',
      NULL, r.warengruppe, r.block_id, r.is_manually_renamed,
      r.image_url, 'manual', true
    );
    v_inserted := v_inserted + 1;
  END LOOP;

  RETURN v_inserted;
END;
$$;

REVOKE ALL ON FUNCTION public.insert_obst_manual_supplement(uuid, text, text, text, uuid, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.insert_obst_manual_supplement(uuid, text, text, text, uuid, numeric) TO authenticated;

REVOKE ALL ON FUNCTION public.insert_backshop_manual_supplement(uuid, text, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.insert_backshop_manual_supplement(uuid, text, text, text, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.carry_over_backshop_manual_supplements(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.carry_over_backshop_manual_supplements(uuid, uuid) TO authenticated;

COMMIT;
