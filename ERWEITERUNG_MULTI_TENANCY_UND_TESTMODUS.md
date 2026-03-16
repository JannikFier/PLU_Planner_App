# Erweiterung: Multi-Tenancy (Firma → Märkte) & Testmodus

Diese Datei beschreibt zwei neue Features, die in den bestehenden **PLU Planner** integriert werden sollen. Sie richtet sich an Cursor / einen KI-Assistenten, der die Umsetzung übernimmt. Die bestehende Architektur, Konventionen und der Tech-Stack (siehe `PROJEKT_UEBERSICHT_FUER_ERWEITERUNG.md`) gelten weiterhin – alles hier beschriebene **muss sich nahtlos integrieren**.

---

## Inhaltsverzeichnis

1. [Feature 1: Multi-Tenancy (Firma → Märkte)](#feature-1-multi-tenancy-firma--märkte)
   - 1.1 Überblick
   - 1.2 Datenmodell
   - 1.3 Subdomain-Logik
   - 1.4 User-Zugehörigkeit & Zugriff
   - 1.5 Rollen & Rechte
   - 1.6 Listen-Sichtbarkeit
   - 1.7 Nationale vs. marktspezifische Daten
   - 1.8 Superadmin-Dashboard & Navigation
   - 1.9 Firma anlegen (Flow)
   - 1.10 Markt anlegen (Flow)
   - 1.11 Firma/Markt pausieren & löschen
   - 1.12 Firma/Markt bearbeiten
   - 1.13 Branding / Login-Seite
   - 1.14 Login-Redirect-Logik (falscher Markt / pausierter Markt / admin.domain.de)
   - 1.15 Markt-Switcher (User-Sicht)
   - 1.16 Aktueller Markt in der Navigation
   - 1.17 Admin-Sicht: User-Verwaltung
   - 1.18 Migration bestehender Daten
   - 1.19 Datenbank-Änderungen (Übersicht)
   - 1.20 RLS-Anpassungen
   - 1.21 Edge Functions anpassen
   - 1.22 Frontend-Änderungen (Übersicht)
   - 1.23 Lokale Entwicklung (Subdomains auf localhost)
2. [Feature 2: Testmodus](#feature-2-testmodus)
   - 2.1 Überblick
   - 2.2 Aktivierung & UI
   - 2.3 Technische Umsetzung
   - 2.4 Verhalten im Detail
   - 2.5 Bestätigungsdialog
   - 2.6 Frontend-Änderungen (Übersicht)
3. [Feature 3: Onboarding-Tour (Platzhalter)](#feature-3-onboarding-tour-platzhalter)
4. [Umsetzungsreihenfolge](#umsetzungsreihenfolge)
5. [Checkliste](#checkliste)

---

## Feature 1: Multi-Tenancy (Firma → Märkte)

### 1.1 Überblick

Das System wird von einer Einzel-Instanz auf eine **Multi-Tenant-Architektur** umgebaut:

```
Superadmin (admin.domain.de)
  └── Firma A
  │     ├── Markt 1 (angerbogen.domain.de) ← Standard-Markt, automatisch beim Firma-Anlegen erstellt
  │     ├── Markt 2 (invedo.domain.de)
  │     └── Markt 3 (city-center.domain.de)
  └── Firma B
        └── Markt 1 (bergkamen.domain.de) ← Standard-Markt, einziger Markt
```

**Kernregeln:**
- Jede Firma hat **immer mindestens einen Markt**. Auch bei Firmen mit nur einem Standort existiert immer eine Firma → Markt Beziehung. Es gibt **keine Sonderfälle** für Firmen ohne Markt.
- Jeder **Markt** (nicht die Firma) bekommt eine eigene **Subdomain**: `{subdomain}.domain.de`
- Die Firma ist eine organisatorische Ebene im Hintergrund (für den Superadmin), aber in der URL für den User **nicht sichtbar**.
- Der Superadmin arbeitet über `admin.domain.de`.

### 1.2 Datenmodell

#### Neue Tabellen

```sql
-- Firmen
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,                    -- Firmenlogo (Supabase Storage), dient als Fallback wenn Markt kein eigenes Logo hat
  is_active BOOLEAN DEFAULT true,   -- false = Firma pausiert, kein Login möglich für alle Märkte
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Märkte
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subdomain TEXT NOT NULL UNIQUE,   -- z.B. "angerbogen" → angerbogen.domain.de
  logo_url TEXT,                    -- optionales Markt-Logo (Supabase Storage); wenn NULL → Firma-Logo als Fallback
  is_active BOOLEAN DEFAULT true,   -- false = Markt pausiert, kein Login möglich für diesen Markt
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Welcher User hat Zugriff auf welchen Markt
CREATE TABLE user_store_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  is_home_store BOOLEAN DEFAULT false,  -- Heimatmarkt (genau einer pro User)
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, store_id)
);

-- Constraint: Genau ein Heimatmarkt pro User (Partial Unique Index)
CREATE UNIQUE INDEX idx_one_home_store_per_user
  ON user_store_access (user_id) WHERE is_home_store = true;

-- Welche Listen sieht ein Markt
CREATE TABLE store_list_visibility (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  list_type TEXT NOT NULL,  -- z.B. 'obst_gemuese', 'backshop'
  is_visible BOOLEAN DEFAULT true,
  UNIQUE(store_id, list_type)
);
```

#### Bestehende Tabellen anpassen

Alle marktspezifischen Tabellen (also fast alles) bekommen eine `store_id` Spalte:

```sql
-- Beispiel: Bestehende Tabellen erweitern
ALTER TABLE custom_products ADD COLUMN store_id UUID REFERENCES stores(id);
ALTER TABLE user_product_settings ADD COLUMN store_id UUID REFERENCES stores(id);
ALTER TABLE user_backshop_settings ADD COLUMN store_id UUID REFERENCES stores(id);
-- ... alle weiteren marktspezifischen Tabellen analog
```

**Wichtig:** Die genaue Liste der zu ändernden Tabellen ergibt sich aus der bestehenden `DATABASE.md` und den Migrations. Jede Tabelle die nutzerspezifische Daten enthält (eigene Produkte, Umbenennungen, Ausblendungen, Warengruppen-Zuordnungen, etc.) muss um `store_id` erweitert werden.

**Migration-Reihenfolge für `store_id`:**
1. Spalte als **nullable** hinzufügen: `ALTER TABLE xyz ADD COLUMN store_id UUID REFERENCES stores(id);`
2. Bestehende Daten migrieren: `UPDATE xyz SET store_id = <standard_store_id>;`
3. Spalte auf **NOT NULL** setzen: `ALTER TABLE xyz ALTER COLUMN store_id SET NOT NULL;`

#### Profiles-Tabelle erweitern

```sql
ALTER TABLE profiles ADD COLUMN current_store_id UUID REFERENCES stores(id);
```

Dieses Feld speichert den **aktuell ausgewählten Markt** des Users. Wird beim Login auf den Heimatmarkt gesetzt.

### 1.3 Subdomain-Logik

**Subdomain = pro Markt** (NICHT pro Firma). Jeder Markt hat eine eigene, frei wählbare Subdomain.

| URL | Wer nutzt sie |
|-----|---------------|
| `admin.domain.de` | Superadmin – Zugriff auf alle Firmen und Märkte |
| `angerbogen.domain.de` | User/Admin/Viewer des Marktes "Angerbogen" |
| `invedo.domain.de` | User/Admin/Viewer des Marktes "Invedo" |

**Technische Umsetzung:**

```
Frontend (Vercel):
  1. Wildcard-Domain konfigurieren: *.domain.de
  2. Beim App-Start: Subdomain aus window.location.hostname extrahieren
  3. Sonderfall "admin" → Superadmin-Modus (kein Markt-Kontext, voller Zugriff)
  4. Andere Subdomains: gegen `stores.subdomain` matchen → store_id + company_id ermitteln
  5. Store-ID im App-Context (StoreProvider) setzen
  6. Alle Queries filtern nach store_id
  7. Ungültige Subdomain → Fehlerseite ("Dieser Markt existiert nicht")
```

**Subdomain-Regeln:**
- Nur Kleinbuchstaben, Zahlen und Bindestriche erlaubt
- Muss mit einem Buchstaben beginnen
- Reservierte Subdomains: `admin`, `app`, `api`, `www`, `mail` (können nicht für Märkte vergeben werden)
- Beim Anlegen eines Marktes wird aus dem Marktnamen automatisch ein Vorschlag generiert (z.B. "Markt Angerbogen" → `angerbogen`), den der Superadmin aber frei ändern kann
- Eindeutigkeits-Check gegen die DB bevor gespeichert wird
- Eine Umzugsphase mit parallelen Subdomains ist nicht vorgesehen. Wenn eine Subdomain geändert wird, funktionieren bestehende Links und Bookmarks nicht mehr. Das UI zeigt vor dem Speichern eine deutliche Warnung an.

### 1.4 User-Zugehörigkeit & Zugriff

- Jeder User gehört zu genau **einem Heimatmarkt** (`is_home_store = true` in `user_store_access`)
- Ein User kann Zugriff auf **weitere Märkte** bekommen (weitere Einträge in `user_store_access`)
- Die weiteren Märkte können auch zu **anderen Firmen** gehören (kein technisches Limit, da Subdomains marktbezogen sind)
- Beim Login wird automatisch der **Heimatmarkt** als aktiver Markt gesetzt (`profiles.current_store_id`)
- **Super-Admins** haben **keinen** Heimatmarkt und keinen Eintrag in `user_store_access`. Sie arbeiten über `admin.domain.de` und haben über RLS-Policies Zugriff auf alle Daten.
- **Admins** können einem User nur Märkte zuweisen, auf die sie **selbst** Zugriff haben. Die Edge Function `update-user-store-access` muss das prüfen.

### 1.5 Rollen & Rechte

Die vier bestehenden Rollen bleiben **unverändert**: `super_admin`, `admin`, `user`, `viewer`.

**Rollen sind global** – ein User hat überall dieselbe Rolle. Wenn ein User Zugriff auf mehrere Märkte hat, ist er in jedem Markt ein "User" (oder "Viewer", je nach seiner Rolle in `profiles.role`).

| Rolle | Firma/Markt-Rechte |
|-------|-------------------|
| `super_admin` | Sieht und verwaltet **alles**: alle Firmen, alle Märkte, alle User. Arbeitet über `admin.domain.de`. |
| `admin` | Verwaltet User aller Märkte auf die er Zugriff hat. Sieht User mit Kennzeichnung zu welchem Markt sie gehören. |
| `user` | Arbeitet in seinem aktiven Markt. Kann zwischen freigegebenen Märkten wechseln. Kann in jedem Markt Daten bearbeiten. |
| `viewer` | Kann in freigegebenen Märkten die Daten einsehen (nur lesen). |

### 1.6 Listen-Sichtbarkeit

Die Sichtbarkeit von Listen wird **pro Markt** gesteuert über die Tabelle `store_list_visibility`.

- Der Superadmin stellt pro Markt ein, welche Listen sichtbar sind
- Aktuell gibt es zwei Listentypen: `obst_gemuese` und `backshop`
- Wenn ein Markt z.B. keinen Backshop hat, sieht er die Backshop-Liste nicht
- Die Einstellung erfolgt auf der Markt-Detailseite im Superadmin-Bereich
- **Standardwert beim Anlegen:** Alle Listen sichtbar (kann danach angepasst werden)

**Im Frontend:** Vor dem Rendern einer Liste prüfen ob `store_list_visibility` für den aktuellen Markt und den Listentyp `is_visible = true` ist. Nicht sichtbare Listen tauchen weder in der Navigation noch auf dem Dashboard auf.

### 1.7 Nationale vs. marktspezifische Daten

| Daten | Scope | Erklärung |
|-------|-------|-----------|
| **PLU-Listen Upload** (Obst/Gemüse) | 🌍 National | Superadmin lädt einmal hoch, Daten sind für alle Märkte verfügbar |
| **PLU-Listen Upload** (Backshop) | 🌍 National | Superadmin lädt einmal hoch, Daten sind für alle Märkte verfügbar |
| **Initiale Warengruppen-Zuordnung** (Backshop) | 🌍 National | Beim Upload vom Superadmin gesetzte Zuordnung gilt als Standard |
| **Warengruppen-Änderung durch User** | 🏪 Marktspezifisch | User ändert nur für seinen Markt, nicht für alle |
| **Eigene Produkte** | 🏪 Marktspezifisch | Pro Markt eigene Produkte |
| **Produkt-Umbenennungen** | 🏪 Marktspezifisch | Pro Markt eigene Umbenennungen |
| **Ausgeblendete Produkte** | 🏪 Marktspezifisch | Pro Markt eigene Ausblendungen |
| **PDF-Export** | 🏪 Marktspezifisch | Export enthält die marktspezifische Ansicht |
| **Alle weiteren User-Einstellungen** | 🏪 Marktspezifisch | Alles was ein User anpasst, gilt für seinen aktuellen Markt |

### 1.8 Superadmin-Dashboard & Navigation

Das Superadmin-Dashboard wird umgebaut. Der Superadmin arbeitet über `admin.domain.de`.

Neue Seitenstruktur:

```
/super-admin                          → Dashboard mit zwei Karten:
  ├── Karte "Upload"                  → /super-admin/upload
  │     ├── Obst & Gemüse Upload      → /super-admin/upload/obst-gemuese
  │     └── Backshop Upload            → /super-admin/upload/backshop
  │
  └── Karte "Firmen"                  → /super-admin/companies
        ├── Firmenliste + Button "Neue Firma anlegen"
        └── Klick auf Firma            → /super-admin/companies/:companyId
              ├── Märkte dieser Firma + Button "Neuer Markt"
              ├── Firmen-Einstellungen (Logo ändern, Name ändern)
              └── Klick auf Markt      → /super-admin/companies/:companyId/stores/:storeId
                    ├── Markt-Einstellungen (Listen-Sichtbarkeit, Subdomain, Logo)
                    ├── Markt-Link (Subdomain-URL) – kopierbar
                    ├── User dieses Marktes
                    └── Marktspezifische Daten (eigene Produkte, Listen-Ansicht, etc.)
```

**Wichtig:** Die Upload-Seiten bleiben **national** – sie haben keinen Markt-Kontext. Die hochgeladenen Daten gelten für alle Märkte.

### 1.9 Firma anlegen (Flow)

Wenn der Superadmin eine neue Firma anlegt, werden folgende Angaben in **einem Schritt** abgefragt:

| Feld | Pflicht | Beschreibung |
|------|---------|-------------|
| Firmenname | ✅ | z.B. "Friedrich Tonscheidt KG" |
| Erster Marktname | ✅ | z.B. "Angerbogen" – wird als Standard-Markt angelegt |
| Markt-Subdomain | ✅ | Wird automatisch aus Marktname vorgeschlagen (z.B. "angerbogen"), frei änderbar. Nur Kleinbuchstaben, Zahlen, Bindestriche. |
| Firmenlogo | ❌ | Optionaler Upload eines Firmenlogos (gilt als Fallback für alle Märkte ohne eigenes Logo) |
| Markt-Logo | ❌ | Optionaler Upload eines Markt-Logos (wenn nicht gesetzt → Firmenlogo als Fallback) |

Nach dem Anlegen:
1. Firma wird erstellt
2. Standard-Markt wird automatisch erstellt mit eigener Subdomain
3. `store_list_visibility` wird mit Standardwerten angelegt (alle Listen sichtbar)
4. Der Superadmin sieht den fertigen **Markt-Link** (z.B. `angerbogen.domain.de`) den er kopieren und weitergeben kann

**Logo-Upload Details:**
- **Supabase Storage Bucket:** `logos`
- **Pfadstruktur:** `companies/{company_id}/logo.{ext}` bzw. `stores/{store_id}/logo.{ext}`
- **Erlaubte Formate:** JPG, PNG, WebP, SVG
- **Max. Dateigröße:** 2 MB
- **Fallback-Kette für Anzeige:** Markt-Logo → Firmenlogo → kein Logo (nur Text)
- **Reusable Helper:** `getStoreLogoUrl(store, company)` in `src/lib/` – implementiert die Fallback-Kette

### 1.10 Markt anlegen (Flow)

Wenn der Superadmin einer **bestehenden Firma** einen weiteren Markt hinzufügt:

| Feld | Pflicht | Beschreibung |
|------|---------|-------------|
| Marktname | ✅ | z.B. "Invedo" |
| Subdomain | ✅ | Wird automatisch aus Marktname vorgeschlagen (z.B. "invedo"), frei änderbar. Eindeutigkeits-Check gegen DB. |
| Markt-Logo | ❌ | Optionaler Upload. Wenn nicht gesetzt → Firmenlogo als Fallback. |

Nach dem Anlegen:
1. Markt wird erstellt und der Firma zugeordnet
2. `store_list_visibility` wird mit Standardwerten angelegt (alle Listen sichtbar)
3. Der Superadmin sieht den fertigen **Markt-Link** (z.B. `invedo.domain.de`)

### 1.11 Firma/Markt pausieren & löschen

#### Pausieren (Deaktivieren)

Der Superadmin kann eine **Firma** oder einen einzelnen **Markt** pausieren (`is_active = false`):

- **Markt pausieren:** Kein User dieses Marktes kann sich mehr über die Markt-Subdomain anmelden. Login-Seite zeigt: "Dieser Markt ist derzeit nicht verfügbar." User die den Markt als Zusatz-Markt haben, sehen ihn nicht mehr im Switcher. User deren **Heimatmarkt** pausiert ist, werden beim Login zu einem anderen freigegebenen Markt redirectet – haben sie keinen, sehen sie eine Meldung "Dein Markt ist derzeit nicht verfügbar. Bitte wende dich an deinen Administrator."
- **Firma pausieren:** Alle Märkte dieser Firma werden automatisch pausiert. Gleiche Logik wie oben für jeden einzelnen Markt.
- **Reaktivieren:** Superadmin kann jederzeit wieder auf `is_active = true` setzen. Alles funktioniert sofort wieder.

**Im Superadmin-UI:** Auf der Markt-/Firmen-Detailseite ein Toggle "Aktiv" / "Pausiert" mit Bestätigungsdialog.

#### Löschen

Der Superadmin kann eine Firma oder einen Markt **endgültig löschen**:

- **Warnung:** Deutlicher Bestätigungsdialog: "Alle Daten, User-Zuordnungen und Einstellungen dieses Marktes werden unwiderruflich gelöscht. Diese Aktion kann nicht rückgängig gemacht werden."
- **Texteingabe zur Bestätigung:** Der Superadmin muss den Marktnamen eintippen um zu bestätigen (verhindert versehentliches Löschen).
- **CASCADE:** Alle marktspezifischen Daten werden per `ON DELETE CASCADE` gelöscht (custom_products, user_product_settings, etc.).
- **User-Zuordnungen:** `user_store_access`-Einträge werden per CASCADE gelöscht. Wenn der gelöschte Markt der Heimatmarkt eines Users war:
  - Hat der User noch andere Märkte → der älteste verbleibende Markt (nach `created_at`) wird neuer Heimatmarkt
  - Hat der User keine Märkte mehr → `current_store_id` wird NULL, User kann sich nicht anmelden und sieht "Kein Markt zugewiesen. Bitte wende dich an deinen Administrator."
- **Firma löschen:** Löscht auch alle Märkte der Firma (CASCADE). Gleiche Regeln.
- **Reihenfolge empfohlen:** Erst Markt pausieren → User umziehen → dann löschen. So gehen keine User verloren.

### 1.12 Firma/Markt bearbeiten

Auf der jeweiligen Detailseite im Superadmin-Bereich:

**Firma bearbeiten:**
- Firmenname ändern
- Firmenlogo ändern / entfernen

**Markt bearbeiten:**
- Marktname ändern
- Markt-Logo ändern / entfernen
- **Subdomain ändern:** Erlaubt, aber mit deutlicher Warnung: "Wenn du die Subdomain änderst, funktionieren alle bestehenden Links und Bookmarks nicht mehr." Gleiche Validierungsregeln wie beim Anlegen (Kleinbuchstaben, Zahlen, Bindestriche, Eindeutigkeit, keine reservierten).
- Listen-Sichtbarkeit ändern (Backshop ja/nein, Obst/Gemüse ja/nein)
- Markt pausieren / reaktivieren

### 1.13 Branding / Login-Seite

Die Login-Seite passt sich an die **Markt-Subdomain** an:

- **Marktname** wird auf der Login-Seite angezeigt
- **Logo:** Markt-Logo wird angezeigt. Wenn kein Markt-Logo vorhanden → Firmenlogo. Wenn keins → kein Logo (nur Marktname).
- Die Login-Funktionalität bleibt identisch (E-Mail oder Personalnummer)

**Technisch:**
1. Beim Laden der Login-Seite: Subdomain extrahieren
2. `stores`-Tabelle abfragen: Name, Logo, company_id
3. Falls Markt-Logo NULL → `companies`-Tabelle abfragen: Logo
4. Marktname + Logo auf der Login-Seite anzeigen
5. Ungültige Subdomain → Fehlerseite ("Dieser Markt existiert nicht")

**Für `admin.domain.de`:** Login-Seite zeigt generisches PLU Planner Branding (kein Markt-spezifisches Logo/Name).

### 1.14 Login-Redirect-Logik (falscher Markt / pausierter Markt / admin.domain.de)

Wenn ein User sich über eine Markt-Subdomain einloggt, für die er **keinen Zugriff** hat:

```
Beispiel:
  User "Max" hat nur Zugriff auf Markt "Invedo" (invedo.domain.de)
  Max ruft angerbogen.domain.de auf und loggt sich ein

Ablauf:
  1. Login-Seite zeigt "Angerbogen" Branding → Max kann sich ganz normal einloggen
  2. Auth ist erfolgreich → System prüft: Hat Max Zugriff auf diesen Markt?
  3. Nein → System ermittelt Max' Heimatmarkt (Invedo)
  4. Redirect zu invedo.domain.de (mit gültiger Session)
  5. Toast-Hinweis: "Du wurdest zu deinem Markt weitergeleitet"
```

**Wichtig:** Der Login funktioniert **immer**, egal über welche Subdomain. Die Auth ist global (Supabase Auth ist nicht marktgebunden). Erst nach dem Login wird geprüft ob der User Zugriff auf den Markt der Subdomain hat.

**Sonderfälle:**
- User hat Zugriff auf den Markt der Subdomain → bleibt dort, alles normal
- User hat keinen Zugriff → Redirect zum Heimatmarkt (andere Subdomain)
- User hat Zugriff auf mehrere Märkte inkl. dem der Subdomain → bleibt dort, `current_store_id` wird auf diesen Markt gesetzt
- Superadmin loggt sich über eine Markt-Subdomain ein → Redirect zu `admin.domain.de`
- **Pausierter Markt:** User loggt sich auf einem pausierten Markt ein → Login-Seite zeigt: "Dieser Markt ist derzeit nicht verfügbar." Login wird **blockiert** (kein Auth-Versuch). Ist der User bereits eingeloggt und der Markt wird währenddessen pausiert → beim nächsten API-Call oder Reload wird er auf seinen Heimatmarkt redirected (falls aktiv) oder sieht eine Info-Seite.
- **Pausierte Firma:** Alle Märkte dieser Firma zeigen "Nicht verfügbar". Gleiche Logik.
- **Nicht-Superadmin auf `admin.domain.de`:** Login ist möglich, aber nach dem Login wird geprüft: Rolle = `super_admin`? Falls nein → Redirect zum Heimatmarkt des Users. Falls der User kein Superadmin ist, soll er `admin.domain.de` nicht nutzen können.

### 1.15 Markt-Switcher (User-Sicht)

Wenn ein User Zugriff auf **mehrere Märkte** hat:

1. **Dashboard:** Beim Öffnen des Dashboards sieht der User eine Markt-Auswahl (wenn mehrere vorhanden). Bei nur einem Markt → direkt zum Dashboard, keine Auswahl.
2. **Profil-Menü:** Im Profil-Dropdown gibt es einen "Markt wechseln"-Eintrag. Dort sieht der User alle seine freigegebenen Märkte und kann wechseln.
3. **Nach dem Wechsel:** Der Browser wird zur **Subdomain des neuen Marktes** weitergeleitet (z.B. von `angerbogen.domain.de` zu `invedo.domain.de`). Die Session bleibt erhalten (Supabase Auth ist domainübergreifend). `profiles.current_store_id` wird aktualisiert.

**Wenn der User nur einen Markt hat:** Kein Markt-Switcher sichtbar, kein Auswahl-Dialog. Alles wie bisher.

**Technischer Hinweis zum Redirect:** Da die Session über Supabase Auth läuft und die Cookies für `*.domain.de` gelten (Wildcard), bleibt der User beim Subdomain-Wechsel eingeloggt. Sicherstellen dass Supabase Auth Cookies für die Wildcard-Domain gesetzt werden.

### 1.16 Aktueller Markt in der Navigation

Der User soll immer wissen, in welchem Markt er sich gerade befindet:

- **Im Header:** Der **Marktname** wird dezent im Header angezeigt (z.B. neben dem App-Logo oder als kleiner Text unter dem Logo). Bei nur einem Markt trotzdem anzeigen – dient der Klarheit.
- **Auf dem Dashboard:** Der aktive Markt wird als Überschrift oder Info-Badge auf dem Dashboard angezeigt.
- **Beim Markt-Wechsel:** Nach dem Redirect zur neuen Subdomain zeigt der Header sofort den neuen Marktnamen.

### 1.17 Admin-Sicht: User-Verwaltung

Der Admin verwaltet User wie bisher (Superadmin + Admin können User verwalten). Neu:

- Die User-Übersicht zeigt eine **Markt-Spalte** und einen **Markt-Filter** an
- Der Admin sieht alle User aller Märkte auf die er selbst Zugriff hat
- Beim Anlegen eines neuen Users muss ein **Heimatmarkt** zugewiesen werden (Dropdown mit den Märkten auf die der Admin Zugriff hat)
- Optional können weitere Märkte freigeschaltet werden (Multi-Select)
- In der User-Liste ist klar erkennbar: Heimatmarkt (fett/markiert) vs. zusätzliche Märkte

### 1.18 Migration bestehender Daten

Beim Deployment der Multi-Tenancy-Änderungen wird automatisch migriert:

```sql
-- Migration (Pseudocode):

-- 1. Standard-Firma anlegen
INSERT INTO companies (name, logo_url) VALUES ('Standard', NULL);

-- 2. Standard-Markt anlegen (mit Subdomain)
INSERT INTO stores (company_id, name, subdomain, logo_url)
VALUES (<standard_company_id>, 'Standard-Markt', 'standard', NULL);

-- 3. Alle bestehenden User dem Standard-Markt zuordnen
INSERT INTO user_store_access (user_id, store_id, is_home_store)
SELECT id, <standard_store_id>, true FROM auth.users
WHERE id NOT IN (SELECT id FROM profiles WHERE role = 'super_admin');
-- Super-Admins werden NICHT einem Markt zugeordnet (arbeiten über admin.domain.de)

-- 4. Alle bestehenden marktspezifischen Daten dem Standard-Markt zuordnen
UPDATE custom_products SET store_id = <standard_store_id>;
UPDATE user_product_settings SET store_id = <standard_store_id>;
-- ... alle weiteren Tabellen

-- 5. Listen-Sichtbarkeit für Standard-Markt setzen (alles sichtbar)
INSERT INTO store_list_visibility (store_id, list_type, is_visible) VALUES
  (<standard_store_id>, 'obst_gemuese', true),
  (<standard_store_id>, 'backshop', true);

-- 6. current_store_id für alle Profile setzen (außer Super-Admins)
UPDATE profiles SET current_store_id = <standard_store_id>
WHERE role != 'super_admin';
```

**Ergebnis:** Alles funktioniert sofort wie bisher. Alle Daten sind der Standard-Firma und dem Standard-Markt zugeordnet. Der Superadmin kann dann in Ruhe die Struktur anpassen (Firma umbenennen, Markt umbenennen, Subdomain anpassen, weitere Firmen/Märkte anlegen).

### 1.19 Datenbank-Änderungen (Übersicht)

| Aktion | Details |
|--------|---------|
| **Neue Tabellen** | `companies` (mit `is_active`), `stores` (mit `subdomain`, `logo_url`, `is_active`), `user_store_access` (mit Partial Unique Index für `is_home_store`), `store_list_visibility` |
| **Erweiterte Tabellen** | Alle marktspezifischen Tabellen + `store_id` Spalte (siehe DATABASE.md für die genaue Liste) |
| **Erweiterte Profiles** | `current_store_id` Spalte hinzufügen |
| **Neue DB-Funktionen** | `get_user_store_ids()`, `get_current_store_id()`, `get_store_company_id(store_id)`, `get_home_store_subdomain(user_id)` |
| **Migration** | Nummeriert nach bestehenden Migrations, mit automatischer Zuordnung bestehender Daten |

### 1.20 RLS-Anpassungen

Alle bestehenden RLS-Policies müssen angepasst werden, um den **Markt-Kontext** zu berücksichtigen:

```sql
-- Beispiel: User sieht nur Daten der Märkte auf die er Zugriff hat
CREATE POLICY "users_see_own_store_data" ON custom_products
  FOR SELECT USING (
    store_id IN (
      SELECT store_id FROM user_store_access WHERE user_id = auth.uid()
    )
  );

-- Beispiel: User kann nur in seinem aktuell aktiven Markt schreiben
CREATE POLICY "users_write_current_store_data" ON custom_products
  FOR INSERT WITH CHECK (
    store_id = (SELECT current_store_id FROM profiles WHERE id = auth.uid())
  );

-- Beispiel: Super-Admin kann alles lesen
CREATE POLICY "super_admin_read_all" ON custom_products
  FOR SELECT USING (is_super_admin());

-- Beispiel: Neue Tabellen – nur Super-Admin kann Firmen verwalten
CREATE POLICY "super_admin_manage_companies" ON companies
  FOR ALL USING (is_super_admin());

-- Beispiel: Stores – Super-Admin kann alles, andere sehen nur ihre aktiven Märkte
CREATE POLICY "users_see_own_stores" ON stores
  FOR SELECT USING (
    is_super_admin() OR (
      is_active = true AND id IN (
        SELECT store_id FROM user_store_access WHERE user_id = auth.uid()
      )
    )
  );

-- Beispiel: is_active-Prüfung bei Datenzugriff
-- User sieht nur Daten von AKTIVEN Märkten
CREATE POLICY "users_see_active_store_data" ON custom_products
  FOR SELECT USING (
    is_super_admin() OR (
      store_id IN (
        SELECT usa.store_id FROM user_store_access usa
        JOIN stores s ON s.id = usa.store_id
        WHERE usa.user_id = auth.uid() AND s.is_active = true
      )
    )
  );
```

**Wichtig:** Nationale Daten (PLU-Versionen, die hochgeladenen Listen selbst) brauchen **keine** `store_id` – die bleiben wie sie sind. Nur die marktspezifischen Ableitungen (User-Einstellungen, eigene Produkte, etc.) werden gefiltert.

### 1.21 Edge Functions anpassen

Die bestehenden Edge Functions müssen um den Markt-Kontext erweitert werden:

| Edge Function | Änderung |
|---------------|----------|
| `create-user` | Neuer Parameter `home_store_id` (Pflicht) + optionaler Parameter `additional_store_ids` (Array). Beim Erstellen des Users wird automatisch `user_store_access` befüllt und `profiles.current_store_id` gesetzt. |
| `reset-password` | Keine Änderung nötig (Auth ist global, nicht marktgebunden). |
| `delete-user` | Muss auch `user_store_access`-Einträge löschen (CASCADE sollte das automatisch machen, trotzdem prüfen). |
| `update-user-role` | Keine Änderung nötig (Rolle ist global). |
| **Neu: `update-user-store-access`** | Neue Edge Function: Märkte eines Users hinzufügen/entfernen, Heimatmarkt ändern. Nur aufrufbar von Admin + Super-Admin. |

### 1.22 Frontend-Änderungen (Übersicht)

| Bereich | Änderung |
|---------|----------|
| **Neuer Context** | `StoreProvider` – hält die aktuelle `store_id` (aus Subdomain) und `company_id`. **Ausnahme** zur "kein neuer Context"-Regel, weil Tenant-Info analog zu Auth überall gebraucht wird. Stellt bereit: `currentStoreId`, `currentCompanyId`, `isAdminDomain` (boolean für admin.domain.de), `storeName`, `storeLogo`. |
| **Hooks** | Alle bestehenden Hooks die Daten laden, müssen `store_id` als Parameter/Filter berücksichtigen. Neue Hooks: `useCompanies`, `useStores`, `useStoreAccess`, `useStoreListVisibility`, `useCurrentStore`. |
| **QueryKeys** | Alle bestehenden QueryKeys erweitern um `store_id`, z.B. `['custom-products', storeId]` statt `['custom-products']`. |
| **Routing** | Neue Routen für Superadmin (siehe 1.8). Bestehende Routen bleiben gleich, arbeiten aber mit dem aktiven Markt-Kontext. |
| **Seiten** | Neues Superadmin-Dashboard, Firmen-Übersicht, Firmen-Detail, Markt-Detail, Markt-Auswahl. Bestehende Seiten: Markt-Info im Profil-Dropdown. |
| **Login-Seite** | Subdomain auslesen → Markt-Branding (Logo, Name) anzeigen. Logo-Fallback: Markt-Logo → Firmenlogo → kein Logo. Pausierter Markt → "Nicht verfügbar"-Meldung. |
| **Login-Redirect** | Nach Auth prüfen ob User Zugriff auf den Markt der Subdomain hat. Falls nein → Redirect zum Heimatmarkt (andere Subdomain) + Toast. Nicht-Superadmin auf admin.domain.de → Redirect zum Heimatmarkt. |
| **Markt-Switcher** | Im Profil-Dropdown + auf Dashboard (bei mehreren Märkten). Wechsel = Redirect zur Subdomain des neuen Marktes. Im Testmodus: erst Testmodus-Dialog, dann Wechsel. |
| **Header** | Marktname im Header anzeigen (immer sichtbar, auch bei nur einem Markt). |
| **Persist-Allowlist** | Neue QueryKey-Präfixe für `companies`, `stores`, `store-access`, `store-list-visibility` eintragen. |
| **Supabase Auth Cookies** | Sicherstellen dass Auth-Cookies für `*.domain.de` gesetzt werden (Wildcard), damit Subdomain-Wechsel ohne erneuten Login funktioniert. |

### 1.23 Lokale Entwicklung (Subdomains auf localhost)

Damit die Subdomain-Logik auch lokal funktioniert:

**Empfohlener Ansatz:**
1. **`/etc/hosts` (macOS/Linux) bzw. `C:\Windows\System32\drivers\etc\hosts` (Windows):**
   ```
   127.0.0.1  admin.localhost
   127.0.0.1  standard.localhost
   127.0.0.1  angerbogen.localhost
   127.0.0.1  invedo.localhost
   ```
2. **Vite-Config** (`vite.config.ts`): `server: { host: true }` damit Vite auf allen Interfaces lauscht.
3. **Subdomain-Erkennung:** Die Funktion die die Subdomain extrahiert muss sowohl `angerbogen.domain.de` als auch `angerbogen.localhost:5173` unterstützen.
4. **Umgebungsvariable:** `VITE_APP_DOMAIN` (z.B. `domain.de` in Produktion, `localhost:5173` in Dev). Die Subdomain wird relativ dazu extrahiert.

**Alternativ:** Im Dev-Modus kann ein URL-Parameter `?store=angerbogen` als Override dienen, damit man nicht für jeden Test die Hosts-Datei anpassen muss. Dieser Override soll **nur** im Dev-Modus funktionieren (prüfen via `import.meta.env.DEV`).

---

## Feature 2: Testmodus

### 2.1 Überblick

Der Testmodus ermöglicht es **allen Rollen** (User, Viewer, Admin, Super-Admin), die App auszuprobieren, ohne dass Änderungen gespeichert werden. Ziel: Mitarbeitern die Angst nehmen, etwas kaputt zu machen.

**Kernprinzip:** Alle Schreib-Operationen (Insert, Update, Delete) werden nur im lokalen TanStack Query Cache ausgeführt, aber **nicht** an Supabase gesendet. Die UI reagiert normal – der User merkt keinen Unterschied. Beim Verlassen des Testmodus wird der Cache auf den echten Stand zurückgesetzt.

Der Testmodus gilt ausschließlich lokal im aktuellen Browser für den eingeloggten User. Der Zustand wird nur im React State gehalten und nicht in `sessionStorage` oder `localStorage` persistiert. Ein vollständiger Reload der Seite beendet den Testmodus und stellt den echten Datenstand wieder her.

### 2.2 Aktivierung & UI

#### Aktivierung (zwei Optionen – beide werden gebaut, Entscheidung erfolgt später im Projekt):

1. **Header:** Dezenter Toggle-Button / Icon mit Tooltip "Testmodus" in der oberen Navigationsleiste.
2. **Profil-Dropdown:** Eintrag "Testmodus aktivieren" im Profil-Menü.

#### Visuelle Kennzeichnung im aktiven Testmodus:

1. **Gelber Rahmen:** Das gesamte App-Fenster bekommt einen deutlich sichtbaren gelben Rahmen (`border: 4px solid #EAB308` oder ähnlich).
2. **Hinweisleiste oben:** Eine schmale gelbe Leiste am oberen Rand mit Text:
   ```
   🔬 Testmodus aktiv – Änderungen werden nicht gespeichert
   ```
   Die Leiste enthält auch einen Button zum Beenden des Testmodus.

### 2.3 Technische Umsetzung

#### Architektur: Frontend-Sandbox via TanStack Query Interception

```
Normaler Modus:
  User-Aktion → useMutation → Supabase (DB) → invalidateQueries → UI-Update

Testmodus:
  User-Aktion → useMutation (INTERCEPTED) → Cache-Update (lokal) → UI-Update
                                          ↗ Kein Supabase-Call
```

#### Implementierungsstrategie:

1. **TestModeProvider** (neuer Context – erlaubt, weil analog zu Auth überall gebraucht):

```tsx
// src/contexts/TestModeContext.tsx
interface TestModeContextType {
  isTestMode: boolean;
  enableTestMode: () => void;   // Erstellt Cache-Snapshot, aktiviert Interception
  disableTestMode: () => void;  // Zeigt Bestätigungsdialog, bei Bestätigung: Cache zurücksetzen
}
```

2. **Cache-Snapshot beim Aktivieren:**
   - Beim Aktivieren des Testmodus: Snapshot des gesamten TanStack Query Cache erstellen und speichern
   - Alle Mutations werden weiterhin ausgeführt, aber die `mutationFn` wird durch eine Fake-Funktion ersetzt, die:
     - Den Cache optimistisch aktualisiert (sodass die UI reagiert)
     - Einen Toast zeigt (normaler Erfolgs-Toast, KEIN Hinweis auf Testmodus bei jeder Aktion – der gelbe Rahmen reicht)
     - **Nicht** an Supabase sendet

3. **Cache-Reset beim Deaktivieren:**
   - Beim Beenden des Testmodus: Cache auf den gespeicherten Snapshot zurücksetzen
   - `queryClient.clear()` gefolgt von Restore des Snapshots
   - Danach `queryClient.invalidateQueries()` um frische Daten von Supabase zu laden

#### Umsetzung der Mutation-Interception:

**Empfohlener Ansatz:** Einen Custom Wrapper um `useMutation` erstellen:

```tsx
// src/hooks/useAppMutation.ts
import { useMutation, UseMutationOptions } from '@tanstack/react-query';
import { useTestMode } from '@/contexts/TestModeContext';

export function useAppMutation<TData, TError, TVariables>(
  options: UseMutationOptions<TData, TError, TVariables>
) {
  const { isTestMode } = useTestMode();

  return useMutation({
    ...options,
    mutationFn: isTestMode
      ? async (variables: TVariables) => {
          // Simuliere erfolgreiche Mutation
          // Gebe Fake-Daten zurück die dem erwarteten Format entsprechen
          return {} as TData;
        }
      : options.mutationFn,
    onSuccess: (data, variables, context) => {
      // onSuccess wird auch im Testmodus aufgerufen
      // → invalidateQueries, toast, etc. laufen normal
      options.onSuccess?.(data, variables, context);
    },
  });
}
```

**Wichtig:** Alle bestehenden `useMutation`-Aufrufe in den Hooks müssen auf `useAppMutation` umgestellt werden. Das betrifft alle Hooks in `src/hooks/`.

**Achtung bei invalidateQueries im Testmodus:** Im Testmodus darf `invalidateQueries` **nicht** dazu führen, dass frische Daten von Supabase geladen werden (das würde die lokalen Test-Änderungen überschreiben). Lösung: Im Testmodus `queryClient.setDefaultOptions({ queries: { refetchOnMount: false, refetchOnWindowFocus: false } })` setzen und `invalidateQueries` durch direktes Cache-Update ersetzen (via `queryClient.setQueryData`).

### 2.4 Verhalten im Detail

| Szenario | Verhalten |
|----------|-----------|
| **Produkt umbenennen** | UI zeigt neue Benennung, wird aber nicht an Supabase gesendet |
| **Produkt ausblenden** | UI blendet aus, wird aber nicht gespeichert |
| **Eigenes Produkt anlegen** | Erscheint in der Liste (Cache), wird aber nicht in DB geschrieben |
| **Warengruppe ändern** | UI zeigt Änderung, wird nicht persistiert |
| **PDF exportieren** | PDF wird mit den aktuellen (Test-)Daten generiert – das ist okay und sogar nützlich |
| **In-App Navigation (z.B. Dashboard → Liste)** | Testmodus bleibt **aktiv**. SPA-Routing (React Router) löst keinen echten Seitenaufruf aus, daher bleibt der React State erhalten. |
| **Seite neu laden / Browser schließen** | Testmodus wird **automatisch beendet**. Alle Testdaten sind weg. User ist im normalen Modus. |
| **Lese-Operationen (Listen laden, etc.)** | Im Testmodus: Daten kommen aus dem Cache (Snapshot + lokale Änderungen). Kein Refetch von Supabase. |
| **Testmodus aktiv + Markt wechseln** | Es erscheint **zuerst** der Testmodus-Bestätigungsdialog ("Schon fertig mit Ausprobieren?"). Wenn bestätigt → Testmodus endet, dann passiert der Markt-Wechsel (Subdomain-Redirect). Wenn abgebrochen → bleibt im Testmodus, kein Markt-Wechsel. |

### 2.5 Bestätigungsdialog

Beim Klick auf "Testmodus beenden" erscheint ein **freundlicher Bestätigungsdialog**:

```
┌─────────────────────────────────────────────┐
│                                             │
│   Schon fertig mit Ausprobieren? 🔬        │
│                                             │
│   Wenn du den Testmodus verlässt,           │
│   gehen alle Änderungen verloren,           │
│   die du gemacht hast.                      │
│                                             │
│          [Weiter testen]  [Beenden]         │
│                                             │
└─────────────────────────────────────────────┘
```

- **Ton:** Freundlich, nicht bedrohlich. Keine Warnung-Icons oder rote Farben.
- **shadcn Dialog** verwenden (AlertDialog)
- "Weiter testen" = Sekundärer Button (Outline)
- "Beenden" = Primärer Button

### 2.6 Frontend-Änderungen (Übersicht)

| Bereich | Änderung |
|---------|----------|
| **Neuer Context** | `TestModeProvider` mit `isTestMode`, `enableTestMode`, `disableTestMode` |
| **Neuer Hook** | `useAppMutation` – Wrapper um `useMutation` der im Testmodus Mutations abfängt |
| **Bestehende Hooks** | Alle `useMutation`-Aufrufe auf `useAppMutation` umstellen |
| **UI: Header** | Toggle-Button / Icon für Testmodus (Option 1) |
| **UI: Profil-Dropdown** | "Testmodus aktivieren" Eintrag (Option 2) |
| **UI: Gelber Rahmen** | Bedingter Rahmen um das Root-Layout wenn `isTestMode = true` |
| **UI: Hinweisleiste** | Schmale gelbe Leiste oben mit Text + Beenden-Button |
| **UI: Bestätigungsdialog** | shadcn AlertDialog beim Beenden |
| **State-Persistenz** | Testmodus wird **nicht** persistiert – Seite neu laden = normaler Modus. Der `isTestMode`-State lebt nur im React State (kein sessionStorage, kein localStorage). |
| **Query-Verhalten** | Im Testmodus: Refetch deaktivieren, Mutations nur lokal im Cache |

---

## Feature 3: Onboarding-Tour (Platzhalter)

> **Wird separat geplant.** Eine geführte Einleitung für neue User, die Schritt für Schritt durch die App erklärt. Wird in einem separaten Dokument detailliert besprochen.

Voraussichtlich:
- Bibliothek: `react-joyride` oder `shepherd.js`
- Beim ersten Login oder jederzeit aufrufbar
- Details folgen

---

## Umsetzungsreihenfolge

Die empfohlene Reihenfolge für die Umsetzung:

| Schritt | Feature | Begründung |
|---------|---------|------------|
| **1** | Multi-Tenancy: Datenbank & Migration | Fundament – alles andere baut darauf auf. Neue Tabellen, `store_id` überall, bestehende Daten migrieren. |
| **2** | Multi-Tenancy: Backend (RLS, DB-Funktionen, Edge Functions) | Sicherheit zuerst. RLS-Policies anpassen, neue DB-Funktionen, Edge Functions erweitern. |
| **3** | Multi-Tenancy: StoreProvider & Subdomain-Logik | Frontend-Grundlage. Subdomain erkennen, Store-Context bereitstellen, Auth-Cookies für Wildcard. |
| **4** | Multi-Tenancy: Bestehende Hooks/Seiten anpassen (store_id) | Bestehendes System multi-tenant-fähig machen. Alle Hooks + QueryKeys um `store_id` erweitern. |
| **5** | Multi-Tenancy: Superadmin-Dashboard (Firmen, Märkte, Upload) | Verwaltungsoberfläche: Firmen anlegen, Märkte anlegen, Einstellungen. |
| **6** | Multi-Tenancy: Login-Branding, Redirect-Logik, Markt-Switcher | User-facing: Branding auf Login-Seite, Redirect bei falschem Markt, Markt-Wechsel. |
| **7** | Testmodus | Unabhängig von Multi-Tenancy. TestModeProvider, useAppMutation, UI (gelber Rahmen, Hinweisleiste, Dialog). |
| **8** | Onboarding-Tour | Nachdem die UI stabil ist. |

---

## Checkliste

### Multi-Tenancy – Datenbank

- [ ] Migration: Neue Tabelle `companies` (mit `logo_url`, `is_active`)
- [ ] Migration: Neue Tabelle `stores` (mit `subdomain` UNIQUE, `logo_url`, `company_id`, `is_active`)
- [ ] Migration: Neue Tabelle `user_store_access` (mit `is_home_store`)
- [ ] Migration: Partial Unique Index `idx_one_home_store_per_user` auf `user_store_access`
- [ ] Migration: Neue Tabelle `store_list_visibility`
- [ ] Migration: `store_id` zu allen marktspezifischen Tabellen hinzufügen (erst nullable, dann migrieren, dann NOT NULL)
- [ ] Migration: `current_store_id` zu `profiles` hinzufügen
- [ ] Migration: Bestehende Daten der Standard-Firma / Standard-Markt zuordnen
- [ ] Migration: Subdomain-Validierung (CHECK constraint: nur lowercase, zahlen, bindestriche)
- [ ] Migration: Reservierte Subdomains blockieren (CHECK constraint oder Trigger)
- [ ] DB-Funktionen: `get_user_store_ids()`, `get_current_store_id()`, `get_store_company_id()`, `get_home_store_subdomain()`
- [ ] RLS: Alle bestehenden Policies um `store_id`-Prüfung erweitern
- [ ] RLS: Neue Policies für `companies`, `stores`, `user_store_access`, `store_list_visibility`
- [ ] RLS: Super-Admin Policies (kann alles lesen/schreiben)
- [ ] RLS: `is_active`-Prüfung in relevante Policies einbauen
- [ ] Performance-Indexe: `user_store_access(user_id, store_id)`, `stores(subdomain)`, `stores(company_id)`
- [ ] Supabase Storage: Bucket `logos` mit Pfadstruktur `companies/{id}/` und `stores/{id}/` + Upload-Policies (max 2MB, JPG/PNG/WebP/SVG)

### Multi-Tenancy – Edge Functions

- [ ] `create-user` erweitern: `home_store_id` + `additional_store_ids` Parameter
- [ ] `delete-user`: Prüfen ob CASCADE für `user_store_access` greift
- [ ] Neue Edge Function: `update-user-store-access`

### Multi-Tenancy – Frontend

- [ ] `StoreProvider` Context (store_id, company_id, isAdminDomain, storeName, storeLogo)
- [ ] Subdomain-Erkennung: Subdomain aus URL extrahieren, Store laden, Sonderfall "admin"
- [ ] Umgebungsvariable `VITE_APP_DOMAIN` für Subdomain-Extraktion (Prod vs. Dev)
- [ ] Dev-Modus: `?store=` URL-Parameter als Subdomain-Override
- [ ] Supabase Auth: Cookies für Wildcard-Domain `*.domain.de` konfigurieren
- [ ] Alle bestehenden Hooks um `store_id` erweitern
- [ ] QueryKeys um `store_id` erweitern
- [ ] Persist-Allowlist aktualisieren (neue Prefixes)
- [ ] Neue Hooks: `useCompanies`, `useStores`, `useStoreAccess`, `useStoreListVisibility`, `useCurrentStore`
- [ ] Superadmin-Dashboard umbauen (Karten: Upload, Firmen)
- [ ] Upload-Seite (Auswahl Obst/Gemüse oder Backshop) – national, kein Markt-Kontext
- [ ] Firmen-Übersicht + Firma anlegen (Name + erster Markt + Subdomain + Logos)
- [ ] Firma-Detailseite (Märkte-Liste + Markt anlegen + Firmen-Einstellungen + Pausieren/Löschen)
- [ ] Markt-Detailseite (Einstellungen, Listen-Sichtbarkeit, User, Daten, kopierbarer Link, Pausieren/Löschen, Subdomain ändern)
- [ ] Login-Seite: Markt-Branding (Logo + Name aus Subdomain, Fallback-Kette)
- [ ] Login-Seite: Pausierter Markt → "Nicht verfügbar" Meldung
- [ ] Login-Redirect: Nach Auth prüfen ob User Zugriff hat, ggf. Redirect + Toast
- [ ] Login-Redirect: Nicht-Superadmin auf admin.domain.de → Redirect zum Heimatmarkt
- [ ] Markt-Switcher: Dashboard-Auswahl + Profil-Dropdown, Wechsel = Subdomain-Redirect
- [ ] Markt-Switcher: Im Testmodus erst Bestätigungsdialog, dann Wechsel
- [ ] Header: Marktname anzeigen (immer sichtbar)
- [ ] Admin User-Verwaltung mit Markt-Kennzeichnung + Heimatmarkt-Zuweisung
- [ ] Listen-Sichtbarkeit in UI umsetzen (Listen/Nav-Einträge ausblenden wenn nicht sichtbar)
- [ ] Fehlerseite für ungültige Subdomains
- [ ] Subdomain-Input mit Vorschlag aus Marktname + Validierung + Eindeutigkeits-Check
- [ ] Bestätigungsdialoge: Firma/Markt pausieren, Firma/Markt löschen (mit Texteingabe), Subdomain ändern

### Multi-Tenancy – Deployment

- [ ] Vercel: Wildcard-Domain `*.domain.de` konfigurieren
- [ ] DNS: Wildcard A/CNAME Record einrichten
- [ ] Supabase: Auth Cookie-Domain auf `*.domain.de` setzen

### Multi-Tenancy – Tests

- [ ] Bestehende Tests anpassen (store_id-Kontext)
- [ ] Neue Tests: Subdomain-Erkennung (inkl. admin.domain.de, ungültige Subdomain)
- [ ] Neue Tests: Login-Redirect-Logik (kein Zugriff, pausierter Markt, Superadmin auf Markt-Subdomain, Nicht-Superadmin auf admin.domain.de)
- [ ] Neue Tests: Markt-Wechsel (Subdomain-Redirect)
- [ ] Neue Tests: RLS-Policies (Store-Isolation, is_active-Prüfung)
- [ ] Neue Tests: Listen-Sichtbarkeit
- [ ] Neue Tests: Firma/Markt pausieren + reaktivieren
- [ ] Neue Tests: Firma/Markt löschen (CASCADE-Verhalten)
- [ ] Neue Tests: Subdomain ändern
- [ ] Neue Tests: Partial Unique Index (genau ein Heimatmarkt pro User)

### Testmodus

- [ ] `TestModeProvider` Context
- [ ] `useAppMutation` Hook (Wrapper um useMutation)
- [ ] Alle bestehenden `useMutation` → `useAppMutation` umstellen
- [ ] Cache-Snapshot-Logik (erstellen beim Aktivieren, wiederherstellen beim Deaktivieren)
- [ ] Refetch-Deaktivierung im Testmodus
- [ ] Toggle-Button im Header (Option 1)
- [ ] Eintrag im Profil-Dropdown (Option 2)
- [ ] Gelber Rahmen (bedingtes CSS am Root-Layout)
- [ ] Gelbe Hinweisleiste oben mit Text + Beenden-Button
- [ ] Bestätigungsdialog (shadcn AlertDialog, freundlicher Ton)
- [ ] Auto-Beenden bei Seiten-Reload (kein Persistieren des States)
- [ ] Tests: Testmodus-Aktivierung/Deaktivierung
- [ ] Tests: Mutation-Interception verifizieren
- [ ] Tests: Cache-Reset nach Beenden verifizieren

### Onboarding-Tour

- [ ] Wird separat geplant

---

## Klärungen und Entscheidungen

### Subdomains & Firmenstruktur

- **Subdomains**: Freie Wahl durch den Superadmin. Beim Anlegen eines Marktes wird aus dem Marktnamen ein Vorschlag generiert (z.B. "Markt Angerbogen" → `angerbogen`), der Superadmin kann diesen jedoch beliebig anpassen. Zulässig sind ausschließlich Kleinbuchstaben, Ziffern und Bindestriche. Reservierte Subdomains sind: `admin`, `app`, `api`, `www`, `mail`. Eine Umzugsphase mit parallelen Subdomains ist nicht vorgesehen – beim Umbenennen einer Subdomain werden alle alten Links ungültig. Das UI weist mit einem deutlichen Hinweis darauf hin.
- **Firmenstruktur**: Technisch ist es erlaubt, dass ein User Märkte aus unterschiedlichen Firmen zugewiesen bekommt (z.B. Springer, externe Kräfte). In der Praxis gehört ein User jedoch fast immer zu genau einer Firma. Die UI wird daher auf den typischen „User innerhalb einer Firma“-Fall optimiert und Cross-Firma-Szenarien nicht speziell hervorgehoben.
- **Standard-Firma/-Markt**: Für die Migration wird eine technische Standard-Firma (`"Standard"`) und ein Standard-Markt (`"Standard-Markt"`) angelegt. Diese dienen nur als Ausgangszustand und können später vom Superadmin im UI umbenannt werden. Es ist kein spezieller „Live-Name“ nötig.

### Deployment, Downtime & Rollback

- **Wartungsfenster**: Für die große Multi-Tenancy-Migration ist ein kurzes Wartungsfenster (ca. 5–10 Minuten) akzeptabel. Währenddessen kann die App in einen Wartungsmodus versetzt werden.
- **Rollback-Strategie**: Ein Rollback der Multi-Tenancy-Migration erfolgt ausschließlich über ein vollständiges Datenbank-Backup. Vor Einspielen der Migration ist ein komplettes Backup Pflicht. In der Migration-Datei wird dieser Hinweis explizit dokumentiert.

### Domains, Wildcard-DNS & Supabase Auth

- **Domain-Platzhalter**: In der Spezifikation und im Code wird `domain.de` als Platzhalter verwendet. Die tatsächliche Domain wird über die Umgebungsvariable `VITE_APP_DOMAIN` konfiguriert. Ziel ist, dass ein späterer Domain-Wechsel ausschließlich über diese Variable möglich ist, ohne Codeänderungen.
- **Wildcard-DNS & Vercel**: Für die Multi-Tenancy werden Wildcard-DNS-Einträge (`*.domain.de`) und eine Vercel-Wildcard-Domain benötigt. In der Projekt-Dokumentation (README bzw. passende `docs/`-Datei) wird eine Schritt-für-Schritt-Anleitung hinterlegt, wie:
  - der Wildcard-DNS-Eintrag beim Domain-Provider eingerichtet wird,
  - die Wildcard-Domain in Vercel konfiguriert wird,
  - und wie `VITE_APP_DOMAIN` für Produktion/Entwicklung gesetzt wird.
- **Supabase Auth Cookie-Domain**: Die Supabase Auth-Cookies werden auf die Wildcard-Domain (`*.domain.de`) umgestellt. Die Konfiguration orientiert sich ebenfalls an `VITE_APP_DOMAIN`. In einer separaten Doku-Datei (z.B. `docs/SUPABASE_AUTH_COOKIES.md`) wird festgehalten:
  - wo in Supabase die Cookie-Domain gesetzt wird,
  - welche Werte für Dev/Prod verwendet werden,
  - und welche Auswirkungen das auf Subdomain-Wechsel und Login hat.

### Rollen & Superadmin-Dashboard

- **Rollenstatus**: Alle vier Rollen (`super_admin`, `admin`, `user`, `viewer`) existieren bereits und werden aktiv genutzt. Es gibt mindestens einen Superadmin-User im System.
- **Superadmin-Dashboard-Umfang**: Das Superadmin-Dashboard wird direkt in der vollständigen Ausbaustufe umgesetzt. Dazu gehören:
  - Firmenliste,
  - Firmen- und Markt-Details,
  - Upload-Bereich (Obst/Gemüse, Backshop),
  - Firmen- und Markt-Einstellungen,
  - Pausieren/Reaktivieren und Löschen von Firmen/Märkten,
  - sowie eine User-Übersicht inkl. Markt-Informationen.
- **Admins in mehreren Märkten**: Es ist ein typischer Anwendungsfall, dass ein Admin mehrere Märkte verwaltet (z.B. Regionalleiter). Die User-Verwaltung zeigt daher von Anfang an:
  - eine Markt-Spalte,
  - Filtermöglichkeiten nach Märkten,
  - und eine klare Kennzeichnung von Heimatmarkt vs. zusätzlichen Märkten.

### Testmodus

- **Qualitätsanspruch**: Der Testmodus wird von Beginn an als vollwertige, performante Lösung umgesetzt. Dazu gehören:
  - ein optimierter Umgang mit dem TanStack Query Cache,
  - unterbundene Refetches im Testmodus (damit Test-Änderungen nicht ungewollt überschrieben werden),
  - sowie ein sauberes Snapshot-/Restore-Verhalten beim Ein- und Ausschalten des Testmodus.
- **Scope des Testmodus**: Der Testmodus gilt ausschließlich lokal im Browser für den aktuell eingeloggten User. Er wird nur im React State gehalten (kein `sessionStorage`, kein `localStorage`) und endet automatisch bei einem vollständigen Seiten-Reload.
- **Demo-Link (Platzhalter)**: Für eine spätere Erweiterung wird vorgesehen, dass ein URL-Parameter (z.B. `?demo=true`) den Testmodus automatisch aktivieren kann. Die Architektur des `TestModeProvider` berücksichtigt diesen Anwendungsfall (z.B. durch einen optionalen Check auf den Parameter), die konkrete Aktivierung über `?demo=true` kann jedoch initial hinter einem Feature-Flag oder auskommentiert bleiben.
