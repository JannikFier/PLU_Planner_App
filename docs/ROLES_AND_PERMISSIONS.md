# Rollen & Berechtigungen

## Vier-Rollen-System

Der PLU Planner unterscheidet vier Rollen mit klar abgegrenzten Rechten.

### Rechte-Matrix

| Funktion | Super-Admin | Admin | User | Viewer |
|----------|:-----------:|:-----:|:----:|:------:|
| PLU-Liste ansehen | ✅ | ✅ | ✅ | ✅ |
| PDF exportieren / drucken | ✅ | ✅ | ✅ | ✅ |
| Eigene Produkte hinzufügen (global) | ✅ | ✅ | ✅ | ❌ |
| Produkte ausblenden (global) | ✅ | ✅ | ✅ | ❌ |
| Produkte wieder einblenden (global) | ✅ | ✅ | ✅ | ❌ |
| Benachrichtigungen (Glocke) | ✅ | ✅ | ✅ | ❌ |
| **Custom Product umbenennen** | ✅ (alle) | Nur eigene | Nur eigene | ❌ |
| **Master Product umbenennen** | ✅ | ✅ | ❌ | ❌ |
| **Benutzerverwaltung sehen** | ✅ | ✅ | ❌ | ❌ |
| **User/Admin/Viewer anlegen** | ✅ (Rolle wählbar) | ✅ (nur User) | ❌ | ❌ |
| **Passwort zurücksetzen** (alle außer Super-Admin) | ✅ | ✅ | ❌ | ❌ |
| **User/Admin/Viewer löschen** | ✅ | ✅ | ❌ | ❌ |
| **Rollen ändern (hoch-/runterstufen)** | ✅ | ❌ | ❌ | ❌ |
| **Excel (neue Produkte / ausblenden)** | ✅ | ❌ | ❌ | ❌ |
| **Excel Upload / KW-Vergleich** | ✅ | ❌ | ❌ | ❌ |
| **Layout konfigurieren** | ✅ | ❌ | ❌ | ❌ |
| **Bezeichnungsregeln verwalten** | ✅ | ❌ | ❌ | ❌ |
| **Warengruppen/Blöcke verwalten** | ✅ | ❌ | ❌ | ❌ |
| **KW-Versionen verwalten** | ✅ | ❌ | ❌ | ❌ |

### Rollen-Beschreibung

**Super-Admin (Inhaber)** – `role: 'super_admin'`
- Hat vollen Zugriff auf alle Funktionen
- Einziger, der Rollen tauschen darf (User/Admin/Viewer hoch- oder runterstufen)
- Kann Admins, User und Viewer erstellen; sieht alle in der Benutzerverwaltung
- Verwaltet Upload, Layout, Regeln, Versionen
- Es gibt nur einen Super-Admin

**Admin (Abteilungsleiter)** – `role: 'admin'`
- Sieht in der Benutzerverwaltung alle außer Super-Admin (User, Admin, Viewer)
- Darf für diese Passwort zurücksetzen und löschen; **kein** Rollen-Dropdown (nur Super-Admin ändert Rollen)
- Kann nur **User** anlegen (keine Admins/Viewer)
- PLU-Rechte wie User inkl. Master-Produkte umbenennen
- Loggt sich mit **E-Mail-Adresse** ein

**User (Personal)** – `role: 'user'`
- Volle PLU-Funktionen: eigene Produkte, ausblenden, umbenennen, PDF, Benachrichtigungen
- **Keine** Benutzerverwaltung (kein Zugriff auf andere Personen)
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
3. Nur Super-Admin kann Rolle wählen (User, Admin, Viewer); Admin legt immer nur User an
4. System generiert 8-stelliges Einmalpasswort
5. Einmalpasswort wird dem Admin angezeigt (zum Weitergeben)
6. In der Datenbank: must_change_password = true
```

### Rolle ändern (nur Super-Admin)

```
1. Super-Admin → Benutzerverwaltung → bei einer Person Rollen-Dropdown (User / Admin / Viewer)
2. Auswahl ändern → Edge Function update-user-role wird aufgerufen
3. Profile.role wird in der Datenbank aktualisiert
4. Super-Admin kann sich nicht selbst runterstufen
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
- Upload/Layout/Versionen/Blöcke/Regeln → nur `is_super_admin()`
- User-Verwaltung (Profile lesen) → `is_admin()`
- **profiles UPDATE:** User können nur das eigene Profil ändern; die Spalte `role` darf dabei nicht geändert werden (Migration 008 – verhindert Rollen-Eskalation).
- `custom_products` → alle lesen/einfügen; Ersteller oder Super-Admin updaten/löschen
- `hidden_items` → alle lesen/einfügen/löschen (jeder kann ein-/ausblenden)
- `version_notifications` → eigene lesen/updaten; Super-Admin einfügen
- `master_plu_items` (Umbenennen): Admin und Super-Admin über RPC-Funktionen `rename_master_plu_item` / `reset_master_plu_item_display_name` (nur display_name, is_manually_renamed)

Die **Seite Umbenannte Produkte** und der Dialog **„Produkte umbenennen“** sind nur für Admin und Super-Admin erreichbar (Routen `/admin/renamed-products`, `/super-admin/renamed-products`). Der **Umbenennen-Button** in der Masterliste wird für Admin und Super-Admin angezeigt (auch unter `/admin/masterlist`). Die **Vergleichslogik** beim Excel-Upload verwendet weiterhin den ursprünglichen Namen (`system_name`), nicht den Anzeigenamen (`display_name`). **Excel** (neue Produkte per Excel, Excel ausblenden) ist nur für Super-Admin sichtbar.
