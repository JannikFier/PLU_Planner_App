# Datenbank-Schema

## ER-Diagramm

```
profiles (Supabase Auth + App-Daten)
    │
    ├──→ custom_products (1:n) – Globale eigene Produkte (created_by)
    ├──→ hidden_items (1:n) – Global ausgeblendete PLUs (hidden_by)
    ├──→ version_notifications (1:n) – Gelesen/Ungelesen pro Version
    │
    ├──→ user_overrides (1:n) – LEGACY, nicht mehr aktiv genutzt
    ├──→ notifications_queue (1:n) – LEGACY, ersetzt durch version_notifications
    │
versions (KW-Versionen)
    │
    ├──→ master_plu_items (1:n) – Alle PLU-Einträge einer Version
    └──→ version_notifications (1:n) – Benachrichtigungen pro Version

layout_settings (Singleton – genau 1 Zeile)
bezeichnungsregeln (Keyword-Regeln)

blocks (Warengruppen/Blöcke)
    │
    └──→ block_rules (1:n) – Zuweisungsregeln pro Block
```

## Tabellen im Detail

### profiles

Erweitert Supabase Auth um App-spezifische Daten.

| Feld | Typ | Beschreibung |
|------|-----|-------------|
| `id` | UUID (PK) | Referenz auf auth.users(id) |
| `email` | TEXT | E-Mail-Adresse |
| `personalnummer` | TEXT (UNIQUE) | 7-stellige Personalnummer |
| `display_name` | TEXT | Anzeigename |
| `role` | TEXT | `super_admin`, `admin` oder `user` |
| `must_change_password` | BOOLEAN | Einmalpasswort-Flag |
| `created_by` | UUID | Wer hat diesen User angelegt |
| `created_at` | TIMESTAMPTZ | Erstellt am |
| `last_login` | TIMESTAMPTZ | Letzter Login |

**Trigger:** Bei neuem Auth-User wird automatisch ein Profil erstellt (`handle_new_user()`).

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
| `delete_after` | TIMESTAMPTZ | Auto-Löschung nach X Tagen |
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

Singleton-Tabelle (genau 1 Zeile) für Layout-Konfiguration.

| Feld | Typ | Standard | Beschreibung |
|------|-----|----------|-------------|
| `sort_mode` | TEXT | ALPHABETICAL | ALPHABETICAL oder BY_BLOCK |
| `display_mode` | TEXT | MIXED | MIXED oder SEPARATED |
| `flow_direction` | TEXT | ROW_BY_ROW | Flussrichtung im PDF |
| `font_header_px` | INT | 24 | Schriftgröße Header |
| `font_column_px` | INT | 16 | Schriftgröße Spalten-Header |
| `font_product_px` | INT | 12 | Schriftgröße Produkte |
| `mark_red_kw_count` | INT | 2 | Wie viele KWs rot markiert |
| `mark_yellow_kw_count` | INT | 3 | Wie viele KWs gelb markiert |
| `features_*` | BOOLEAN | true | Feature-Toggles |

### bezeichnungsregeln

Automatische Namensanpassungen (z.B. "Bio" immer vorne).

| Feld | Typ | Beschreibung |
|------|-----|-------------|
| `keyword` | TEXT | z.B. "Bio", "Fairtrade" |
| `position` | TEXT | `PREFIX` oder `SUFFIX` |
| `is_active` | BOOLEAN | Aktiv/Inaktiv |

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

Global ausgeblendete PLUs. KW-unabhängig.

| Feld | Typ | Beschreibung |
|------|-----|-------------|
| `id` | UUID (PK) | Eintrag-ID |
| `plu` | TEXT (UNIQUE) | Ausgeblendete PLU |
| `hidden_by` | UUID (FK → profiles) | Wer hat ausgeblendet |
| `created_at` | TIMESTAMPTZ | Ausgeblendet am |

### version_notifications (NEU – Runde 2)

Pro User pro Version eine Benachrichtigung (gelesen/ungelesen).

| Feld | Typ | Beschreibung |
|------|-----|-------------|
| `id` | UUID (PK) | Notification-ID |
| `user_id` | UUID (FK → profiles) | Für welchen User |
| `version_id` | UUID (FK → versions) | Für welche Version |
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

## Wichtige SQL-Funktionen

| Funktion | Zweck |
|----------|-------|
| `is_admin()` | Gibt true für super_admin + admin |
| `is_super_admin()` | Gibt true nur für super_admin |
| `lookup_email_by_personalnummer(p_nummer)` | Findet Email zu einer Personalnummer (für Login) |
| `get_current_kw()` | Gibt aktuelle Kalenderwoche + Jahr zurück |
| `get_active_version()` | Gibt die aktive KW-Version zurück |
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
