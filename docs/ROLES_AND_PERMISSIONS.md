# Rollen & Berechtigungen

## Vier-Rollen-System

Der PLU Planner unterscheidet vier Rollen mit klar abgegrenzten Rechten.

### Rechte-Matrix

| Funktion | Super-Admin | Admin | User | Viewer |
|----------|:-----------:|:-----:|:----:|:------:|
| PLU-Liste ansehen | ✅ | ✅ | ✅ | ✅ |
| PDF exportieren / drucken | ✅ | ✅ | ✅ | ✅ |
| Eigene Produkte hinzufuegen (pro Markt) | ✅ | ✅ | ✅ | ❌ |
| Produkte ausblenden (pro Markt) | ✅ | ✅ | ✅ | ❌ |
| Produkte wieder einblenden (pro Markt) | ✅ | ✅ | ✅ | ❌ |
| **Manuelle Werbung** (Angebot + Preis, Laufzeit) | ✅ | ✅ | ✅ | ❌ |
| **Megafon aus** (zentrale Werbung pro Markt ausblenden) | ✅ | ✅ | ✅ | ❌ |
| **Zentrale Werbung** (Exit-Excel, Kampagne pro KW) | ✅ | ❌ | ❌ | ❌ |
| Benachrichtigungen (Glocke) | ✅ | ✅ | ✅ | ❌ |
| **Custom Product umbenennen** | ✅ (alle) | Nur eigene | Nur eigene | ❌ |
| **Master Product umbenennen** | ✅ | ✅ | ✅ | ❌ |
| **Benutzerverwaltung sehen** | ✅ | ✅ | ❌ | ❌ |
| **User/Admin/Viewer anlegen** | ✅ (Rolle waehlbar) | ✅ (Rolle waehlbar) | ❌ | ❌ |
| **Passwort zuruecksetzen** (alle ausser Super-Admin) | ✅ | ✅ | ❌ | ❌ |
| **User/Admin/Viewer loeschen** | ✅ | ✅ | ❌ | ❌ |
| **Rollen aendern (hoch-/runterstufen)** | ✅ | ✅ (nicht sich selbst) | ❌ | ❌ |
| **Excel Upload / KW-Vergleich** | ✅ | ❌ | ❌ | ❌ |
| **Layout konfigurieren** (marktspezifisch) | ✅ | ✅ (eigener Markt) | ❌ | ❌ |
| **Bezeichnungsregeln verwalten** (marktspezifisch) | ✅ | ✅ (eigener Markt) | ❌ | ❌ |
| **Warengruppen/Bloecke verwalten** (global: Namen, Regeln, Reihenfolge) | ✅ | ✅ | ❌ | ❌ |
| **Warengruppen sortieren / PLU-Zuordnung** (Markt-Overrides, Zuweisung) | ✅ | ✅ (eigener Markt) | ❌ | ❌ |
| **KW-Versionen verwalten** | ✅ | ❌ | ❌ | ❌ |
| **Firmen/Maerkte anlegen** | ✅ | ❌ | ❌ | ❌ |
| **Firmen/Maerkte pausieren/loeschen** | ✅ | ❌ | ❌ | ❌ |
| **Listen-Sichtbarkeit aendern (pro Markt)** | ✅ | ❌ | ❌ | ❌ |
| **Bereichs-Sichtbarkeit pro User** | ✅ | ✅ | ❌ | ❌ |
| **Markt-Zuordnung aendern** | ✅ | ✅ (nur eigene Maerkte) | ❌ | ❌ |
| **Testmodus starten** | ✅ | ✅ | ✅ | ❌ |

### Markt-Zugriff (Multi-Tenancy)

- Jeder User (ausser Super-Admin) ist ueber `user_store_access` einem oder mehreren Maerkten zugeordnet
- `is_home_store = true` markiert den Heimatmarkt
- Super-Admin hat globalen Zugriff auf alle Maerkte (kein user_store_access noetig)
- RLS-Policies filtern alle marktspezifischen Daten anhand des `store_id`
- Markt-Switcher im Header ermoeglicht Wechsel zwischen freigegebenen Maerkten

