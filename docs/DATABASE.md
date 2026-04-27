# Datenbank-Schema

## ER-Diagramm

```
== Multi-Tenancy (Firma → Maerkte) ==

companies (1:n → stores)
    │
    └──→ stores (1:n → user_store_access, store_list_visibility)
             │
             ├──→ user_store_access (n:m Zuordnung User ↔ Store)
             ├──→ store_list_visibility (welche Listen pro Markt sichtbar sind)
             └──→ user_list_visibility (welche Listen pro User sichtbar sind)

profiles (Supabase Auth + App-Daten)
    │
    ├──→ user_store_access (1:n) – User-Markt-Zuordnung (is_home_store)
    │
    ├──→ custom_products (1:n, pro store_id) – Eigene Produkte
    ├──→ hidden_items (1:n, pro store_id) – Ausgeblendete PLUs
    ├──→ renamed_items (1:n, pro store_id) – Umbenannte Produkte (Obst/Gemuese)
    ├──→ plu_offer_items (1:n, pro store_id) – Werbung/Angebot (Obst/Gemuese)
    ├──→ version_notifications (1:n, pro store_id) – Gelesen/Ungelesen pro Version
    │
    ├──→ user_overrides (1:n) – LEGACY, nicht mehr aktiv genutzt
    ├──→ notifications_queue (1:n) – LEGACY, ersetzt durch version_notifications
    │
versions (KW-Versionen) – NATIONAL, kein store_id
    │
    ├──→ master_plu_items (1:n) – Alle PLU-Eintraege einer Version
    └──→ version_notifications (1:n, pro store_id)

layout_settings (pro store_id, UNIQUE) – Markt-Layout Obst/Gemüse
bezeichnungsregeln (Keyword-Regeln, pro store_id) – Markt
store_obst_block_order (optional Reihenfolge Warengruppen pro Markt)
store_obst_name_block_override (Markt: effektive Warengruppe nach normalisiertem Artikelnamen)

blocks (Warengruppen/Bloecke) – NATIONAL (Referenz/Upload)
    │
    └──→ block_rules (1:n) – Zuweisungsregeln pro Block

Backshop-PLU-Liste (getrennt von Obst/Gemuese, gleiche profiles):
backshop_versions → backshop_master_plu_items (inkl. image_url) – NATIONAL
                  → backshop_version_notifications (pro store_id)
backshop_blocks → backshop_block_rules – NATIONAL
backshop_custom_products (pro store_id), backshop_hidden_items (pro store_id)
backshop_renamed_items (pro store_id), backshop_offer_items (pro store_id)
backshop_layout_settings (pro store_id), backshop_bezeichnungsregeln (pro store_id)
store_backshop_block_order, store_backshop_name_block_override – analog Obst
```

## Multi-Tenancy-Tabellen

### companies

| Feld | Typ | Beschreibung |
|------|-----|-------------|
| `id` | UUID (PK) | Firmen-ID |
| `name` | TEXT | Firmenname (z.B. Friedrich-Tonscheit-KG) |
| `logo_url` | TEXT | URL zum Firmenlogo |
| `is_active` | BOOLEAN | Firma aktiv/pausiert |
| `created_at` | TIMESTAMPTZ | Erstellt am |
| `updated_at` | TIMESTAMPTZ | Aktualisiert am |

### stores

| Feld | Typ | Beschreibung |
|------|-----|-------------|
| `id` | UUID (PK) | Markt-ID |
| `company_id` | UUID (FK → companies) | Gehoert zu welcher Firma |
| `name` | TEXT | Marktname (z.B. Angerbogen) |
| `subdomain` | TEXT (UNIQUE) | Subdomain fuer diesen Markt |
| `logo_url` | TEXT | URL zum Markt-Logo |
| `is_active` | BOOLEAN | Markt aktiv/pausiert |

### user_store_access

| Feld | Typ | Beschreibung |
|------|-----|-------------|
| `id` | UUID (PK) | Zuordnungs-ID |
| `user_id` | UUID (FK → profiles) | Welcher User |
| `store_id` | UUID (FK → stores) | Welcher Markt |
| `is_home_store` | BOOLEAN | Ist das der Heimatmarkt des Users? |

