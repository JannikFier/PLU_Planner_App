-- Kassen-Auth: Supabase Auth lehnt einige syntaktisch reservierte Domains (.invalid) ab → createUser 400.
-- Interne E-Mail: kiosk_reg_<32hex>@example.com (nur per Admin-API; Prefix + Laenge nicht per normalem Signup zu erraten).
-- handle_new_user: Rolle kiosk nur bei diesem Muster.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
BEGIN
    IF NEW.is_anonymous = TRUE THEN
        RETURN NEW;
    END IF;

    v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'user');

    -- Kiosk nur fuer vom Backend angelegte Konten (Edge Function create-kiosk-register)
    IF NEW.email ~ '^kiosk_reg_[a-f0-9]{32}@(kiosk\.pluplanner\.invalid|example\.com)$' THEN
        v_role := 'kiosk';
    ELSIF v_role NOT IN ('user', 'admin', 'viewer') THEN
        v_role := 'user';
    END IF;

    INSERT INTO public.profiles (id, email, personalnummer, display_name, role, must_change_password)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'personalnummer', ''),
        COALESCE(NEW.raw_user_meta_data->>'display_name', ''),
        v_role,
        COALESCE((NEW.raw_user_meta_data->>'must_change_password')::BOOLEAN, false)
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        display_name = EXCLUDED.display_name;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
