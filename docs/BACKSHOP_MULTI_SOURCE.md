# Backshop Multi-Source (Edeka · Harry · Aryzta)

Dieses Feature erweitert den Backshop um drei parallele Quellen pro zentraler Master-Version und einen Entscheidungs-Flow pro Markt.

## Ziel

- Drei Uploads: Edeka-Kassenblatt, Harry-Liste, Aryzta-Liste.
- Zentral gepflegt (Super-Admin), pro Markt entscheidet der User/Admin, welche Marke pro Produktgruppe sichtbar ist.
- Angebote und Preise laufen weiterhin nur über die Edeka-Ebene.

## Drei Upload-Flows

Super-Admin: **Übersicht** unter `/super-admin/backshop-upload` – drei Karten (Edeka, Harry, Aryzta). Pro Karte startet ein **eigener mehrstufiger Assistent** unter `/super-admin/backshop-upload/{edeka|harry|aryzta}` mit eigenen URLs: Datei & KW → Vergleich → Warengruppen → Vorschau → Erfolg. Zustand (`useBackshopUpload` + `BackshopUploadWizardProvider`) bleibt pro Quelle beim Wechsel zwischen diesen Schritten erhalten.

| Quelle | Einstieg | Technisch |
| --- | --- | --- |
| Edeka | Karte auf `/super-admin/backshop-upload` → Wizard `/super-admin/backshop-upload/edeka` | `BackshopUploadWizardLayout` + Schritte in `src/pages/backshop-upload/` |
| Harry | wie oben; alte URL `/super-admin/backshop-harry-upload` → Redirect nach `/super-admin/backshop-upload/harry` | `source="harry"` |
| Aryzta | wie oben; `/super-admin/backshop-aryzta-upload` → `/super-admin/backshop-upload/aryzta` | `source="aryzta"` |

Parser: `src/lib/backshop-excel-parser.ts` erkennt PLU / Name / Bild per Heuristik (5-Steller-ZWS-PLU bevorzugt). Das Ergebnis enthält `detectedLayout`: `classic_rows` (eine Zeile = ein Produkt) oder `kassenblatt_blocks` (ein Produkt pro Spalte, Block-Zeilen). Bei Unsicherheit öffnet sich der Dialog **Excel-Layout anpassen** (`BackshopColumnMappingDialog`) automatisch, wenn die Auto-Erkennung > 30 % der Zeilen überspringt oder weniger als 3 Produkte findet; per Button **Layout prüfen / anpassen** kann er jederzeit geöffnet werden. Im Dialog sieht man die letzte Auto-Analyse (Layout + Trefferzahlen) und kann zwischen **Klassisch** und **Kassenblatt (Block)** wählen; Vorschau großflächig mit horizontalem/vertikalem Scroll. Bei **.xlsx** werden eingebettete Grafiken an der Zellposition als kleine Miniatur geladen (gleiche Extraktion wie beim Upload), nicht nur als Textplatzhalter. Ebenfalls: Header-Dropdown „keine Kopfzeile" und Bildzellen-Preview als `[Bild]` statt `[object Object]`.

**Bild-Upload mit Retry:** Supabase-Storage-Uploads laufen mit 3 Versuchen und Exponential Backoff (500 ms/1 s/2 s). Transiente 5xx/Timeout-Fehler blockieren damit nicht mehr den gesamten Batch. Ein Toast meldet, wenn nach allen Versuchen einzelne Bilder fehlschlagen.

Publish (`src/lib/publish-backshop-version.ts`): Beim Publish werden nur die Zeilen der **hochgeladenen Quelle** für die Ziel-KW ersetzt; alle anderen Marken bleiben erhalten. Dafür werden Items anderer Quellen aus **Ziel-KW** und **aktiver Version** nach `(plu, source)` zusammengeführt: **Ziel-KW hat Vorrang vor Active** (falls die Ziel-KW nicht dieselbe Zeile wie die aktive Version ist). So gehen gespeicherte Daten anderer Marken nicht verloren, wenn die Ziel-KW z. B. eingefroren war und gerade nicht aktiv ist.

**Vergleich vor dem Upload** (`useBackshopUpload` → `startComparison`): Die Vorschau NEW/CHANGED/UNCHANGED bezieht sich nur auf die **jeweilige Quelle** (aktive und eingefrorene Items werden mit `.eq('source', …)` geladen). Der erste Upload einer Marke gilt, sobald für diese Quelle noch keine Zeilen in der aktiven Version liegen — auch wenn andere Marken schon Daten haben.