### store_list_visibility

| Feld | Typ | Beschreibung |
|------|-----|-------------|
| `id` | UUID (PK) | ID |
| `store_id` | UUID (FK → stores) | Welcher Markt |
| `list_type` | TEXT | `obst_gemuese` oder `backshop` |
| `is_visible` | BOOLEAN | Liste fuer diesen Markt sichtbar? |

**Frontend:** Oberes Gate – eine Liste ist fuer eingeloggte Nutzer nur nutzbar, wenn hier sichtbar **und** der passende Eintrag in `user_list_visibility` (bzw. Default) ebenfalls sichtbar ist.

### user_list_visibility

| Feld | Typ | Beschreibung |
|------|-----|-------------|
| `id` | UUID (PK) | ID |
| `user_id` | UUID (FK → auth.users) | Welcher User |
| `store_id` | UUID (FK → stores) | Welcher Markt |
| `list_type` | TEXT | `obst_gemuese` oder `backshop` |
| `is_visible` | BOOLEAN | Liste fuer diesen User sichtbar? (Default: true) |
| `created_at` | TIMESTAMPTZ | Erstellt am |

UNIQUE-Constraint auf `(user_id, store_id, list_type)`. Kein Eintrag = sichtbar (Default-Logik im Frontend). Zusammen mit `store_list_visibility` ergibt sich die effektive Sichtbarkeit (UND). RLS: User liest eigene; Admin/Super-Admin liest/schreibt alle im eigenen Markt (Migration 038).

### store_id in marktspezifischen Tabellen

Folgende Tabellen haben eine `store_id`-Spalte (FK → stores, NOT NULL):
- `custom_products`
- `hidden_items`
- `renamed_items`
- `plu_offer_items`
- `version_notifications`
- `backshop_custom_products`
- `backshop_hidden_items`
- `backshop_offer_items`
- `backshop_renamed_items`
- `backshop_version_notifications`

### DB-Funktionen (Multi-Tenancy)

- `get_user_store_ids()` – Gibt alle Store-IDs zurueck, auf die der aktuelle User Zugriff hat
- `get_current_store_id()` – Gibt die aktuelle Store-ID aus profiles.current_store_id zurueck
- `get_store_company_id(p_store_id)` – Gibt die Company-ID eines Stores zurueck
- `get_home_store_subdomain(p_user_id)` – Gibt die Subdomain des Heimatmarkts zurueck

## Tabellen im Detail

### profiles

Erweitert Supabase Auth um App-spezifische Daten.

| Feld | Typ | Beschreibung |
|------|-----|-------------|
| `id` | UUID (PK) | Referenz auf auth.users(id) |
| `email` | TEXT | E-Mail-Adresse |
| `personalnummer` | TEXT (UNIQUE) | 7-stellige Personalnummer |
| `display_name` | TEXT | Anzeigename |
| `role` | TEXT | `super_admin`, `admin`, `user` oder `viewer` |
| `must_change_password` | BOOLEAN | Einmalpasswort-Flag |
| `created_by` | UUID | Wer hat diesen User angelegt |
| `created_at` | TIMESTAMPTZ | Erstellt am |
| `last_login` | TIMESTAMPTZ | Letzter Login |
| `current_store_id` | UUID (FK → stores) | Aktuell aktiver Markt des Users |

**Trigger:** Bei neuem Auth-User wird automatisch ein Profil erstellt (`handle_new_user()`). Anonyme User werden ignoriert.

### versions

Jede Kalenderwoche bekommt eine eigene Version.

