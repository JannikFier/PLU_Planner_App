-- Ausblendungen: PLU darf pro Markt einmal ausgeblendet sein (nicht global eindeutig).
-- Historisch (006/011): UNIQUE(plu) → zweiter Markt erhielt 409 Conflict beim Ausblenden,
-- während SELECT mit store_id für diesen Markt leer blieb.

-- Obst/Gemüse
ALTER TABLE public.hidden_items
  DROP CONSTRAINT IF EXISTS hidden_items_plu_key;

ALTER TABLE public.hidden_items
  ADD CONSTRAINT hidden_items_store_id_plu_key UNIQUE (store_id, plu);

-- Backshop (gleiches Schema aus 011_backshop_schema.sql)
ALTER TABLE public.backshop_hidden_items
  DROP CONSTRAINT IF EXISTS backshop_hidden_items_plu_key;

ALTER TABLE public.backshop_hidden_items
  ADD CONSTRAINT backshop_hidden_items_store_id_plu_key UNIQUE (store_id, plu);

COMMENT ON CONSTRAINT hidden_items_store_id_plu_key ON public.hidden_items IS
  'Eine PLU kann pro Markt ausgeblendet sein; nicht mehr global nur einmal.';

COMMENT ON CONSTRAINT backshop_hidden_items_store_id_plu_key ON public.backshop_hidden_items IS
  'Eine PLU kann pro Markt ausgeblendet sein; nicht mehr global nur einmal.';
