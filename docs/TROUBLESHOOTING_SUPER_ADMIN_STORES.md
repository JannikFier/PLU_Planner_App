# Super-Admin: Märkte laden nicht / nur Angerbogen funktioniert

## Symptom
- **Angerbogen** lädt sofort, du kommst in die Markt-Detailseite.
- **Wedau** (oder ein anderer Markt) lädt gar nicht.
- Bei **Laudage KG** (andere Firma): Die Liste der Märkte lädt gar nicht, du siehst keine Märkte zum Auswählen.

## Was hat das mit Punkt 1 und 2 (Rolle prüfen) zu tun?

**Kurz:** In der Datenbank hat jeder Benutzer eine **Rolle** (super_admin, admin, user, viewer). **Nur** die Rolle **super_admin** darf **alle** Firmen und **alle** Märkte sehen und aufrufen. Alle anderen Rollen sehen nur die Firmen/Märkte, in die sie explizit eingetragen sind (über „Benutzer → Markt zuweisen“).

- Wenn dein Account in der DB **nicht** `role = 'super_admin'` hat (z. B. `admin` oder `user`), dann:
  - Siehst du bei **Laudage KG** **keine** Märkte, weil du dort keinem Markt zugewiesen bist.
  - Lädt **Wedau** nicht, wenn du nur **Angerbogen** zugewiesen hast.
  - **Angerbogen** funktioniert, weil genau dieser Markt in deiner Zuweisung steht.

**Punkt 1 und 2** prüfen und setzen in der Datenbank genau diese Rolle. Sobald dein Profil `role = 'super_admin'` hat, darf die App **alle** Märkte laden – dann laden auch Wedau und die Märkte von Laudage KG.

## Ursache (technisch)
1. **Store-Liste / Markt-Detail:** Die Tabelle `stores` und die marktbezogenen Daten haben RLS: Nur **Super-Admins** sehen alle Märkte. Sonst nur die aus `user_store_access`. Steht in der DB nicht `role = 'super_admin'`, werden Wedau und die Märkte von Laudage KG von der Datenbank gar nicht mitgeliefert → „laden gar nicht“.
2. **Markt-Wechsel (PATCH):** Beim Wechsel wird `profiles.current_store_id` gespeichert. Dafür braucht es Migration **043**.

## Prüfung in Supabase

1. **Eigene Rolle prüfen**  
   Im **SQL Editor** (als eingeloggter User oder mit Service-Role) ausführen:
   ```sql
   SELECT id, email, role, current_store_id
   FROM public.profiles
   WHERE email = 'DEINE_EMAIL@example.com';  -- durch deine E-Mail ersetzen
   ```
   - Erwartung für vollen Zugriff: **`role = 'super_admin'`**.
   - Ist die Rolle z. B. `admin`, siehst du nur Märkte aus `user_store_access`.

2. **Super-Admin setzen (falls nötig)**  
   Nur ausführen, wenn du berechtigt bist, einen Super-Admin zu setzen:
   ```sql
   UPDATE public.profiles
   SET role = 'super_admin'
   WHERE email = 'DEINE_EMAIL@example.com';
   ```

3. **Migration 043 ausführen**  
   Inhalt von `supabase/migrations/043_profiles_update_allow_super_admin_store.sql` im SQL Editor ausführen. Danach sollte der Markt-Wechsel (PATCH) ohne 500 funktionieren.

## Nach der Korrektur
- App neu laden (F5).
- Unter „Firmen & Märkte“ sollten alle Firmen und alle Märkte pro Firma sichtbar sein (wenn `role = 'super_admin'`).
- Klick auf einen beliebigen Markt sollte ohne Fehlermeldung funktionieren.