| Feld | Typ | Beschreibung |
|------|-----|-------------|
| `id` | UUID (PK) | Versions-ID |
| `kw_nummer` | INT | Kalenderwoche (1-53) |
| `jahr` | INT | Jahr |
| `kw_label` | TEXT (GENERATED) | z.B. "KW06/2025" |
| `status` | TEXT | `draft`, `active` oder `frozen` |
| `published_at` | TIMESTAMPTZ | Wann aktiviert |
| `frozen_at` | TIMESTAMPTZ | Wann eingefroren |
| `delete_after` | TIMESTAMPTZ | Nicht mehr für Löschung genutzt (Migration 019); Retention über „max. 3 Versionen behalten“. |
| `created_by` | UUID | Erstellt von (Super-Admin) |

**Regel:** Nur eine Version kann `status = 'active'` sein.

### master_plu_items

Die eigentlichen PLU-Einträge, gebunden an eine Version.

| Feld | Typ | Beschreibung |
|------|-----|-------------|
| `id` | UUID (PK) | Item-ID |
| `version_id` | UUID (FK → versions) | Gehört zu welcher KW |
| `plu` | TEXT | 5-stellige PLU-Nummer |
| `system_name` | TEXT | Artikelname aus Excel |
| `item_type` | TEXT | `PIECE` (Stück) oder `WEIGHT` (Gewicht) |
| `status` | TEXT | `UNCHANGED`, `NEW_PRODUCT_YELLOW`, `PLU_CHANGED_RED` |
| `old_plu` | TEXT | Bei PLU-Änderung: die alte PLU |
| `warengruppe` | TEXT | Kategorie aus Excel |
| `block_id` | UUID (FK → blocks) | Zugewiesene Warengruppe |
| `is_admin_eigen` | BOOLEAN | Admin-eigenes Produkt (per Excel importiert) |
| `is_manually_renamed` | BOOLEAN | Manuell umbenannt (Bezeichnungsregeln überspringen) |
| `preis` | DECIMAL | Preis (optional) |

**Constraint:** `UNIQUE(version_id, plu)` – jede PLU nur einmal pro Version.

### user_overrides

User-spezifische Anpassungen an der Masterliste.

| Feld | Typ | Beschreibung |
|------|-----|-------------|
| `id` | UUID (PK) | Override-ID |
| `user_id` | UUID (FK → profiles) | Welcher User |
| `plu` | TEXT | Betroffene PLU |
| `override_type` | TEXT | `eigen`, `ausgeblendet` oder `umbenannt` |
| `custom_name` | TEXT | Eigener Name (bei eigen/umbenannt) |
| `custom_preis` | DECIMAL | Eigener Preis (bei eigen) |
| `item_type` | TEXT | Stück oder Gewicht (bei eigen) |
| `block_id` | UUID (FK → blocks) | Warengruppe (bei eigen) |

### blocks

Warengruppen zur logischen Gruppierung von Produkten.

| Feld | Typ | Beschreibung |
|------|-----|-------------|
| `id` | UUID (PK) | Block-ID |
| `name` | TEXT | Name (z.B. "Exotik", "Regional") |
| `order_index` | INT | Reihenfolge in der Sortierung |

### block_rules

Automatische Zuweisungsregeln für Blöcke.

| Feld | Typ | Beschreibung |
|------|-----|-------------|
| `block_id` | UUID (FK → blocks) | Ziel-Block |
| `rule_type` | TEXT | `NAME_CONTAINS`, `NAME_REGEX`, `PLU_RANGE` |
| `value` | TEXT | Suchbegriff, Regex oder "40000-40999" |
| `case_sensitive` | BOOLEAN | Groß-/Kleinschreibung beachten |

### layout_settings

Eine Zeile pro Markt (`store_id` UNIQUE). Kanonische PLU-Zuordnung bleibt in `master_plu_items`; die Anzeige am Markt kann über `store_obst_name_block_override` und `store_obst_block_order` abweichen (Migration 052).

