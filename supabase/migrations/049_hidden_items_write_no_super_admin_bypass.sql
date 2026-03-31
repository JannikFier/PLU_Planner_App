-- Ausblendungen (hidden_items, backshop_hidden_items): Schreiben nur noch fuer den
-- aktuellen Markt (profiles.current_store_id), ohne Super-Admin-Bypass.
-- Verhindert, dass Super-Admins serverseitig Zeilen fuer beliebige store_id schreiben/loeschen.

-- ============================================================
-- hidden_items
-- ============================================================
DROP POLICY IF EXISTS "users_write_hidden_items_in_current_store" ON public.hidden_items;
CREATE POLICY "users_write_hidden_items_in_current_store"
  ON public.hidden_items FOR ALL
  USING (
    store_id = public.get_current_store_id()
    AND public.get_current_store_id() IS NOT NULL
  )
  WITH CHECK (
    store_id = public.get_current_store_id()
    AND public.get_current_store_id() IS NOT NULL
  );

-- ============================================================
-- backshop_hidden_items
-- ============================================================
DROP POLICY IF EXISTS "users_write_backshop_hidden_items_in_current_store" ON public.backshop_hidden_items;
CREATE POLICY "users_write_backshop_hidden_items_in_current_store"
  ON public.backshop_hidden_items FOR ALL
  USING (
    store_id = public.get_current_store_id()
    AND public.get_current_store_id() IS NOT NULL
  )
  WITH CHECK (
    store_id = public.get_current_store_id()
    AND public.get_current_store_id() IS NOT NULL
  );
