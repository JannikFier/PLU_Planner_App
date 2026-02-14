-- ============================================================
-- PLU PLANNER – Testdaten für Phase 2
-- Dieses Script im Supabase SQL Editor ausführen.
--
-- Legt an:
--   1 aktive Version (aktuelle KW)
--   25 PLU-Items mit realistischen Produktnamen
--   Mix aus UNCHANGED, NEW_PRODUCT_YELLOW, PLU_CHANGED_RED
--   Mix aus PIECE und WEIGHT
-- ============================================================

-- Aktuelle KW + Jahr ermitteln
DO $$
DECLARE
    v_kw INT := EXTRACT(WEEK FROM CURRENT_DATE)::INT;
    v_jahr INT := EXTRACT(YEAR FROM CURRENT_DATE)::INT;
    v_version_id UUID;
BEGIN
    -- Version anlegen (aktuelle KW, Status active)
    INSERT INTO public.versions (kw_nummer, jahr, status, published_at)
    VALUES (v_kw, v_jahr, 'active', now())
    RETURNING id INTO v_version_id;

    -- ============================================================
    -- Stück-Artikel (PIECE)
    -- ============================================================
    INSERT INTO public.master_plu_items (version_id, plu, system_name, item_type, status) VALUES
    -- Unverändert
    (v_version_id, '10001', 'Apfel Braeburn',         'PIECE', 'UNCHANGED'),
    (v_version_id, '10002', 'Apfel Elstar',            'PIECE', 'UNCHANGED'),
    (v_version_id, '10010', 'Banane',                   'PIECE', 'UNCHANGED'),
    (v_version_id, '10015', 'Birne Conference',         'PIECE', 'UNCHANGED'),
    (v_version_id, '10020', 'Clementine',               'PIECE', 'UNCHANGED'),
    (v_version_id, '10030', 'Dattel Medjool',           'PIECE', 'UNCHANGED'),
    (v_version_id, '10040', 'Erdbeeren 500g',           'PIECE', 'UNCHANGED'),
    (v_version_id, '10050', 'Feige frisch',             'PIECE', 'UNCHANGED'),
    (v_version_id, '10060', 'Granatapfel',              'PIECE', 'UNCHANGED'),
    (v_version_id, '10070', 'Heidelbeeren 125g',        'PIECE', 'UNCHANGED'),
    (v_version_id, '10080', 'Kiwi grün',                'PIECE', 'UNCHANGED'),
    (v_version_id, '10090', 'Limette',                  'PIECE', 'UNCHANGED'),
    -- Neu (gelb)
    (v_version_id, '10100', 'Bio Banane Fairtrade',     'PIECE', 'NEW_PRODUCT_YELLOW'),
    (v_version_id, '10101', 'Mango Kent',               'PIECE', 'NEW_PRODUCT_YELLOW'),
    (v_version_id, '10102', 'Nektarine gelb',           'PIECE', 'NEW_PRODUCT_YELLOW'),
    -- PLU geändert (rot)
    (v_version_id, '10200', 'Orange Navel',             'PIECE', 'PLU_CHANGED_RED');

    -- old_plu setzen für geänderte Artikel
    UPDATE public.master_plu_items
    SET old_plu = '10099'
    WHERE version_id = v_version_id AND plu = '10200';

    -- ============================================================
    -- Gewichts-Artikel (WEIGHT)
    -- ============================================================
    INSERT INTO public.master_plu_items (version_id, plu, system_name, item_type, status) VALUES
    -- Unverändert
    (v_version_id, '20001', 'Gouda jung',               'WEIGHT', 'UNCHANGED'),
    (v_version_id, '20002', 'Emmentaler',               'WEIGHT', 'UNCHANGED'),
    (v_version_id, '20010', 'Salami italienisch',       'WEIGHT', 'UNCHANGED'),
    (v_version_id, '20020', 'Schinken gekocht',         'WEIGHT', 'UNCHANGED'),
    (v_version_id, '20030', 'Tomaten Rispen',           'WEIGHT', 'UNCHANGED'),
    (v_version_id, '20040', 'Paprika rot',              'WEIGHT', 'UNCHANGED'),
    -- Neu (gelb)
    (v_version_id, '20100', 'Bio Mozzarella',           'WEIGHT', 'NEW_PRODUCT_YELLOW'),
    -- PLU geändert (rot)
    (v_version_id, '20200', 'Zucchini grün',            'WEIGHT', 'PLU_CHANGED_RED');

    -- old_plu setzen
    UPDATE public.master_plu_items
    SET old_plu = '20055'
    WHERE version_id = v_version_id AND plu = '20200';

    RAISE NOTICE 'Testdaten erfolgreich angelegt: Version % (KW%/%), 25 PLU-Items', v_version_id, v_kw, v_jahr;
END $$;