Anschließend läuft `syncProductGroupsAfterPublish`, das Produkte mit gleichem normalisierten Namen aus unterschiedlichen Quellen automatisch in `backshop_product_groups` gruppiert.

**Dialog „Daten für diese KW schon vorhanden“** erscheint nur, wenn für die gewählte Kalenderwoche **bereits Zeilen dieser Quelle** existieren — nicht nur, weil die KW als Version angelegt ist (andere Marken ohne Konflikt).

## Datenmodell (Migration 059)

- `backshop_master_plu_items.source` (`edeka | harry | aryzta`, default `edeka`)
- Unique-Constraint: `(version_id, source, plu)` statt `(version_id, plu)`
- `backshop_product_groups` – globale Produktgruppen über Versionen hinweg, optional `block_id`, `needs_review`, `origin (auto|manual)`
- `backshop_product_group_members (group_id, plu, source)` – eine `(plu, source)` gehört max. in eine Gruppe
- `backshop_source_choice_per_store (store_id, group_id, chosen_sources TEXT[], origin)` – Markt-Wahl (leeres Array = noch keine Entscheidung)
- `backshop_source_rules_per_store (store_id, block_id, preferred_source)` – Grundregel pro Warengruppe

RLS: Gruppen & Members sind global lesbar, schreibbar nur Super-Admin. Source-Choice darf User/Admin/Super-Admin für den eigenen/ausgewählten Markt setzen, Viewer nicht. Source-Rules sind Admin/Super-Admin.

## Produktgruppen-Auflösung (effektive Liste)

Die Anzeige der Mitglieder (Namen, Bild, `block_id`) in der Produktgruppen-Übersicht, im manuellen Gruppen-Editor und in der Marken-Auswahl nutzt `useBackshopProductGroups` mit **`resolvedItems`**. Die verwendete **Versions-ID** entspricht `useActiveBackshopVersion`: zuerst `backshop_versions.status = 'active'`, sonst die **neueste** Version nach Jahr/KW (`resolveEffectiveBackshopVersionId` in `src/lib/backshop-effective-version-id.ts`). Diese Auflösung folgt der **effektiven** Backshop-Liste wie die Masterliste: `backshop_master_plu_items` dieser Version plus marktspezifisches `store_list_carryover` (`list_type === 'backshop'`, `for_version_id` = aktive Version, nur Zeilen mit `market_include === true`). Die Merge-Regel entspricht der ersten Stufe in `buildBackshopDisplayList` (siehe `src/lib/layout-engine.ts` und `src/lib/backshop-merge-master-with-carryover.ts`: Carryover-Zeile nur, wenn die **PLU** im Roh-Master der Version nicht vorkommt). **Ohne gewählten Markt** (z. B. Super-Admin ohne Marktkontext) gibt es kein Carryover; es werden nur die zentralen Master-Zeilen verwendet. Fehlt ein `(plu, source)` auch nach diesem Merge, bleibt der Hinweis „(nicht in aktiver Version)“ (Artikel in keiner gültigen Zeilenmenge mehr).

## Produktgruppen-Review (Super-Admin)

Seite `/super-admin/backshop-product-groups` (Hub-Kachel "Produktgruppen (Marken)") zeigt alle Gruppen mit Members. Aktionen:

- Gruppe umbenennen
- Einzel-Members aus Gruppe entfernen
- Gruppe löschen
- `needs_review` toggeln (markiert das System nach Auto-Matches, wenn Namen unklar sind)
- **Neue Gruppe (manuell)** führt zu **`/super-admin/backshop-product-groups/neu`**: Kachel-Editor (`SuperAdminBackshopProductGroupComposePage`) – links Warengruppen, Mitte nur dort scrollbar (Kacheln), rechts fester Kopf (Anzeigename wird beim ersten Artikel vorbelegt, Warengruppe der Gruppe folgt der linken Auswahl), scrollbare Auswahl, unten **Abbrechen** / **Gruppe anlegen**; Artikel, die schon einer anderen Produktgruppe angehören, können hier nicht übernommen werden (ohne Verschieben). Persistenz: `useCreateManualBackshopProductGroup` + `useApplyBackshopProductGroupMembers`.
- **Mitglieder hinzufügen** (Button pro Gruppe): Dialog `BackshopProductGroupMemberPickerDialog` mit Tabs **Ähnlich** (Anker-Text + erklärbare Treffer/Score), **Suche** (Name/PLU), **Enthält** (Teilstring, optional ohne Groß-/Kleinschreibung). Auswahl mit Legende (frei / andere Gruppe), optional **Verschieben aus anderen Produktgruppen** (löscht die alte Zuordnung), dann **Vorschau** und **Übernehmen**. Logik clientseitig in `src/lib/backshop-product-group-member-picker.ts` (keine Änderung der Auto-Gruppierung beim Publish).

