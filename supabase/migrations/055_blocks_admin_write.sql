-- Globale Warengruppen (Obst/Backshop): Schreibzugriff fuer Admin + Super-Admin.
-- Vorher nur is_super_admin() → 403 fuer Abteilungsleiter bei POST /blocks trotz UI-Bedarf.

-- ========== blocks (Obst) ==========
DROP POLICY IF EXISTS "Only super_admins can insert blocks" ON public.blocks;
DROP POLICY IF EXISTS "Only super_admins can update blocks" ON public.blocks;
DROP POLICY IF EXISTS "Only super_admins can delete blocks" ON public.blocks;

CREATE POLICY "Admins can insert blocks"
  ON public.blocks FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update blocks"
  ON public.blocks FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admins can delete blocks"
  ON public.blocks FOR DELETE
  USING (public.is_admin());

-- ========== block_rules (Obst) ==========
DROP POLICY IF EXISTS "Only super_admins can insert block rules" ON public.block_rules;
DROP POLICY IF EXISTS "Only super_admins can update block rules" ON public.block_rules;
DROP POLICY IF EXISTS "Only super_admins can delete block rules" ON public.block_rules;

CREATE POLICY "Admins can insert block rules"
  ON public.block_rules FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update block rules"
  ON public.block_rules FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admins can delete block rules"
  ON public.block_rules FOR DELETE
  USING (public.is_admin());

-- ========== backshop_blocks ==========
DROP POLICY IF EXISTS "Nur Super-Admin kann backshop_blocks einfuegen" ON public.backshop_blocks;
DROP POLICY IF EXISTS "Nur Super-Admin kann backshop_blocks aendern" ON public.backshop_blocks;
DROP POLICY IF EXISTS "Nur Super-Admin kann backshop_blocks loeschen" ON public.backshop_blocks;

CREATE POLICY "Admin und Super-Admin koennen backshop_blocks einfuegen"
  ON public.backshop_blocks FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin und Super-Admin koennen backshop_blocks aendern"
  ON public.backshop_blocks FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admin und Super-Admin koennen backshop_blocks loeschen"
  ON public.backshop_blocks FOR DELETE
  USING (public.is_admin());

-- ========== backshop_block_rules ==========
DROP POLICY IF EXISTS "Nur Super-Admin kann backshop_block_rules einfuegen" ON public.backshop_block_rules;
DROP POLICY IF EXISTS "Nur Super-Admin kann backshop_block_rules aendern" ON public.backshop_block_rules;
DROP POLICY IF EXISTS "Nur Super-Admin kann backshop_block_rules loeschen" ON public.backshop_block_rules;

CREATE POLICY "Admin und Super-Admin koennen backshop_block_rules einfuegen"
  ON public.backshop_block_rules FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin und Super-Admin koennen backshop_block_rules aendern"
  ON public.backshop_block_rules FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admin und Super-Admin koennen backshop_block_rules loeschen"
  ON public.backshop_block_rules FOR DELETE
  USING (public.is_admin());