### Rollen-Beschreibung

**Super-Admin (Inhaber)** – `role: 'super_admin'`
- Hat vollen Zugriff auf alle Funktionen
- Darf Rollen tauschen (User/Admin/Viewer hoch- oder runterstufen), außer sich selbst
- Kann Admins, User und Viewer erstellen; sieht alle in der Benutzerverwaltung
- Verwaltet Upload, **globale** Blöcke/Versionen, marktspezifisches Layout/Regeln für jeden Markt, **zentrale Werbung** (Obst/Backshop getrennt, `/super-admin/central-werbung/...`)
- Es gibt nur einen Super-Admin

**Admin (Abteilungsleiter)** – `role: 'admin'`
- Sieht in der Benutzerverwaltung alle außer Super-Admin (User, Admin, Viewer)
- Darf für diese Passwort zurücksetzen und löschen; Rollen ändern (außer sich selbst)
- Kann **User, Admin und Viewer** anlegen
- Kann Märkte zuweisen (nur Märkte, auf die der Admin selbst Zugriff hat)
- Darf sich nicht selbst Bereiche wegnehmen
- PLU-Rechte wie User inkl. Master-Produkte umbenennen
- **Markt-Einstellungen:** Layout, Bezeichnungsregeln und Warengruppen-Sortierung (DnD) für den **aktuell gewählten Markt** unter `/admin/layout`, `/admin/rules`, `/admin/block-sort` (Backshop: `/admin/backshop-*`)
- Loggt sich mit **E-Mail-Adresse** ein

**User (Personal)** – `role: 'user'`
- Volle PLU-Funktionen: eigene Produkte, ausblenden, **Master-Produkte umbenennen**, PDF, Benachrichtigungen
- **Keine** Benutzerverwaltung (kein Zugriff auf andere Personen)
- Sieht nur die Bereiche (Obst/Gemüse, Backshop), die per `user_list_visibility` freigeschaltet sind
- Loggt sich mit **7-stelliger Personalnummer** oder E-Mail ein

**Viewer** – `role: 'viewer'`
- Nur PLU-Liste ansehen sowie PDF herunterladen oder drucken
- Keine Toolbar (keine Eigenen Produkte, Ausblenden, Umbenennen)
- Keine Benutzerverwaltung

## Login-Flows

### Super-Admin & Admin (Email-Login)

```
1. Login-Seite → Tab "Email"
2. E-Mail + Passwort eingeben
3. → supabase.auth.signInWithPassword()
4. → Profil laden → Rolle prüfen
5. → Weiterleitung zum entsprechenden Dashboard
```

### User (Personalnummer-Login)

```
1. Login-Seite → Tab "Personalnr."
2. Personalnummer + Passwort eingeben
3. → supabase.rpc('lookup_email_by_personalnummer')
4. → Mit gefundener Email: supabase.auth.signInWithPassword()
5. → Profil laden → Rolle prüfen
6. → Weiterleitung zum User Dashboard
```

## Einmalpasswort-System

### Neuen User anlegen

```
1. Admin/Super-Admin → Benutzerverwaltung → "Neuer Benutzer"
2. Name + Personalnummer/E-Mail eingeben
3. Admin und Super-Admin können Rolle wählen (User, Admin, Viewer)
4. System generiert 8-stelliges Einmalpasswort
5. Einmalpasswort wird dem Admin angezeigt (zum Weitergeben)
6. In der Datenbank: must_change_password = true
```

### Rolle ändern (Super-Admin und Admin)

```
1. Super-Admin oder Admin → Benutzerverwaltung → bei einer Person Rollen-Dropdown (User / Admin / Viewer)
2. Auswahl ändern → Edge Function update-user-role wird aufgerufen
3. Profile.role wird in der Datenbank aktualisiert
4. Weder Super-Admin noch Admin können sich selbst runterstufen
5. Admin kann nur Rollen von Benutzern derselben Firma ändern
```

### Erster Login des neuen Users

