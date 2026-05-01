-- Kiosk-Konten: profiles.personalnummer ist UNIQUE — mehrere '' sind ungueltig.
-- Synthetische eindeutige Personalnummer pro Kasse (Trigger), damit create-kiosk-register mehrfach funktioniert.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
  v_personalnummer TEXT;
BEGIN
    IF NEW.is_anonymous = TRUE THEN
        RETURN NEW;
    END IF;

    v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'user');

    IF NEW.email ~ '^kiosk_reg_[a-f0-9]{32}@(kiosk\.pluplanner\.invalid|example\.com)$' THEN
        v_role := 'kiosk';
        -- Eindeutig pro Auth-User; vermeidet UNIQUE-Konflikt mit '' und anderen Kassen
        v_personalnummer := 'kiosk_' || REPLACE(NEW.id::TEXT, '-', '');
    ELSE
        v_personalnummer := COALESCE(NEW.raw_user_meta_data->>'personalnummer', '');
        IF v_role NOT IN ('user', 'admin', 'viewer') THEN
            v_role := 'user';
        END IF;
    END IF;

    INSERT INTO public.profiles (id, email, personalnummer, display_name, role, must_change_password)
    VALUES (
        NEW.id,
        NEW.email,
        v_personalnummer,
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
