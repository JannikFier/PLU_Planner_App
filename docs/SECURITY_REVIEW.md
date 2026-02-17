# PLU Planner – Sicherheitsüberblick

Stand: Februar 2025

## Kurzfassung

- **Zugang:** Ohne Login kommt niemand an Daten; alle App-Routen außer `/login` sind geschützt.
- **Rollen:** Frontend und Backend (RLS + Edge Functions) trennen User / Admin / Super-Admin konsistent.
- **Kritischer Punkt (behoben):** Über die Tabelle `profiles` konnte man theoretisch die eigene Rolle anpassen (Rollen-Eskalation). Das wird durch eine schärfere RLS-Policy verhindert.
- **Weitere Hinweise:** Personalnummer-Lookup ist für Anonyme aufrufbar (E-Mail-Erkennung möglich); ausgeblendete PLUs sind global – jeder eingeloggte User kann Einträge in `hidden_items` löschen.

---

## 1. Was gut abgesichert ist

### 1.1 Zugang zur App

- **ProtectedRoute:** Jede geschützte Route prüft:
  - Eingeloggt? Sonst → `/login`
  - `must_change_password`? Sonst → `/change-password`
  - Admin-Route ohne Admin-Rolle? → Redirect ins User-Dashboard
  - Super-Admin-Route ohne Super-Admin? → Redirect ins Admin- oder User-Dashboard
- **Root `/`:** Leitet auf `/user` weiter; ohne Session landet man durch ProtectedRoute beim Login.
- **Kein Zugriff auf Daten ohne Session:** Supabase-Client nutzt den Anon Key; alle Datenzugriffe laufen mit dem JWT des eingeloggten Users. Ohne gültige Session liefert die DB wegen RLS keine Zeilen.

### 1.2 Datenbank (RLS)

- Auf allen relevanten Tabellen ist **Row Level Security (RLS)** aktiviert.
- **Lese-/Schreibrechte** sind rollenbasiert und an `auth.uid()` / `is_admin()` / `is_super_admin()` geknüpft:
  - **profiles:** Eigenes Profil lesen/aktualisieren; Admins lesen alle Profile (UPDATE siehe unten).
  - **versions, master_plu_items, blocks, block_rules, layout_settings, bezeichnungsregeln:** Lesen für alle eingeloggten User; Schreiben nur Super-Admin (bzw. wie in den Migrations definiert).
  - **custom_products:** Alle lesen/einfügen; Updat/Löschen nur Ersteller oder Super-Admin.
  - **hidden_items:** Alle lesen/einfügen/löschen (globale Liste; siehe Abschnitt 3).
  - **version_notifications:** Eigenen Eintrag lesen/aktualisieren; Anlegen nur Super-Admin.
  - **user_overrides, notifications_queue:** Eigenen Daten bzw. Admin-Berechtigung wie in ROLES_AND_PERMISSIONS.md.
- **Helper-Funktionen:** `is_admin()` und `is_super_admin()` sind `SECURITY DEFINER` und lesen die Rolle aus `profiles`; sie werden in den Policies korrekt verwendet.

### 1.3 Edge Functions (User-Verwaltung)

- **create-user, reset-password, delete-user** laufen mit Service Role, prüfen aber zuerst den Aufrufer:
  - **Authorization:** JWT aus Header; kein User → 401.
  - **Rolle:** Nur Admin/Super-Admin dürfen die Funktionen nutzen; Admin darf keine weiteren Admins anlegen bzw. keine Admin-Passwörter löschen/zurücksetzen.
  - **create-user:** Super-Admin-Rolle kann nicht angelegt werden; Admin kann nur User anlegen.
  - **reset-password / delete-user:** Super-Admin kann nicht gelöscht/zurückgesetzt werden; Admin darf nur User, kein anderer Admin.
- Aufruf aus der App erfolgt mit dem Session-JWT (`supabase.functions.invoke` sendet den aktuellen Token mit).

### 1.4 Keine sensiblen Daten im Frontend

- Es wird nur der **Anon Key** (VITE_SUPABASE_ANON_KEY) im Frontend verwendet; Service Role Key kommt nur in den Edge Functions (Umgebung) vor.
- Keine Passwörter oder Tokens im Code; Auth über Supabase Auth (JWT, Cookies/Session).

---

## 2. Behobene Schwachstelle: Rollen-Eskalation über `profiles`

### Problem

