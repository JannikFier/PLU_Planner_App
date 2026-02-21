# Features & Business-Regeln

## Implementierungs-Status

| Phase | Feature | Status |
|-------|---------|--------|
| Phase 1 | Auth, Login, Rollen, Dashboards, User-Verwaltung | Fertig |
| Phase 2 | PLU-Tabelle, KW-Auswahl, Hooks, Helper | Fertig |
| Phase 3 | Excel-Upload, KW-Vergleich, Konflikte | Fertig |
| Phase 4 | User-Features (eigene Produkte, Ausblenden, Benachrichtigungen) | Fertig (Runde 2) |
| Phase 5 | Admin-Features (Layout, Blöcke, Regeln, Versionen) | Fertig |
| Phase 5b | Layout + Regeln Rebuild (Live-Vorschau, SchlagwortManager, WarengruppenPanel, DnD-Sortierung, display_name, BY_BLOCK/ROW_BY_ROW/SEPARATED) | Fertig |
| Phase 6 | PDF-Export, Cron Jobs, Umbenennungen | Fertig (Runde 2) |
| Phase 7 | Deployment (Vercel) | Geplant |
| Backshop Phase 3 (A6) | Backshop-Liste + Upload (Routen, Dashboard-Karten, Tabelle Bild/PLU/Name, 3-Schritt-Upload) | Fertig |
| Backshop Layout/Regeln/Cron | Layout (Backshop), Inhalt & Regeln (Backshop), Block-Sort, Cron-Jobs für Backshop-KW-Wechsel | Fertig |

## Backshop-Liste (Phase 3)

Zweite PLU-Liste **Backshop** neben Obst/Gemüse: eigene Versionen, Master-Items (mit Bild), keine Stück/Gewicht-Typen. **Routen:** `/user/backshop-list`, `/viewer/backshop-list`, `/admin/backshop-list`, `/super-admin/backshop-list`, `/super-admin/backshop-upload`. **Dashboard:** In User-, Viewer-, Admin- und Super-Admin-Dashboard je zwei Karten: „PLU-Liste Obst/Gemüse“ und „PLU-Liste Backshop“. Super-Admin zusätzlich „Backshop Upload“. **Backshop-Liste-Seite:** Tabelle mit Spalten Bild, PLU, Name; KW-Auswahl; Titel „PLU-Liste Backshop“. **Backshop-Upload:** 3 Schritte (Dateien + Ziel-KW, Vergleich mit Bild-Erhalt, Einspielen); mehrere Excel werden zusammengeführt (PLU-Deduplizierung). Obst/Gemüse-Flows unverändert. **Backshop-Excel-Parser:** Spalten-Erkennung (PLU 5-stellig mit Normalisierung, Name, Abbildung/Bild), Namens-Bereinigung (bis erstes Komma); Details und Fehlerbehebung in [BACKSHOP_EXCEL_PARSER.md](BACKSHOP_EXCEL_PARSER.md).

**Backshop Layout & Regeln:** Super-Admin kann unter Konfiguration „Layout (Backshop)“ und „Inhalt & Regeln (Backshop)“ getrennt von Obst/Gemüse verwalten. Layout: **Anzeige** nur „Alle zusammen (alphabetisch)“ oder „Nach Warengruppen (alphabetisch)“; Flussrichtung (zeilen-/spaltenweise), Schriftgrößen, Markierungsdauer, Features (ohne separaten Warengruppen-Toggle – Warengruppen werden durch Anzeige „Nach Warengruppen“ freigeschaltet). Bei „Nach Warengruppen“ optional **„Jede Warengruppe auf eigener Seite“** für das PDF. Regeln: Bezeichnungsregeln (Schlagwort-Manager) und Warengruppen (Blöcke anlegen/zuweisen); bei Anzeige nach Warengruppen steht „Liste interaktiv bearbeiten“ für Drag-&-Drop-Sortierung zur Verfügung. **Drag-Overlay** in „Liste interaktiv bearbeiten“ und im Warengruppen-Panel folgt der Maus (snapCenterToCursor). **Rechte Spalte Warengruppen:** Ohne Gruppenauswahl werden nur unzugeordnete Produkte angezeigt; bei Klick auf eine Warengruppe nur deren Produkte (Falschzuordnungen korrigierbar per Zuweisen oder Drag auf andere Gruppe); optional „Zuordnung aufheben“. **Zuordnung nach Schlagwort:** Karte „Zuordnung nach Schlagwort“ auf der Regeln-Seite: Regeln „Schlagwort → Warengruppe“ (NAME_CONTAINS) anlegen/löschen, Button „Regeln jetzt anwenden“ (Standard: nur unzugeordnete zuordnen). **Nach Upload:** Hinweis auf fehlende Warengruppen-Zuordnung und Button „Warengruppen zuordnen“; auf der Regeln-Seite erscheint eine Info-Box mit der Anzahl unzugeordneter Artikel. **Backshop-Cron:** Drei pg_cron-Jobs (KW-Switch Samstag 23:59 UTC, Auto-Delete alte Versionen, Notification-Cleanup) nur für Backshop-Tabellen.

