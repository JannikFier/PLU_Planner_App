-- Backshop-Markt-Konfiguration: User (Rolle user) darf im aktuellen Markt wie Admin schreiben,
-- solange is_not_viewer() (kein Viewer/Kiosk). Super-Admin unverändert.

-- ---------------------------------------------------------------------------
-- backshop_layout_settings (UPDATE)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "backshop_layout_settings_update_store_scoped" ON public.backshop_layout_settings;

CREATE POLICY "backshop_layout_settings_update_store_scoped"
  ON public.backshop_layout_settings FOR UPDATE
  TO authenticated
  USING (
    public.is_super_admin()
    OR (
      store_id = public.get_current_store_id()
      AND public.get_current_store_id() IS NOT NULL
      AND public.is_not_viewer()
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      store_id = public.get_current_store_id()
      AND public.get_current_store_id() IS NOT NULL
      AND public.is_not_viewer()
    )
  );

-- ---------------------------------------------------------------------------
-- backshop_bezeichnungsregeln (INSERT / UPDATE / DELETE)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "backshop_bezeichnungsregeln_insert_store_scoped" ON public.backshop_bezeichnungsregeln;
DROP POLICY IF EXISTS "backshop_bezeichnungsregeln_update_store_scoped" ON public.backshop_bezeichnungsregeln;
DROP POLICY IF EXISTS "backshop_bezeichnungsregeln_delete_store_scoped" ON public.backshop_bezeichnungsregeln;

CREATE POLICY "backshop_bezeichnungsregeln_insert_store_scoped"
  ON public.backshop_bezeichnungsregeln FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR (
      store_id = public.get_current_store_id()
      AND public.get_current_store_id() IS NOT NULL
      AND public.is_not_viewer()
    )
  );

CREATE POLICY "backshop_bezeichnungsregeln_update_store_scoped"
  ON public.backshop_bezeichnungsregeln FOR UPDATE
  TO authenticated
  USING (
    public.is_super_admin()
    OR (
      store_id = public.get_current_store_id()
      AND public.get_current_store_id() IS NOT NULL
      AND public.is_not_viewer()
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      store_id = public.get_current_store_id()
      AND public.get_current_store_id() IS NOT NULL
      AND public.is_not_viewer()
    )
  );

CREATE POLICY "backshop_bezeichnungsregeln_delete_store_scoped"
  ON public.backshop_bezeichnungsregeln FOR DELETE
  TO authenticated
  USING (
    public.is_super_admin()
    OR (
      store_id = public.get_current_store_id()
      AND public.get_current_store_id() IS NOT NULL
      AND public.is_not_viewer()
    )
  );

-- ---------------------------------------------------------------------------
-- store_backshop_block_order, store_backshop_name_block_override (FOR ALL)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "store_backshop_block_order_all" ON public.store_backshop_block_order;

CREATE POLICY "store_backshop_block_order_all"
  ON public.store_backshop_block_order FOR ALL
  TO authenticated
  USING (
    public.is_super_admin()
    OR store_id IN (SELECT public.get_user_store_ids())
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      store_id = public.get_current_store_id()
      AND public.get_current_store_id() IS NOT NULL
      AND public.is_not_viewer()
    )
  );

DROP POLICY IF EXISTS "store_backshop_name_block_override_all" ON public.store_backshop_name_block_override;

CREATE POLICY "store_backshop_name_block_override_all"
  ON public.store_backshop_name_block_override FOR ALL
  TO authenticated
  USING (
    public.is_super_admin()
    OR store_id IN (SELECT public.get_user_store_ids())
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      store_id = public.get_current_store_id()
      AND public.get_current_store_id() IS NOT NULL
      AND public.is_not_viewer()
    )
  );

-- ---------------------------------------------------------------------------
-- backshop_source_rules_per_store (Gruppenregeln pro Warengruppe)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "admins_write_backshop_source_rules_in_current_store" ON public.backshop_source_rules_per_store;

CREATE POLICY "admins_write_backshop_source_rules_in_current_store"
  ON public.backshop_source_rules_per_store FOR ALL
  TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_not_viewer()
      AND store_id = public.get_current_store_id()
      AND public.get_current_store_id() IS NOT NULL
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_not_viewer()
      AND store_id = public.get_current_store_id()
      AND public.get_current_store_id() IS NOT NULL
    )
  );