| Feld | Typ | Standard | Beschreibung |
|------|-----|----------|-------------|
| `sort_mode` | TEXT | ALPHABETICAL | ALPHABETICAL oder BY_BLOCK |
| `display_mode` | TEXT | MIXED | MIXED oder SEPARATED |
| `flow_direction` | TEXT | ROW_BY_ROW | Flussrichtung im PDF |
| `font_header_px` | INT | 24 | Schriftgröße Header (beeinflusst auch Banner- und Zeilenhöhen im PDF) |
| `font_column_px` | INT | 16 | Schriftgröße Spalten-Header (beeinflusst auch Zeilenhöhen im PDF) |
| `font_product_px` | INT | 12 | Schriftgröße Produkte (beeinflusst auch Zeilenhöhen im PDF) |
| `mark_red_kw_count` | INT | 2 | Wie viele KWs rot markiert |
| `mark_yellow_kw_count` | INT | 3 | Wie viele KWs gelb markiert |
| `show_week_mon_sat_in_labels` | BOOLEAN | false | KW-Anzeige um Montag–Samstag (ISO-Woche) ergänzen |
| `features_*` | BOOLEAN | true | Feature-Toggles |

### bezeichnungsregeln

Automatische Namensanpassungen (z.B. "Bio" immer vorne). **Pro Markt** (`store_id`, UNIQUE pro `store_id` + `keyword`).

| Feld | Typ | Beschreibung |
|------|-----|-------------|
| `store_id` | UUID (FK → stores) | Markt |
| `keyword` | TEXT | z.B. "Bio", "Fairtrade" |
| `position` | TEXT | `PREFIX` oder `SUFFIX` |
| `is_active` | BOOLEAN | Aktiv/Inaktiv |

### store_obst_block_order / store_obst_name_block_override

Optionale Markt-Sortierung der Warengruppen (`order_index` pro `block_id`) bzw. Override der effektiven Warengruppe nach `system_name_normalized` (= `lower(trim(system_name))`), solange der Name in der aktuellen Version vorkommt. Backshop: `store_backshop_block_order`, `store_backshop_name_block_override`.

### custom_products (NEU – Runde 2)

Globale eigene Produkte. Alle Rollen können Produkte hinzufügen, sie gelten für alle.

| Feld | Typ | Beschreibung |
|------|-----|-------------|
| `id` | UUID (PK) | Produkt-ID |
| `plu` | TEXT (UNIQUE) | Entweder 4–5-stellige PLU **oder** interner Platzhalter `price-{uuid}` bei Produkten ohne PLU (nur Preis) |
| `name` | TEXT | Artikelname |
| `item_type` | TEXT | `PIECE` oder `WEIGHT` |
| `preis` | DECIMAL | Preis (optional; bei Preis-only-Produkten Pflicht) |
| `block_id` | UUID (FK → blocks) | Warengruppe (optional) |
| `created_by` | UUID (FK → profiles) | Wer hat es erstellt |
| `created_at` | TIMESTAMPTZ | Erstellt am |
| `updated_at` | TIMESTAMPTZ | Aktualisiert am |

**Logik:** Master-Items haben Vorrang. Wenn eine PLU sowohl in master_plu_items als auch in custom_products existiert, wird das Custom Product "pausiert" (nicht angezeigt).

### hidden_items (NEU – Runde 2)

Marktspezifisch ausgeblendete PLUs. KW-unabhängig.

| Feld | Typ | Beschreibung |
|------|-----|-------------|
| `id` | UUID (PK) | Eintrag-ID |
| `plu` | TEXT | Ausgeblendete PLU |
| `store_id` | UUID (FK → stores) | Markt |
| `hidden_by` | UUID (FK → profiles) | Wer hat ausgeblendet |
| `created_at` | TIMESTAMPTZ | Ausgeblendet am |

**Unique:** `(store_id, plu)` – Migration 054 (ersetzt das historische globale `UNIQUE(plu)` aus 006, damit jeder Markt dieselbe PLU unabhängig ausblenden kann).

**RLS (Schreiben):** Insert/Update/Delete nur, wenn `store_id = get_current_store_id()` und `current_store_id` gesetzt (Migration 049; kein Super-Admin-Bypass mehr). Lesen: Zugriff über zugewiesene Märkte bzw. Super-Admin liest alle.

### renamed_items (Obst/Gemüse – Umbenennungen pro Markt)

Marktspezifische Umbenennungen von Master-Produkten. Überschreiben `display_name` und `is_manually_renamed` zur Laufzeit.