## Kern-Konzept

Der PLU Planner verwaltet wöchentliche Preis-Look-Up (PLU) Listen für Obst- und Gemüseabteilungen. Jede Kalenderwoche liefert die Zentrale neue Excel-Dateien, die hochgeladen und mit der Vorwoche verglichen werden. Es gibt **vier Rollen**: Super-Admin (Inhaber, alles inkl. Rollen tauschen), Admin (Benutzerverwaltung ohne Rollenänderung, PLU inkl. Umbenennen), User (volle PLU-Funktionen, keine Benutzerverwaltung), Viewer (nur PLU-Liste ansehen + PDF). Details in [ROLES_AND_PERMISSIONS.md](ROLES_AND_PERMISSIONS.md).

## Farbcodes

| Farbe | Code | Bedeutung | Wo sichtbar |
|-------|------|-----------|-------------|
| Gelb/Orange | `#F59E0B` | Neues Produkt (neu in dieser KW) | PLU-Feld in Tabelle + PDF |
| Rot | `#EF4444` | PLU geändert (gleicher Name, neue PLU) | PLU-Feld in Tabelle + PDF |
| Keine | – | Unverändert | Standard |

**Wichtig:** Markierungen sind **zeitlich begrenzt** (Layout: „Wie lange als neu anzeigen“, Standard 4 KW). **Master-Items** (aus Excel): „Neu“ nur für X KW ab der **Version-KW** (der KW, in der die Produkte hinzugefügt wurden). **Eigene Produkte:** „Neu“ für X KW ab `created_at`. Danach automatisch „unverändert“.

## Feature: Excel Upload & KW-Vergleich

### Ablauf

1. Super-Admin öffnet **PLU Upload** (eigene Seite `/super-admin/plu-upload`) – **3 Schritte:** (1) Dateien + Ziel-KW/Jahr, (2) Vorschau inkl. Vergleich, Konflikte, Einspielen, (3) Fertig.
2. **Ein Upload-Feld** für eine oder mehrere Excel-Dateien (max. 2 für den Vergleich); im Datei-Dialog können mehrere Dateien auf einmal ausgewählt werden.
3. **Auto-Erkennung:** Listentyp (Stück/Gewicht) wird aus dem **Excel-Inhalt** (erste Zeile/Header, z. B. „Gewicht“, „Stück“, „Stück ÜO“) und bei Bedarf aus dem Dateinamen erkannt. KW wird aus dem Dateinamen übernommen.
4. **Ziel-KW und Jahr** sind Dropdowns: KW nur **aktuelle ± 3** (z. B. bei KW 10: 7–13), Jahr nur **aktuelles Jahr ± 1**. Automatische Vorauswahl: nächste freie KW (bzw. aktuelle), aktuelles Jahr als Standard. Bei zwei Dateien: automatische Zuordnung (eine als Stück-, eine als Gewichtsliste); **manuelle Korrektur** pro Datei per Dropdown (Stück/Gewicht) möglich.
5. **Überschreibungs-Warnung:** Ist die gewählte Ziel-KW für das gewählte Jahr bereits in `versions` vorhanden, erscheint vor dem Vergleich ein Dialog mit der Wahl „Ziel-KW ändern“ oder „Überschreiben“. Bei „Überschreiben“ wird beim Einspielen die **bestehende Version für diese KW ersetzt** (kein zweiter Eintrag, keine Duplicate-Key-Fehler).
6. **Schritt 2 (Vorschau):** Einzeilige Statistik (Gesamt · Unverändert · Neu · PLU geändert · Entfernt · ggf. Konflikte). **„Neu“ und „Entfernt“ sind klickbar** und zeigen in einem Popover die Liste der betroffenen Produkte (PLU + Name). Darunter die **vollständige PLU-Liste** wie nach dem Einspielen (Layout-Engine + PLUTable, mit aktuellen Layout-Einstellungen), scrollbar. Falls Konflikte: Konflikt-Bereich im selben Schritt; Button „Konflikte speichern & einspielen“ bzw. „Ins System einspielen“.
7. Excel wird client-seitig geparst (xlsx Library)
8. Vergleich mit aktueller Version:
   - **Gleiche PLU + gleicher Name** → UNCHANGED
   - **Gleicher Name, andere PLU** → PLU_CHANGED_RED (rot)
   - **Komplett neues Produkt** → NEW_PRODUCT_YELLOW (gelb)
   - **Gleiche PLU, anderer Name** → KONFLIKT (User muss entscheiden)
   - **In alter Version, nicht in neuer** → ENTFERNT (wird nicht übernommen)