```
1. User gibt Personalnummer + Einmalpasswort ein
2. Login erfolgreich → System erkennt must_change_password = true
3. Redirect zu /change-password
4. User gibt 2x neues Passwort ein
5. Passwort wird in Supabase Auth geändert
6. must_change_password wird auf false gesetzt
7. Redirect zum User Dashboard
```

### Passwort zurücksetzen

**Für User (durch Admin/Super-Admin):**
```
1. Admin → Benutzerverwaltung → "Passwort" klicken
2. System generiert neues Einmalpasswort
3. Einmalpasswort wird dem Admin angezeigt
4. User muss beim nächsten Login neues Passwort vergeben
```

**Für Admin/Super-Admin (per E-Mail):**
```
1. Login-Seite → "Passwort vergessen?" klicken
2. E-Mail eingeben → Reset-Link wird per Mail gesendet
3. Link klicken → Neues Passwort setzen
```

## Routing nach Rolle

| Route | Zugang |
|-------|--------|
| `/login` | Öffentlich |
| `/change-password` | Alle eingeloggten User |
| `/user/*` | User (nicht Viewer) |
| `/viewer/*` | Nur Viewer |
| `/admin/*` | Admin + Super-Admin |
| `/super-admin/*` | Nur Super-Admin |

## Datenbank: Row Level Security (RLS)

Die Datenbank-Sicherheit wird durch PostgreSQL RLS Policies gewährleistet:

- `is_admin()` → gibt `true` für `super_admin` UND `admin`
- `is_super_admin()` → gibt `true` nur für `super_admin`
- Upload/Versionen/**globale** `blocks`-Definition (CRUD) → nur `is_super_admin()`; **marktspezifisches** `layout_settings`, `bezeichnungsregeln`, `store_*_block_order`, `store_*_name_block_override` → Super-Admin oder Admin mit `store_id = get_current_store_id()` (Migration 052)
- User-Verwaltung (Profile lesen) → `is_admin()`
- **profiles UPDATE:** User können nur das eigene Profil ändern; die Spalte `role` darf dabei nicht geändert werden (Migration 008 – verhindert Rollen-Eskalation).
- `custom_products` → alle lesen/einfügen; Ersteller oder Super-Admin updaten/löschen
- `hidden_items` / `backshop_hidden_items` → Lesen für zugewiesene Märkte (Super-Admin liest alle); **Schreiben** nur wenn `store_id = profiles.current_store_id` (Migration 028/031/049). **Super-Admin** hat in der App **keine** Buttons zum Aus-/Einblenden (`canManageMarketHiddenItems`); die Marktrollen (user/admin) verwalten die Liste.
- `version_notifications` → eigene lesen/updaten; Super-Admin einfügen
- `master_plu_items` (Umbenennen): Alle Rollen außer Viewer über RPC `rename_master_plu_item` / `reset_master_plu_item_display_name` (Prüfung: `is_not_viewer()`, Migration 037)
- `user_list_visibility`: User liest eigene Einträge; Admin/Super-Admin liest/schreibt alle im eigenen Markt (Migration 038)
- **stores / companies (anon):** Anonymes Lesen nur für Subdomain-Branding auf der Login-Seite (Migration 048). Anon darf aktive Stores mit Subdomain und deren Firmen lesen – Name, Logo für Markt-Branding.

Die **Seite Umbenannte Produkte** und der Dialog **„Produkte umbenennen“** sind für User, Admin und Super-Admin erreichbar. Der **Umbenennen-Button** in der Masterliste wird für alle Rollen außer Viewer angezeigt (auch unter `/admin/masterlist`). Die **Vergleichslogik** beim Excel-Upload verwendet weiterhin den ursprünglichen Namen (`system_name`), nicht den Anzeigenamen (`display_name`). **Excel** für eigene Produkte (Eigene Produkte-Seite) ist nur für Super-Admin sichtbar; **Excel zum Ausblenden** von PLUs und die übrigen Ausblend-Aktionen sind für **user/admin** am Markt vorgesehen, nicht für Super-Admin (siehe oben).