| Feld | Typ | Beschreibung |
|------|-----|-------------|
| `id` | UUID (PK) | Eintrag-ID |
| `plu` | TEXT | PLU des umbenannten Produkts |
| `store_id` | UUID (FK → stores) | Markt |
| `display_name` | TEXT | Anzeigename |
| `is_manually_renamed` | BOOLEAN | Bezeichnungsregeln überspringen |
| `created_by` | UUID (FK → profiles) | Wer hat umbenannt |
| `created_at` | TIMESTAMPTZ | Erstellt am |
| `updated_at` | TIMESTAMPTZ | Aktualisiert am |

UNIQUE(plu, store_id).

### plu_offer_items (Werbung/Angebot – Obst/Gemüse)

Manuelle Werbung: Laufzeit in Wochen (1–4), Start = aktuelle KW beim Anlegen. Zusätzlich `promo_price` (Aktionspreis), `offer_source` = `manual`. Pro Markt (`store_id`); UNIQUE (`plu`, `store_id`).

| Feld | Typ | Beschreibung |
|------|-----|-------------|
| `id` | UUID (PK) | Eintrag-ID |
| `plu` | TEXT | PLU des Angebots |
| `store_id` | UUID (FK → stores) | Markt |
| `start_kw` | INT | Start-Kalenderwoche |
| `start_jahr` | INT | Start-Jahr |
| `duration_weeks` | INT (1–4) | Laufzeit in Wochen |
| `promo_price` | NUMERIC | Aktionspreis (VK) |
| `offer_source` | TEXT | `manual` |
| `created_by` | UUID (FK → profiles) | Wer hat hinzugefügt |
| `created_at` | TIMESTAMPTZ | Angelegt am |

**Zentrale Werbung (global, nicht in dieser Tabelle dupliziert):** `obst_offer_campaigns` mit `campaign_kind` (`exit` | `ordersatz_week` | `ordersatz_3day`), **UNIQUE (kw_nummer, jahr, campaign_kind)**; `obst_offer_campaign_lines` (PLU + Aktionspreis + Herkunftsarchiv: `source_plu`, `source_artikel`, `origin`); `obst_offer_store_disabled` (Megafon aus pro `store_id` + `plu`). Migrationen 050, 053, 058.

**Herkunftsarchiv je Werbungszeile (Migration 058):** `obst_offer_campaign_lines` und `backshop_offer_campaign_lines` haben jeweils:
- `source_plu TEXT NULL` – PLU wie in der Excel aufgetaucht (oder `NULL` wenn Zeile manuell ergänzt wurde bzw. bei alten Kampagnen vor der Migration).
- `source_artikel TEXT NULL` – Artikel-Hinweis aus der Excel (oder `NULL`).
- `origin TEXT NOT NULL DEFAULT 'excel'` mit CHECK auf `('excel','manual','unassigned')`. Semantik: `excel` = aus Upload zugeordnet, `manual` = nachträglich in der Edit-Seite hinzugefügt, `unassigned` = Zeile aus Excel ohne Master-PLU (bleibt im Archiv, zählt **nicht** für die Marktliste).
- `plu` ist jetzt **nullable**: exakt `plu IS NULL ↔ origin = 'unassigned'` (zusätzlicher CHECK).
- UNIQUE-Schlüssel: `(campaign_id, sort_index)` statt `(campaign_id, plu)` – damit keine Konflikte bei null-PLU oder doppelten Source-PLUs entstehen.
Lesen für die Marktlisten filtert Zeilen mit `plu IS NULL` bzw. `origin = 'unassigned'` raus; nur die Edit-Seite (Super-Admin) sieht sie.

**RLS:** Lesen für alle Auth-User; Einfügen/Löschen/Update nur für User, Admin, Super-Admin (nicht Viewer). Kampagnen: nur Super-Admin schreiben (siehe Migration 050).

### version_notifications (NEU – Runde 2)

Pro User, Version und **Markt** (`store_id`) ein Eintrag (gelesen/ungelesen). **UNIQUE** `(user_id, version_id, store_id)` – Migration **066** (früher nur user+version, Konflikt bei Marktwechsel).