9. Super-Admin bestätigt → Neue Version wird erstellt (Schritt 3: Fertig)
10. Benachrichtigungen an alle User

Von der **Masterliste** aus führt der Button „Neuer Upload“ zur PLU-Upload-Seite.

### Wichtige Regeln

- Beim **allerersten Upload** (keine Vorversion): Alle Items = UNCHANGED
- **Duplikate in Excel**: Erste Occurrence gewinnt
- **User-eigene Produkte**: Werden beim Vergleich EXKLUDIERT
- PLU-Format: Genau 5 Ziffern (Regex: `/^\d{5}$/`)
- **Übersprungene Zeilen:** Pro Datei werden „X Zeilen · Y beim Einlesen übersprungen“ angezeigt; bei Y > 0 erscheint ein Hinweis (ungültige PLU, leerer Name, doppelte PLU). So ist transparent, ob Excel-Zeilen nicht übernommen wurden.

## Feature: Globale PLU-Liste (Runde 2)

Alle Rollen arbeiten an EINER gemeinsamen Liste. Änderungen gelten für alle.

### Eigene Produkte hinzufügen (custom_products)
- Alle Rollen können eigene Produkte hinzufügen. **Entweder PLU oder Preis:** PLU = 4 oder 5 Ziffern (ohne Dezimaltrenner), ODER Preis = Dezimalzahl (z.B. 1,50). Genau eines davon ist Pflicht. Name + Typ (+ optional Block/Warengruppe je nach Layout) wie bisher.
- Produkte ohne PLU (nur Preis): In der DB wird in `custom_products.plu` ein interner Platzhalter `price-{uuid}` gespeichert (NOT NULL UNIQUE); in der Anzeige erscheint in der PLU-Spalte „–“.
- **Preisanzeige in der Tabelle:** Bei eigenen Produkten mit Preis erscheint in der PLU-Tabelle (und Layout-Vorschau) in der Artikel-Spalte ein kompakter €-Preiskasten (z.B. „1,50 €“). Ohne Preis wird kein Preiskasten angezeigt.
- **Excel-Upload:** Nur **Super-Admin** sieht die Buttons „Per Excel hochladen“ (Eigene Produkte) und „Per Excel ausblenden“. Auf „Eigene & Ausgeblendete“ kann der Super-Admin eine Excel-Datei mit 3 Spalten (PLU oder Preis | Name | Warengruppe oder Stück/Gewicht je nach Layout) importieren. Bei fehlenden Angaben in Spalte 3 erscheint eine Vorschau mit Nachfrage (Dropdown pro Zeile); danach werden alle Produkte batchweise hinzugefügt.
- **„Von mir erstellt“:** In der Tabelle Eigene Produkte wird bei Einträgen, die der aktuelle User erstellt hat (`created_by`), ein Badge „Von mir erstellt“ angezeigt.
- Werden global gespeichert (nicht pro User)
- **Master hat Vorrang:** Wenn eine PLU sowohl in master_plu_items als auch in custom_products existiert, wird nur das Master-Item angezeigt. Das Custom Product wird "implizit pausiert".
- Gelb-Markierung ist **zeitlich begrenzt**: `created_at + mark_yellow_kw_count Wochen > jetzt` → gelb, danach UNCHANGED
- KW-unabhängig (bleiben über KW-Wechsel bestehen)

