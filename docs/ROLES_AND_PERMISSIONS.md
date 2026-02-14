# Rollen & Berechtigungen

## Drei-Rollen-System

Der PLU Planner unterscheidet drei Rollen mit klar abgegrenzten Rechten.

### Rechte-Matrix

| Funktion | Super-Admin | Admin | User |
|----------|:-----------:|:-----:|:----:|
| PLU-Liste ansehen | ✅ | ✅ | ✅ |
| Eigene Produkte hinzufügen (global) | ✅ | ✅ | ✅ |
| Produkte ausblenden (global) | ✅ | ✅ | ✅ |
| Produkte wieder einblenden (global) | ✅ | ✅ | ✅ |
| PDF exportieren | ✅ | ✅ | ✅ |
| Benachrichtigungen verwalten | ✅ | ✅ | ✅ |
| **Custom Product umbenennen** | ✅ (alle) | Nur eigene | Nur eigene |
| **Master Product umbenennen** | ✅ | ❌ | ❌ |
| **User (Personal) anlegen** | ✅ | ✅ | ❌ |
| **User-Passwörter zurücksetzen** | ✅ | ✅ | ❌ |
| **Admin anlegen** | ✅ | ❌ | ❌ |
| **Admin-Passwörter zurücksetzen** | ✅ | ❌ | ❌ |
| **Excel Upload / KW-Vergleich** | ✅ | ❌ | ❌ |
| **Layout konfigurieren** | ✅ | ❌ | ❌ |
| **Bezeichnungsregeln verwalten** | ✅ | ❌ | ❌ |
| **Warengruppen/Blöcke verwalten** | ✅ | ❌ | ❌ |
| **KW-Versionen verwalten** | ✅ | ❌ | ❌ |

### Rollen-Beschreibung

**Super-Admin (Inhaber)** – `role: 'super_admin'`
- Hat vollen Zugriff auf alle Funktionen
- Loggt sich mit **E-Mail-Adresse** ein
- Kann Admins und User erstellen
- Verwaltet Upload, Layout, Regeln, Versionen
- Es gibt nur einen Super-Admin

**Admin (Abteilungsleiter)** – `role: 'admin'`
- Kann PLU-Liste sehen und nutzen wie ein User
- Zusätzlich: Personal anlegen und Passwörter zurücksetzen
- Loggt sich mit **E-Mail-Adresse** ein
- Kann KEINE Admins erstellen, kein Upload, kein Layout

**User (Personal)** – `role: 'user'`
- Sieht die personalisierte PLU-Liste
- Kann eigene Produkte hinzufügen und Produkte ausblenden
- Loggt sich mit **7-stelliger Personalnummer** ein
- Hat keinen Zugriff auf Verwaltungsfunktionen

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
2. Name + Personalnummer eingeben (+ Rolle falls Super-Admin)
3. System generiert 8-stelliges Einmalpasswort
4. Einmalpasswort wird dem Admin angezeigt (zum Weitergeben)
5. In der Datenbank: must_change_password = true
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
| `/user/*` | Alle Rollen |
| `/admin/*` | Admin + Super-Admin |
| `/super-admin/*` | Nur Super-Admin |

## Datenbank: Row Level Security (RLS)

Die Datenbank-Sicherheit wird durch PostgreSQL RLS Policies gewährleistet:

- `is_admin()` → gibt `true` für `super_admin` UND `admin`
- `is_super_admin()` → gibt `true` nur für `super_admin`
- Upload/Layout/Versionen/Blöcke/Regeln → nur `is_super_admin()`
- User-Verwaltung (Profile lesen) → `is_admin()`
- `custom_products` → alle lesen/einfügen; Ersteller oder Super-Admin updaten/löschen
- `hidden_items` → alle lesen/einfügen/löschen (jeder kann ein-/ausblenden)
- `version_notifications` → eigene lesen/updaten; Super-Admin einfügen
- `master_plu_items.is_manually_renamed` → nur Super-Admin setzt dieses Flag
