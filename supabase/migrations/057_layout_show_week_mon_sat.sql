-- Optionale Anzeige Montag–Samstag zur Kalenderwoche (Listen/PDF), pro Markt für Obst und Backshop.

ALTER TABLE public.layout_settings
  ADD COLUMN IF NOT EXISTS show_week_mon_sat_in_labels BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.layout_settings.show_week_mon_sat_in_labels IS
  'Wenn true: KW-Labels um Datumsbereich Mo–Sa (ISO-Woche) ergänzen.';

ALTER TABLE public.backshop_layout_settings
  ADD COLUMN IF NOT EXISTS show_week_mon_sat_in_labels BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.backshop_layout_settings.show_week_mon_sat_in_labels IS
  'Wenn true: KW-Labels um Datumsbereich Mo–Sa (ISO-Woche) ergänzen (Backshop).';

-- Neuer Markt: Spalte in Seed-Trigger übernehmen (erster Markt: false; Kopie: vom Template)
CREATE OR REPLACE FUNCTION public.seed_store_scoped_settings_for_new_store()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  template_store UUID;
BEGIN
  SELECT id INTO template_store
  FROM public.stores
  WHERE id <> NEW.id
  ORDER BY created_at ASC
  LIMIT 1;

  IF template_store IS NULL THEN
    INSERT INTO public.layout_settings (
      id, store_id, sort_mode, display_mode, flow_direction,
      font_header_px, font_column_px, font_product_px,
      mark_red_kw_count, mark_yellow_kw_count,
      features_custom_products, features_hidden_items, features_blocks, features_keyword_rules,
      allow_mixed_mode, allow_separated_mode, show_week_mon_sat_in_labels
    ) VALUES (
      gen_random_uuid(), NEW.id,
      'ALPHABETICAL', 'MIXED', 'ROW_BY_ROW',
      24, 16, 12,
      2, 3,
      true, true, true, true,
      true, true, false
    );
    INSERT INTO public.backshop_layout_settings (
      id, store_id, sort_mode, display_mode, flow_direction,
      font_header_px, font_column_px, font_product_px,
      mark_red_kw_count, mark_yellow_kw_count,
      features_custom_products, features_hidden_items, features_blocks, features_keyword_rules,
      allow_mixed_mode, allow_separated_mode, page_break_per_block, show_week_mon_sat_in_labels
    ) VALUES (
      gen_random_uuid(), NEW.id,
      'ALPHABETICAL', 'MIXED', 'ROW_BY_ROW',
      24, 16, 12,
      2, 3,
      true, true, true, true,
      true, true, false, false
    );
  ELSE
    INSERT INTO public.layout_settings (
      id, sort_mode, display_mode, flow_direction,
      font_header_px, font_column_px, font_product_px,
      mark_red_kw_count, mark_yellow_kw_count,
      features_custom_products, features_hidden_items, features_blocks, features_keyword_rules,
      allow_mixed_mode, allow_separated_mode, show_week_mon_sat_in_labels, updated_at, updated_by, store_id
    )
    SELECT
      gen_random_uuid(), sort_mode, display_mode, flow_direction,
      font_header_px, font_column_px, font_product_px,
      mark_red_kw_count, mark_yellow_kw_count,
      features_custom_products, features_hidden_items, features_blocks, features_keyword_rules,
      allow_mixed_mode, allow_separated_mode, show_week_mon_sat_in_labels, updated_at, updated_by, NEW.id
    FROM public.layout_settings
    WHERE store_id = template_store
    LIMIT 1;

    INSERT INTO public.backshop_layout_settings (
      id, sort_mode, display_mode, flow_direction,
      font_header_px, font_column_px, font_product_px,
      mark_red_kw_count, mark_yellow_kw_count,
      features_custom_products, features_hidden_items, features_blocks, features_keyword_rules,
      allow_mixed_mode, allow_separated_mode, page_break_per_block, show_week_mon_sat_in_labels, updated_at, updated_by, store_id
    )
    SELECT
      gen_random_uuid(), sort_mode, display_mode, flow_direction,
      font_header_px, font_column_px, font_product_px,
      mark_red_kw_count, mark_yellow_kw_count,
      features_custom_products, features_hidden_items, features_blocks, features_keyword_rules,
      allow_mixed_mode, allow_separated_mode, page_break_per_block, show_week_mon_sat_in_labels, updated_at, updated_by, NEW.id
    FROM public.backshop_layout_settings
    WHERE store_id = template_store
    LIMIT 1;

    INSERT INTO public.bezeichnungsregeln (
      id, keyword, position, case_sensitive, is_active, created_at, created_by, store_id
    )
    SELECT
      gen_random_uuid(), keyword, position, case_sensitive, is_active, created_at, created_by, NEW.id
    FROM public.bezeichnungsregeln
    WHERE store_id = template_store;

    INSERT INTO public.backshop_bezeichnungsregeln (
      id, keyword, position, case_sensitive, is_active, created_at, created_by, store_id
    )
    SELECT
      gen_random_uuid(), keyword, position, case_sensitive, is_active, created_at, created_by, NEW.id
    FROM public.backshop_bezeichnungsregeln
    WHERE store_id = template_store;
  END IF;

  RETURN NEW;
END;
$$;