## Marken-Tinder (Markt-Entscheidung)

Seite `/{role}/marken-auswahl` (Button "Marken-Auswahl" im Backshop; alte URL `backshop-marken-tinder` leitet um). **Einzel-Entscheidung pro Produktgruppe:** Quellen pro Karte toggeln oder per Doppelklick nur eine Marke. **Keine** gewählte Marke in der DB (`chosen_sources` leer) = in der Masterliste erscheinen **alle** Member-PLUs der Gruppe. **Alle** Karten einer Gruppe aktiv = wird beim Weiterlauf als volle `chosen_sources`-Liste persistiert. **Grundregeln pro Warengruppe** (Bulk) liegen separat unter `/{admin|super-admin}/backshop-gruppenregeln` (Link für Admin+ in der Marken-Auswahl).

`?focusGroup=<group_uuid>` in der URL springt im Tinder zur passenden Gruppe (wird danach aus der URL entfernt).

## Anzeige-Logik in der Masterliste

`buildBackshopDisplayList` (`src/lib/layout-engine.ts`) verarbeitet Multi-Source so (pro Gruppe, anhand `memberSourcesByGroup` + `chosen_sources` + optional `groupBlockIdByGroupId` für den Fallback):

- **Leere Wahl** (`chosen_sources` fehlt oder `[]`): Wenn die Produktgruppe einer **Warengruppe** (`block_id`) zugeordnet ist und für diese Warengruppe eine **Grundregel** (`backshop_source_rules_per_store.preferred_source`) existiert und diese Quelle in der Gruppe vorkommt, gilt dieselbe Marke wie bei Einzelartikeln ohne Gruppe (**nur** diese Quelle sichtbar, plus Angebots-Ausnahme). Ohne passende Grundregel oder ohne `block_id` an der Gruppe → **alle** Member-Quellen sichtbar.
- **Echte Teilmenge** (mindestens eine, aber nicht alle Quellen der Gruppe gewählt) → nur gewählte Quellen; **Angebote** der KW können nicht gewählte Zeilen trotzdem sichtbar lassen (unverändert). In der **digitalen** Tabelle: dezenter Link „weitere Marke(n)“ → Marken-Tinder mit `focusGroup`.
- **Volle Menge** (alle Member-Quellen in `chosen_sources`) → alle Zeilen, kein Hinweis (bewusst alle Marken trotz Grundregel).
- Einzel-Items **ohne Gruppe** → ggf. Warengruppen-Regel `backshop_source_rules_per_store` (unverändert).
- **Offer-Guard** wie bisher (z. B. zentrale Werbung nur auf Edeka-Markierung).

`DisplayItem`: u. a. `backshop_source`, optional `backshop_tinder_group_id` + `backshop_other_group_sources_count` (nur digital, nicht PDF).

Der digitale Renderer (`PLUTable`) zeigt die Marken-Badge und ggf. den Tinder-Hinweis. PDF: keine Extra-Zeilen für Hinweise; Platzhalterzeilen „⚠ Mehrere Marken“ werden nicht mehr erzeugt.

## PDF-Regeln (Konflikte)

- **User/Admin/Viewer/Super-Admin:** PDF-Export der Backshop-Liste **nicht** wegen fehlender Marken-Entscheidung pro Gruppe blockiert. (Früher: Sperre bei „offenen“ Gruppen – entfallen.)

## Hooks

- `useBackshopProductGroups` – lädt Gruppen + Members und resolved gegen die aktive Version
- `useBackshopSourceChoicesForStore`, `useSaveBackshopSourceChoice`, `useBulkApplyBackshopSourceChoice`
- `useBackshopSourceRulesForStore`, `useSaveBackshopSourceRule`, `useDeleteBackshopSourceRule`

Alle drei Query-Keys stehen in der Persist-Allowlist (`src/lib/query-persist-allowlist.ts`).

## Konstanten & Helfer

`src/lib/backshop-sources.ts`:
- `BACKSHOP_SOURCES`, `BACKSHOP_SOURCE_META` (Label/Kurz/Farben)
- `backshopSourceLabel`, `backshopSourceShort`
- `normalizeBackshopGroupName(name)` für Gruppen-Matching

Badges/Filter:
- `BackshopSourceBadge` – farbige Badge (E/H/A), Hover zeigt voller Markenname
- `BackshopSourceFilterChips` – Mehrfachauswahl mit optionalen Counts