### Produkte ausblenden (hidden_items)
- Alle Rollen können Produkte global ausblenden
- Ausblenden ≠ Löschen: Produkte bleiben in der DB
- KW-unabhängig (bleiben über KW-Wechsel bestehen)
- Jeder kann Produkte auch wieder einblenden
- **Suchfunktion zum Ausblenden:** Auf der Masterliste gibt es ein Suchfeld; Treffer (PLU/Name) werden in einem Popover angezeigt, pro Treffer kann „Ausblenden“ geklickt werden.
- **Excel-Upload zum Ausblenden:** Nur Super-Admin sieht den Button. Auf „Eigene & Ausgeblendete“ in der Sektion Ausgeblendete Produkte: Button „Per Excel ausblenden“. Excel mit einer Spalte PLU-Nummern (eine pro Zeile); Vorschau „Diese Produkte werden ausgeblendet“, Bestätigung, dann batchweise in `hidden_items`.
- **„Von mir ausgeblendet“:** In der Tabelle Ausgeblendete Produkte wird bei Einträgen, die der aktuelle User ausgeblendet hat (`hidden_by`), zusätzlich „Von mir“ angezeigt.
- Verwaltung über die Seite **Eigene & Ausgeblendete** (`*/hidden-items`): zwei Sektionen – oben „Eigene Produkte“ (Liste + hinzufügen), darunter „Ausgeblendete Produkte“ (Einblenden, Per Excel ausblenden)

### Umbenennungen
- **Custom Products:** Ersteller oder Super-Admin kann umbenennen (z. B. auf der Seite Eigene Produkte).
- **Master Products:** Admin und Super-Admin können umbenennen.
  - **In der Masterliste** gibt es keinen Stift mehr an der Tabelle; stattdessen Toolbar-Button **„Umbenennen“** (zwischen „Ausgeblendete“ und „PDF“). Klick führt zur Seite **Umbenannte Produkte** (`/admin/renamed-products` bzw. `/super-admin/renamed-products`).
  - **Seite Umbenannte Produkte:** Liste aller umbenannten Master-Items (PLU, Original, Aktuell, Aktion „Zurücksetzen“). Oben rechts Button **„Produkte umbenennen“** öffnet einen Dialog mit der vollen PLU-Liste.
  - **Dialog „Produkte umbenennen“:** Einfache Suchleiste (PLU/Name) wie beim Dialog „Produkte ausblenden“ – filtert die Liste, Treffer werden hervorgehoben, optional Scroll zum ersten Treffer. Kein „X von Y“, keine Pfeil-Buttons. Pro Zeile ein Stift; Klick öffnet den Dialog „Produkt umbenennen“ (Neuer Name, optional Zurücksetzen). Nach Speichern bleibt der Dialog offen, die Listen werden aktualisiert.
  - Setzt `is_manually_renamed = true`; nur `display_name` wird geändert, `system_name` bleibt für Excel-Abgleich unverändert.
  - Layout-Engine überspringt dann Bezeichnungsregeln für dieses Item.
  - **Zurücksetzen:** Auf der Seite Umbenannte Produkte pro Zeile „Zurücksetzen“ (mit Bestätigung) → `display_name = system_name`, `is_manually_renamed = false`.
- **Suche in der Masterliste:** Die Find-in-Page-Suchleiste in der Masterliste ist aktuell **deaktiviert**. Zum Suchen in der PLU-Tabelle kann die Browser-Suche (z. B. Strg+F / Cmd+F) genutzt werden. Im Dialog „Produkte umbenennen“ gibt es weiterhin die Filter-Suche (PLU/Name) wie bei „Produkte ausblenden“, ohne Pfeile.

## Feature: Warengruppen (Blöcke)

Produkte können in logische Gruppen eingeteilt werden (z.B. "Exotik", "Regional").

### WarengruppenPanel (Split-Panel)
- **Links**: Liste aller Warengruppen mit Artikelanzahl, Erstellen/Umbenennen/Löschen
- **Rechts**: Alle Produkte mit Checkboxen, Suchfeld, Batch-Zuweisen an gewählte Gruppe

### WarengruppenSortierung
- Drag & Drop (`@dnd-kit`) + Pfeil-Buttons für Reihenfolge
- "Ohne Zuordnung" als letzte Zeile (nicht verschiebbar)

### Block-Regeln
Automatische Zuweisung basierend auf:
- **NAME_CONTAINS**: Name enthält bestimmtes Wort
- **NAME_REGEX**: Name matcht regulären Ausdruck
- **PLU_RANGE**: PLU liegt in einem Nummernbereich

### Zuweisungspriorität
Excel-Category (niedrigste) → Custom Block Rule → Manuelle Zuweisung (höchste)

## Feature: Bezeichnungsregeln