- Die RLS-Policy **"Users can update own profile"** erlaubte UPDATE nur auf der eigenen Zeile (`USING (id = auth.uid())`, `WITH CHECK (id = auth.uid())`).
- Sie schränkte **nicht** ein, welche Spalten geändert werden dürfen. Ein Nutzer konnte damit theoretisch z. B. per API-Aufruf die eigene Zeile mit `role = 'super_admin'` aktualisieren und so Rechte eskalieren.

### Lösung

- In **Migration 008** wurde die Policy so verschärft, dass die **Rolle bei eigenen Updates nicht geändert** werden darf:
  - `WITH CHECK` verlangt zusätzlich, dass `role` unverändert bleibt (Vergleich mit dem aktuellen Wert in `profiles` für `auth.uid()`).
- Damit sind weiterhin z. B. `display_name` und `must_change_password` (wie im Change-Password-Flow) durch den User selbst änderbar, aber **nicht** die Rolle.

---

## 3. Weitere Hinweise (keine kritischen Lücken)

### 3.1 `lookup_email_by_personalnummer` (anon)

- Die Funktion ist mit `GRANT EXECUTE ... TO anon` aufrufbar, damit der Login mit Personalnummer ohne vorherige Anmeldung funktioniert.
- **Folge:** Jeder (auch nicht eingeloggt) kann mit einer gültigen Personalnummer die zugehörige E-Mail-Adresse erfragen (Erkennung, ob eine Personalnummer existiert + welche E-Mail dahintersteht).
- **Risiko:** Informationsleck für Enumerationsangriffe; kein Zugriff auf Passwort oder andere Daten.
- **Optionen:** Wenn das vermieden werden soll: Login-Flow so umbauen, dass die Funktion nur von authentifizierten Nutzern oder über eine geschützte Edge Function aufgerufen wird (dann ggf. anderes Login-Flow-Design).

### 3.2 `hidden_items`: Löschen für alle

- Die Policy erlaubt **allen eingeloggten Usern**, beliebige Einträge in `hidden_items` zu **löschen** („wieder einblenden“).
- Wenn „ausblenden“ als **globale** Liste gedacht ist (ein Ausblenden = für alle sichtbar ausgeblendet), kann ein User Einträge, die ein anderer ausgeblendet hat, wieder einblenden.
- Das ist eine **Design-/Produktentscheidung**. Wenn Ausblenden nur pro User gewünscht ist, müsste die Tabelle nutzerbezogen sein und die DELETE-Policy eingeschränkt werden (z. B. nur `hidden_by = auth.uid()`).

### 3.3 Cron-Jobs (Migration 007)

- Die Cron-Jobs (KW-Switch, Auto-Delete Versionen, Notification-Cleanup) laufen im Datenbank-Kontext (pg_cron) und umgehen RLS; das ist für solche Wartungsaufgaben üblich und erwünscht.

---

## 4. Empfehlungen

1. **Migration 008 anwenden** (Rollen-Eskalation unterbinden), falls noch nicht geschehen.
2. **Regelmäßig:** Supabase-Dashboard auf unerwartete API-Nutzung, neue User und Rollen prüfen.
3. **Optional:** Wenn E-Mail-Erkennung über Personalnummer unerwünscht ist, `lookup_email_by_personalnummer` nur über eine authentifizierte oder anderweitig geschützte Schnittstelle anbinden.
4. **Optional:** Wenn „Ausblenden“ pro User gewünscht ist, `hidden_items` und RLS entsprechend anpassen (nutzerbezogene Zeilen, DELETE nur für eigene).

---

## 5. Übersicht: Wer darf was?

| Aktion / Ressource              | User | Admin | Super-Admin |
|--------------------------------|------|-------|--------------|
| App ohne Login nutzen          | ❌   | ❌    | ❌           |
| Eigene Rolle ändern (DB)       | ❌   | ❌    | ❌           |
| PLU-Liste, eigene Produkte, Ausblenden, PDF | ✅ | ✅ | ✅ |
| User anlegen / Passwort zurücksetzen | ❌ | ✅ (User) | ✅ |
| Admin anlegen                  | ❌   | ❌    | ✅           |
| Upload, Layout, Versionen, Regeln, Blöcke | ❌ | ❌ | ✅ |
| Alle Profile lesen             | ❌   | ✅    | ✅           |

Die genaue Rechte-Matrix steht in **ROLES_AND_PERMISSIONS.md**.
