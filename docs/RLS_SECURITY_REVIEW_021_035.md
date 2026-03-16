# RLS & Datenbank-Sicherheits-Review (Migrationen 021–035)

**Review-Datum:** 17.03.2025  
**Scope:** supabase/migrations/021_multi_tenancy_core_tables.sql bis 035_cleanup_orphaned_users_no_store.sql

---

## Executive Summary

Die Multi-Tenancy-Migrationen sind insgesamt solide umgesetzt. Es wurden jedoch **2 kritische** und mehrere mittlere/niedrige Sicherheitslücken identifiziert, die behoben werden sollten.

---

## Findings (nach Schweregrad)

### CRITICAL

| # | Severity | Location | Beschreibung |
|---|----------|----------|--------------|
| 1 | **CRITICAL** | 008_profiles_prevent_role_escalation.sql (Zeile 9–16) | **current_store_id nicht geschützt:** Die UPDATE-Policy auf `profiles` prüft nur `id` und `role`. Ein User kann `current_store_id` auf beliebige Store-IDs setzen. Da `get_current_store_id()` diesen Wert ungeprüft zurückgibt, können Write-Policies (custom_products, hidden_items, version_notifications, plu_offer_items, backshop_*) umgangen werden – ein User könnte Daten in fremden Märkten schreiben. **Fix:** `WITH CHECK` erweitern: `current_store_id` darf nur auf Werte aus `get_user_store_ids()` gesetzt werden oder NULL (für Super-Admins). |
| 2 | **CRITICAL** | 029_fix_anonymous_trigger_and_rename.sql (Zeile 18–24) | **Rollen-Eskalation via handle_new_user:** Der Trigger übernimmt `role` ungefiltert aus `raw_user_meta_data`. Bei Self-Signup könnte ein Angreifer `role: 'super_admin'` in den Metadaten übergeben und sich so Super-Admin-Rechte verschaffen. **Fix:** Rolle validieren – bei Signup nur `'user'` erlauben; `admin`/`super_admin` nur, wenn der erstellende User Admin ist (z.B. über `auth.jwt()->>'role'` oder separates Admin-Signup). |

### HIGH

| # | Severity | Location | Beschreibung |
|---|----------|----------|--------------|
| 3 | **HIGH** | 030_add_store_id_remaining_tables.sql (Zeile 59–106) | **rename_backshop_master_plu_item defekt:** Die Funktion fügt in `backshop_renamed_items` ein, ohne `store_id` zu setzen. Nach Migration 030 ist `store_id` NOT NULL und UNIQUE ist `(plu, store_id)`. Der INSERT schlägt fehl; `ON CONFLICT (plu)` ist ungültig (Constraint ist `(plu, store_id)`). **Fix:** `store_id` aus `get_current_store_id()` ermitteln und in den INSERT/ON CONFLICT einbeziehen. |
| 4 | **HIGH** | 030_add_store_id_remaining_tables.sql (Zeile 108–132) | **reset_backshop_master_plu_item_display_name:** Löscht mit `WHERE plu = v_plu` alle Einträge mit dieser PLU – also über alle Stores hinweg. Im Multi-Tenant-Modell sollte nur der aktuelle Store betroffen sein. **Fix:** `store_id = get_current_store_id()` in die WHERE-Klausel aufnehmen. |
| 5 | **HIGH** | 026_multi_tenancy_functions.sql (Zeile 6–52) | **SECURITY DEFINER ohne search_path:** `get_user_store_ids`, `get_current_store_id`, `get_store_company_id`, `get_home_store_subdomain` haben kein `SET search_path = public`. Bei search_path-Hijacking könnten bösartige Funktionen/Schemas aufgerufen werden. **Fix:** `SET search_path = public` zu allen SECURITY DEFINER-Funktionen hinzufügen. |

### MEDIUM

| # | Severity | Location | Beschreibung |
|---|----------|----------|--------------|
| 6 | **MEDIUM** | 026_multi_tenancy_functions.sql (Zeile 41–52) | **get_home_store_subdomain(p_user_id):** Erlaubt jedem authentifizierten User, die Heimatmarkt-Subdomain eines beliebigen Users abzufragen (Information Disclosure). **Fix:** Nur eigene User-ID erlauben oder Zugriff auf Admins beschränken. |
| 7 | **MEDIUM** | 002_rls_policies.sql (Zeile 27–29) | **profiles UPDATE:** Neben `current_store_id` können auch `email`, `display_name`, `personalnummer`, `created_by` etc. geändert werden. `created_by` sollte nicht änderbar sein. **Fix:** Policy einschränken oder Spalten-Whitelist (z.B. nur `display_name`, `current_store_id`) über Trigger/Policy. |
| 8 | **MEDIUM** | 027_multi_tenancy_rls_core_tables.sql (Zeile 17–36) | **stores: Überlappende Policies:** `super_admin_manage_stores` (FOR ALL) und `users_see_own_active_stores` (FOR SELECT) überlappen. Bei SELECT greifen beide – funktioniert, aber redundant. Kein Sicherheitsproblem, nur Klarheit. |

### LOW

| # | Severity | Location | Beschreibung |
|---|----------|----------|--------------|
| 9 | **LOW** | 021_multi_tenancy_core_tables.sql | **companies, stores, user_store_access, store_list_visibility:** RLS wird erst in 027 aktiviert. Zwischen 021 und 027 sind diese Tabellen ohne RLS – akzeptabel, da Migrationen als Superuser laufen. |
| 10 | **LOW** | 034_cleanup_orphaned_profiles.sql, 035_cleanup_orphaned_users_no_store.sql | Cleanup-Migrationen laufen als Superuser und umgehen RLS – korrekt. |

---

## Positive Befunde

- **RLS aktiv:** Alle Tabellen mit User-Daten (companies, stores, user_store_access, store_list_visibility, custom_products, hidden_items, version_notifications, plu_offer_items, backshop_*) haben RLS aktiviert.
- **Keine Rekursion:** Migration 033 behebt die Rekursion in user_store_access durch Nutzung von `get_user_store_ids()` (SECURITY DEFINER).
- **Rollen-Eskalation (role):** Migration 008 verhindert Änderung der eigenen Rolle über die UPDATE-Policy.
- **profiles:** Kein INSERT für normale User – nur über Trigger `handle_new_user()` (SECURITY DEFINER).
- **user_store_access:** Nur Admins können schreiben; normale User können sich nicht selbst Stores zuweisen.
- **SELECT-Policies:** Nutzer sehen nur Daten ihrer eigenen Stores (über `get_user_store_ids()`).
- **Write-Policies:** Schreiben nur im aktuellen Store (`get_current_store_id()`).

---

## Empfohlene Maßnahmen (Priorität)

1. **Sofort:** current_store_id in der profiles-UPDATE-Policy einschränken (Finding 1).
2. **Sofort:** handle_new_user: Rolle aus raw_user_meta_data validieren (Finding 2).
3. **Bald:** rename_backshop_master_plu_item und reset_backshop_master_plu_item für store_id anpassen (Finding 3, 4).
4. **Bald:** SET search_path = public für alle SECURITY DEFINER-Funktionen in 026 (Finding 5).
5. **Optional:** get_home_store_subdomain einschränken (Finding 6).