| Feld | Typ | Beschreibung |
|------|-----|-------------|
| `id` | UUID (PK) | Notification-ID |
| `user_id` | UUID (FK → profiles) | Für welchen User |
| `version_id` | UUID (FK → versions) | Für welche Version |
| `store_id` | UUID (FK → stores) | Markt |
| `is_read` | BOOLEAN | Gelesen? |
| `read_at` | TIMESTAMPTZ | Wann gelesen |
| `created_at` | TIMESTAMPTZ | Erstellt am |

### notifications_queue (LEGACY)

**Nicht mehr aktiv genutzt.** Ersetzt durch `version_notifications`.

| Feld | Typ | Beschreibung |
|------|-----|-------------|
| `user_id` | UUID (FK) | Für welchen User |
| `version_id` | UUID (FK) | Aus welcher KW |
| `plu` | TEXT | PLU des neuen Produkts |
| `product_name` | TEXT | Produktname |
| `user_decision` | TEXT | `pending`, `uebernommen`, `ausgeblendet` |

## Backshop-Tabellen (Migration 011)

Getrennte Tabellen für die zweite PLU-Liste „Backshop“. Keine Änderung an den Obst/Gemüse-Tabellen.

| Tabelle | Beschreibung |
|---------|--------------|
| `backshop_versions` | KW-Versionen für Backshop (wie versions) |
| `backshop_blocks` | Warengruppen nur für Backshop |
| `backshop_block_rules` | Zuweisungsregeln für backshop_blocks |
| `backshop_master_plu_items` | PLU-Einträge pro Backshop-Version; **kein** item_type, dafür **image_url** (TEXT, Referenz auf Supabase Storage) |
| `backshop_custom_products` | Eigene Produkte Backshop; **image_url NOT NULL** (Bild Pflicht) |
| `backshop_hidden_items` | Ausgeblendete PLUs Backshop |
| `backshop_version_notifications` | Benachrichtigungen pro Backshop-Version |
| `backshop_layout_settings` | Singleton Layout für Backshop (sort_mode, Schriftgrößen, Markierungs-Dauer, `show_week_mon_sat_in_labels` wie bei Obst) |
| `backshop_bezeichnungsregeln` | Bezeichnungsregeln nur für Backshop |

**Funktion:** `get_active_backshop_version()` – gibt die aktive Backshop-Version zurück (analog `get_active_version()`).

**RLS:** Lesen für alle authentifizierten User; Schreiben für `blocks`, `block_rules`, `backshop_blocks`, `backshop_block_rules` für **Admin + Super-Admin** (`is_admin()`, Migration 055). Falls im Projekt eine Tabelle **`product_groups`** existiert (z. B. älterer Name oder Parallel-Schema): Migration **056** setzt dort dieselbe Logik (Lesen bei Login, Schreiben `is_admin()`); ohne diese Tabelle wird 056 übersprungen.

**Hinweis:** Die App im Repo nutzt die Tabelle **`blocks`**. Wenn die Browser-Konsole **`/rest/v1/product_groups`** zeigt, muss entweder Migration 056 auf Supabase laufen **oder** der Client-Code auf `blocks` vereinheitlicht werden.

**RLS (Fortsetzung):** Schreiben für versions/items/layout/bezeichnungsregeln weiterhin nur Super-Admin wo zutreffend; `backshop_custom_products` wie `custom_products`; `backshop_hidden_items` wie `hidden_items` (Schreiben nur aktueller Markt, Migration 049).

## Supabase Storage (Backshop-Bilder)

- **Bucket:** `backshop-images` (im Supabase Dashboard anlegen, **nicht** per SQL – Supabase empfiehlt Dashboard oder API).
- **Zweck:** Bilder für Backshop-Produkte (aus Excel-Upload oder manuell im Umbenennen-Bereich / bei eigenen Produkten).
- **Policies:** Authentifizierte User dürfen lesen; authentifizierte User dürfen hochladen, aktualisieren und löschen.
- In der App werden die URLs in `backshop_master_plu_items.image_url` bzw. `backshop_custom_products.image_url` gespeichert.