Automatische Namensanpassungen für die Anzeige:
- "Bio" immer als Prefix → "Bio Banane" statt "Banane (Bio)"
- "Fairtrade" als Suffix → "Banane Fairtrade"
- Wird auf `display_name` angewandt, nicht auf `system_name`
- **SchlagwortManager-Dialog**: Live-Feedback bei Eingabe (X Produkte enthalten...), Vorher/Nachher-Liste
- `keyword-rules.ts`: Pure Functions (`normalizeKeywordInName`, `isAlreadyCorrect`, `applyAllRulesToItems`)

## Feature: Layout-Konfiguration

Der Super-Admin kann einstellen. Die Layout-Seite zeigt eine **Live-Vorschau** mit echten PLU-Daten, die sich sofort bei jeder Änderung aktualisiert.

| Einstellung | Optionen | UI |
|-------------|---------|-----|
| Sortierung | Alphabetisch (A-Z) oder nach Warengruppen | Radio-Cards |
| Anzeige-Modus | Gemischt (Stück+Gewicht) oder Getrennt | Radio-Cards |
| Flussrichtung | Zeilenweise (→↓) oder Spaltenweise (↓→) | Radio-Cards |
| Schriftgrößen | Header, Spalte, Produkt (in px) | Number-Inputs |
| Markierungs-Dauer | Rot: 1-4 KWs, Gelb: 1-4 KWs | Selects |
| Features Ein/Aus | Eigene Produkte, Ausblenden, Blöcke, Regeln | Switches |

### Layout: Zwei-Spalten (Settings + Preview)
- Links: Alle Einstellungen in Cards mit Radio-Buttons
- Rechts: `LayoutPreview` Komponente (sticky, reaktiv auf lokalen Form-State)

## Feature: PDF-Export (Runde 2)

- Client-seitig mit jsPDF (kein Server nötig)
- A4 Portrait, Zwei-Spalten-Layout
- Farbmarkierung NUR auf PLU-Zelle (gelb = neu, rot = PLU geändert)
- Buchstaben-Header (— A —) bei alphabetischer Sortierung
- Block-Header bei Warengruppen-Sortierung
- Automatischer Seitenumbruch mit wiederholtem Spalten-Header
- Footer: KW, Datum, Seitenzahl
- Basiert auf der globalen Liste (nach Layout-Engine: eigene Produkte drin, ausgeblendete entfernt)
- Unterstützt MIXED/SEPARATED und ROW_BY_ROW/COLUMN_FIRST
- Schriftgrößen aus Layout-Einstellungen (font_header_px, font_column_px, font_product_px) werden ins PDF übernommen
- Tabellen-Design: Header „PLU“ und „Artikel“ ohne vertikale Linien; Mitte eine Mittellinie (keine weißen Kästen); Strich vor Preis nur wenn Produkt einen Preis hat
- Zebra-Striping (grau-weiß) bleibt erhalten
- ExportPDFDialog zeigt Vorschau-Infos vor dem Download

## Feature: KW-Versionen

- Jede Kalenderwoche hat eine eigene Version
- Status-Lifecycle: `draft` → `active` → `frozen` → gelöscht
- Nur eine Version kann gleichzeitig `active` sein
- Cron Job wechselt jeden Samstag 23:59 automatisch
- Frozen-Versionen werden nach 7 Tagen auto-gelöscht

## Feature: Benachrichtigungen (Runde 2)

Nach einem KW-Upload erhalten alle User (außer dem Uploader) eine Benachrichtigung:
- Ein Eintrag pro User pro Version in `version_notifications` (gelesen/ungelesen)
- **NotificationBell** im AppHeader zeigt Badge mit Anzahl ungelesener Notifications (nur Admin/User; Super-Admin sieht die Glocke nicht, da er als Uploader keine Notifications erhält – nutzt stattdessen die Karte „Benachrichtigungen“ auf dem Dashboard)
- NotificationDialog zeigt neue und geänderte PLUs der Version (diese Woche hinzugefügt bzw. PLU geändert) mit "Ausblenden"-Option
- "Gelesen" markiert die Notification als gelesen
- Ausblenden-Aktion im Dialog schreibt in `hidden_items` (global)

## Cron Jobs

| Job | Zeitplan | Funktion |
|-----|---------|----------|
| KW-Switch | Sa 23:59 | Aktive Version einfrieren, nächste aktivieren |
| Auto-Delete | Täglich 02:00 | Alte frozen Versionen löschen (nach delete_after) |
| Notification Cleanup | Täglich 03:00 | Erledigte Notifications nach 30 Tagen löschen |