**Schritt-für-Schritt-Anleitung:** [docs/BACKSHOP_STORAGE_SETUP.md](BACKSHOP_STORAGE_SETUP.md)

## Wichtige SQL-Funktionen

| Funktion | Zweck |
|----------|-------|
| `is_admin()` | Gibt true für super_admin + admin |
| `is_super_admin()` | Gibt true nur für super_admin |
| `lookup_email_by_personalnummer(p_nummer)` | Findet Email zu einer Personalnummer (für Login) |
| `get_current_kw()` | Gibt aktuelle Kalenderwoche + Jahr zurück |
| `get_active_version()` | Gibt die aktive KW-Version (Obst/Gemüse) zurück |
| `get_active_backshop_version()` | Gibt die aktive Backshop-Version zurück |
| `handle_new_user()` | Trigger: erstellt automatisch Profil bei neuem Auth-User |

## SQL-Migrations

Die Datenbank wird über nummerierte SQL-Scripts aufgebaut:

1. **001_initial_schema.sql** – Alle Tabellen, Indizes, Trigger, Helper Functions
2. **002_rls_policies.sql** – Row Level Security Policies
3. **003_three_roles.sql** – Erweiterung auf drei Rollen (super_admin/admin/user)
4. **004_seed_testdata.sql** – Testdaten
5. **005_add_display_name.sql** – display_name Feld für master_plu_items
6. **006_global_lists.sql** – custom_products, hidden_items, version_notifications + is_manually_renamed
7. **007_cron_jobs.sql** – pg_cron Jobs (KW-Switch, Auto-Delete, Notification Cleanup)
8. **008_profiles_prevent_role_escalation.sql** – Rollen-Eskalation verhindern
9. **009_rename_master_plu_item.sql** – Umbenennen (display_name, is_manually_renamed)
10. **010_four_roles_viewer.sql** – Rolle viewer
11. **011_backshop_schema.sql** – Backshop-Tabellen (Versionen, Items mit image_url, Custom, Hidden, Notifications, Layout, Regeln, Blöcke) + RLS + get_active_backshop_version()
12. **013_backshop_cron.sql** – Backshop-Cron-Jobs (backshop-kw-switch, backshop-auto-delete-old-versions, backshop-notification-cleanup)
13. **019_retention_keep_3_versions.sql** – Retention: Es werden nur die 3 neuesten Versionen (Jahr/KW) behalten; ältere werden täglich gelöscht. KW-Switch setzt beim Einfrieren kein delete_after mehr.
… (020–042 u. a. Multi-Tenancy, RLS, Backshop, Publish-Lock)
43. **043_profiles_update_allow_super_admin_store.sql** – profiles UPDATE: Super-Admins dürfen current_store_id auf beliebigen Markt setzen (sie haben oft keinen user_store_access; sonst 500 beim Markt-Wechsel).
44. **059_backshop_multi_source.sql** – Backshop Multi-Source (Edeka/Harry/Aryzta): `source`-Spalte in `backshop_master_plu_items` (default `edeka`) + Unique `(version_id, source, plu)`; neue Tabellen `backshop_product_groups`, `backshop_product_group_members (group_id, plu, source)`, `backshop_source_choice_per_store (store_id, group_id, chosen_sources[])` und `backshop_source_rules_per_store (store_id, block_id, preferred_source)` inkl. RLS. Siehe [BACKSHOP_MULTI_SOURCE.md](BACKSHOP_MULTI_SOURCE.md).
45. **060_publish_row_lock.sql** – Publish-Sperre: `acquire_publish_lock` / `release_publish_lock` nutzen die Tabelle `publish_connection_locks` (TTL 10 Minuten) statt Session-`pg_advisory_lock`, damit parallele HTTP-Requests über den PostgREST-Connection-Pool die Sperre zuverlässig freigeben (Migration 042 bleibt historisch; Funktionen werden ersetzt).
