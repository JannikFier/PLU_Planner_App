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
| Kassen | Kassen-Login, PLU-Listen, marktspezifischer Link; Meldungen (fehlt/falsch) ohne Stammdaten-Edit | Spezifikation in [FEATURE_KASSEN_SPEC.md](FEATURE_KASSEN_SPEC.md) |

## Kassen (geplant)

Kassen sind ein eigener Benutzertyp für Mitarbeiter an der Kasse. Sie bekommen ein Tablet und sehen die PLU-Listen (Obst/Gemüse + Backshop); **Stammdaten** werden nicht an der Kasse geändert, aber **Meldungen** (z. B. Produkt fehlt, Name/PLU/Bild falsch) sind vorgesehen – mit **Hinweisen in den jeweiligen Listen** (Obst/Gemüse bzw. Backshop), damit die Abteilung sieht: *an der Kasse wurde das gemeldet*. Der Markt wird über den Link (Subdomain) bestimmt. Vollständige Spezifikation: [FEATURE_KASSEN_SPEC.md](FEATURE_KASSEN_SPEC.md).

## Backshop-Liste (Phase 3)

Zweite PLU-Liste **Backshop** neben Obst/Gemüse: eigene Versionen, Master-Items (mit Bild), keine Stück/Gewicht-Typen. **Routen:** `/user/backshop-list`, `/viewer/backshop-list`, `/admin/backshop-list`, `/super-admin/backshop-list`, `/super-admin/backshop-upload`. **Dashboard:** In User-, Viewer-, Admin- und Super-Admin-Dashboard je zwei Karten: „PLU-Liste Obst/Gemüse“ und „PLU-Liste Backshop“. Super-Admin zusätzlich „Backshop Upload“. **Backshop-Liste-Seite:** Tabelle mit Spalten Bild, PLU, Name; KW-Auswahl; Titel „PLU-Liste Backshop“. **Backshop-Upload:** 3 Schritte (Dateien + Ziel-KW, Vergleich mit Bild-Erhalt, Einspielen); mehrere Excel werden zusammengeführt (PLU-Deduplizierung). Obst/Gemüse-Flows unverändert. **Backshop-Excel-Parser:** Spalten-Erkennung (PLU 5-stellig mit Normalisierung, Name, Abbildung/Bild), Namens-Bereinigung (bis erstes Komma); Details und Fehlerbehebung in [BACKSHOP_EXCEL_PARSER.md](BACKSHOP_EXCEL_PARSER.md).

**Backshop Layout & Regeln:** Super-Admin kann unter Konfiguration „Layout (Backshop)“ und „Inhalt & Regeln (Backshop)“ getrennt von Obst/Gemüse verwalten. Layout: **Anzeige** nur „Alle zusammen (alphabetisch)“ oder „Nach Warengruppen (alphabetisch)“; Flussrichtung (zeilen-/spaltenweise), Schriftgrößen, Markierungsdauer, Features (ohne separaten Warengruppen-Toggle – Warengruppen werden durch Anzeige „Nach Warengruppen“ freigeschaltet). Bei „Nach Warengruppen“ optional **„Vorschau: eine Seite pro Warengruppe“** (nur die Live-Vorschau in den Layout-Einstellungen; das PDF bricht platzsparend nach Höhe um, mehrere kurze Gruppen können auf einer Seite stehen). Regeln: Bezeichnungsregeln (Schlagwort-Manager) und Warengruppen (Blöcke anlegen/zuweisen); bei Anzeige nach Warengruppen steht „Liste interaktiv bearbeiten“ für Drag-&-Drop-Sortierung zur Verfügung. **Drag-Overlay** in „Liste interaktiv bearbeiten“ und im Warengruppen-Panel folgt der Maus (snapCenterToCursor). **Rechte Spalte Warengruppen:** Ohne Gruppenauswahl werden nur unzugeordnete Produkte angezeigt; bei Klick auf eine Warengruppe nur deren Produkte (Falschzuordnungen korrigierbar per Zuweisen oder Drag auf andere Gruppe); optional „Zuordnung aufheben“. **Zuordnung nach Schlagwort:** Karte „Zuordnung nach Schlagwort“ auf der Regeln-Seite: Regeln „Schlagwort → Warengruppe“ (NAME_CONTAINS) anlegen/löschen, Button „Regeln jetzt anwenden“ (Standard: nur unzugeordnete zuordnen). **Nach Upload:** Hinweis auf fehlende Warengruppen-Zuordnung und Button „Warengruppen zuordnen“; auf der Regeln-Seite erscheint eine Info-Box mit der Anzahl unzugeordneter Artikel. **Backshop-Cron:** Drei pg_cron-Jobs (KW-Switch Samstag 23:59 UTC, Auto-Delete alte Versionen, Notification-Cleanup) nur für Backshop-Tabellen.

## Per-User Bereichs-Sichtbarkeit

Admin und Super-Admin können in der Benutzerverwaltung pro User einstellen, welche Bereiche (Obst/Gemüse, Backshop) sichtbar sind. Button "Bereiche" in der User-Tabelle öffnet einen Dialog mit Checkboxen. Tabelle: `user_list_visibility` (Migration 038). Default: Beide sichtbar (kein Eintrag = sichtbar). Die Dashboards (UserDashboard, AdminDashboard) zeigen nur die freigeschalteten Bereiche.

## S/W-taugliche PDF-Markierungen

Die PDF-Statusmarkierungen sind auch in Schwarz-Weiss erkennbar: Neues Produkt = gestrichelter Rahmen, PLU geändert = fetter Rahmen. Zusätzlich zur Farbmarkierung (gelb/rot).

## Responsive Listen (Handy/Tablet)

Seiten mit **breiten Tabellen** (viele Spalten, Badges, Buttons) liefern auf schmalen Viewports eine **zweite Darstellung**: kompakte **Listen/Karten** (eine Zeile pro Eintrag), **Symbole** für Aktionen mit Beschriftung in Tooltips/`aria-label`, analog zu **Eigene Produkte (Backshop)**. Desktop bleibt bei Tabellenansicht ab **`md`**. Technische Leitlinie: [.cursor/rules/mobile-responsive-lists.mdc](../.cursor/rules/mobile-responsive-lists.mdc).

**Desktop-Layout Verwaltungslisten:** Backshop-Tabellen nutzen **große Bildvorschau** (Thumbnail-Größe `2xl`, 96×96 px) in einer festen ersten Spalte; **Obst & Gemüse** dieselben Seiten **ohne Bildspalte**, dafür **`table-fixed`** mit breiterer **Name/Artikel-Spalte**, damit der Inhalt den Platz nutzt. Zellen sind vertikal **mittig** ausgerichtet, wo sinnvoll.

## Kern-Konzept

Der PLU Planner verwaltet wöchentliche Preis-Look-Up (PLU) Listen für Obst- und Gemüseabteilungen. Jede Kalenderwoche liefert die Zentrale neue Excel-Dateien, die hochgeladen und mit der Vorwoche verglichen werden. Es gibt **vier Rollen**: Super-Admin (Inhaber, alles inkl. Rollen tauschen), Admin (Benutzerverwaltung ohne Rollenänderung, PLU inkl. Umbenennen), User (volle PLU-Funktionen, keine Benutzerverwaltung), Viewer (nur PLU-Liste ansehen + PDF). Details in [ROLES_AND_PERMISSIONS.md](ROLES_AND_PERMISSIONS.md).

## Super-Admin User-Vorschau

Super-Admins können über das Profil-Menü **„User-Vorschau (Firma & Markt)“** einen Dialog öffnen, **Firma**, **Markt** und eine simulierte Rolle (**User**, **Viewer** oder **Admin**) wählen und landen anschließend im jeweiligen Bereich (`/user`, `/viewer`, `/admin`) mit gesetztem Markt-Kontext. **Zur Super-Admin-Ansicht** beendet die Vorschau und stellt den vorherigen Marktzustand wieder her (ohne `current_store_id` während der Vorschau zu überschreiben). Die Vorschau steuert **Oberfläche und Navigation**; sie ersetzt **keine** echte Identitäts-Impersonation – datenbankseitig gilt weiterhin die Super-Admin-Session (siehe [SECURITY_LIVING.md](SECURITY_LIVING.md)).

## Farbcodes

| Farbe | Code | Bedeutung | Wo sichtbar |
|-------|------|-----------|-------------|
| Gelb/Orange | `#F59E0B` | Neues Produkt (neu in dieser KW) | PLU-Feld in Tabelle + PDF |
| Rot | `#EF4444` | PLU geändert (gleicher Name, neue PLU) | PLU-Feld in Tabelle + PDF |
| Keine | – | Unverändert | Standard |

**Wichtig:** Markierungen sind **zeitlich begrenzt** (Layout: „Wie lange als neu anzeigen“, Standard 4 KW). **Master-Items** (aus Excel): „Neu“-Gelb für X Kalenderwochen ab dem **Einführungsdatum** (`created_at` der Zeile), nicht ab der angezeigten Listen-Version. **Eigene Produkte:** „Neu“ für X KW ab `created_at` (ISO-KW-Abstand). Danach automatisch „unverändert“.

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

### Masterliste – KW in der Toolbar
- **Obst/Gemüse:** Seitenüberschrift **„PLU Obst und Gemüse“** (`*/masterlist`). Neben dem Anzeigemodus (Stück/Gewicht) wird nur die **KW der zuletzt eingespielten Liste** angezeigt (`Liste …` = `kw_label` der aktiven Version).
- **Backshop:** Eine Zeile für den **Zeitraum der aktuellen Liste** (Einspiel-KW bis heute, ISO-8601): in der **ersten Woche** nach dem Upload nur `KW 10 · 2026` oder `KW 21 · 2026`; danach **Bereich** z. B. `KW 10 – KW 14 · 2026` (die zweite Zahl steigt wöchentlich, bis eine neue Liste eingespielt wird). Am **Jahreswechsel** z. B. `KW 52 · 2026 – KW 2 · 2027`.
- Kalenderwochen werden **einheitlich nach ISO-8601** berechnet (`getISOWeek` / ISO-Kalenderjahr), damit die Anzeige mit der üblichen deutschen KW-Zählung übereinstimmt.

### Eigene Produkte hinzufügen (custom_products)
- Alle Rollen können eigene Produkte hinzufügen. **Entweder PLU oder Preis:** PLU = 4 oder 5 Ziffern (ohne Dezimaltrenner), ODER Preis = Dezimalzahl (z.B. 1,50). Genau eines davon ist Pflicht. Name + Typ (+ optional Block/Warengruppe je nach Layout) wie bisher.
- Produkte ohne PLU (nur Preis): In der DB wird in `custom_products.plu` ein interner Platzhalter `price-{uuid}` gespeichert (NOT NULL UNIQUE); in der Anzeige erscheint in der PLU-Spalte „–“.
- **Preisanzeige in der Tabelle:** Bei eigenen Produkten mit Preis erscheint in der PLU-Tabelle (und Layout-Vorschau) in der Artikel-Spalte ein kompakter €-Preiskasten (z.B. „1,50 €“). Ohne Preis wird kein Preiskasten angezeigt.
- **Excel-Upload:** Nur **Super-Admin** sieht die Buttons „Per Excel hochladen“ (Eigene Produkte) und „Per Excel ausblenden“. Auf „Eigene & Ausgeblendete“ kann der Super-Admin eine Excel-Datei mit 3 Spalten (PLU oder Preis | Name | Warengruppe oder Stück/Gewicht je nach Layout) importieren. Bei fehlenden Angaben in Spalte 3 erscheint eine Vorschau mit Nachfrage (Dropdown pro Zeile); danach werden alle Produkte batchweise hinzugefügt.
- **„Von mir erstellt“:** In der Tabelle Eigene Produkte wird bei Einträgen, die der aktuelle User erstellt hat (`created_by`), ein Badge „Von mir erstellt“ angezeigt (nur in der **Desktop-Tabellenansicht** ab Bildschirmbreite `md`).
- **Schmale Bildschirme (Handy):** Seiten **Eigene Produkte** und **Eigene Produkte (Backshop)** zeigen unter `md` eine **kompakte Liste** (PLU, Name, ggf. zweite Zeile mit Stück/Gewicht · Preis · Warengruppe je nach Layout/Daten; Backshop mit Vorschaubild) und **Icon-Aktionen** statt breiter Tabelle – ohne horizontales Scrollen der Seite. Desktop bleibt die volle Tabelle.
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
- **Backshop** (`backshop_hidden_items`): Auf **Ausgeblendete Produkte (Backshop)** gruppiert der Dialog „Produkte ausblenden (Backshop)“ wie die Backshop-Masterliste (alphabetisch vs. nach Warengruppe inkl. Markt-Block-Reihenfolge und namensbasierte Block-Overrides); angezeigte Namen berücksichtigen globale Backshop-Umbenennungen. Entspricht der Logik des Dialogs „Produkte ausblenden“ bei Obst/Gemüse.
- **Zentrale Werbung vs. Ausblendung:** Steht eine PLU in der **aktuell geladenen** zentralen Werbekampagne (Obst/Gemüse bzw. Backshop, dieselbe KW-Logik wie in der App), erscheint sie in **Hauptliste und PDF** trotz Eintrag in `hidden_items` / `backshop_hidden_items`; die Ausblend-Zeile in der DB bleibt. Sobald die PLU **nicht mehr** in dieser Kampagne vorkommt (neuer Upload ohne die PLU, leere Kampagne, oder KW-Wechsel ohne passende Kampagne), ist die Ausblendung für die Anzeige wieder wirksam. Auf den Seiten „Ausgeblendete Produkte“ kann ein Badge **„Sichtbar durch Werbung“** erscheinen. **Manuelle** Werbung (`plu_offer_items` / `backshop_offer_items`) ändert diese Logik nicht.

### Werbung/Angebot (plu_offer_items / backshop_offer_items)
- **User, Admin und Super-Admin** können Produkte als „Angebot“ markieren (Viewer nur Lesen).
- **Laufzeit (manuell):** Beim Hinzufügen werden **Aktionspreis** (Pflicht), Laufzeit 1–4 Wochen und Start = aktuelle KW gewählt. Nach Ablauf gilt das Produkt nicht mehr als Angebot.
- **Zentrale Werbung (Super-Admin):** Getrennt für Obst/Gemüse und Backshop. Exit-Excel (Spalten u. a. Art. Nr., Artikel, Akt. UVP) unter `/super-admin/central-werbung/obst` bzw. `/super-admin/central-werbung/backshop` hochladen; Zuordnung Excel-Zeile → PLU aus der **aktiven Masterliste**; Speichern ersetzt die Kampagne für die gewählte ISO-KW. **Megafon aus** pro Markt (`obst_offer_store_disabled` / `backshop_offer_store_disabled`): zentrale Zeile wird vor Ort ausgegraut und nicht als Werbung in Liste/PDF gezählt (persistiert pro PLU/Markt bis wieder eingeschaltet). **Interaktion mit Ausblendung:** siehe oben unter „Produkte ausblenden“ (zentrale Kampagne kann die **Anzeige** der Ausblendung vorübergehend übersteuern).
- **Toolbar:** In der Masterliste (Obst/Gemüse und Backshop) zwischen „Ausgeblendete“ und „Umbenennen“: Button **„Werbung“** → Seite **Produkte in der Werbung** (`*/offer-products` bzw. `*/backshop-offer-products`).
- **Seite Werbung:** Zwei Sektionen (oben zentral, unten eigen), Sortierung wie Hauptliste. Liste mit PLU, Artikel, Laufzeit, Aktionspreis, Megafon-Toggle (zentral), **„Aus Werbung entfernen“**, **„Produkte zur Werbung hinzufügen“** (Dialog mit Aktionspreis; zentrale PLUs sind blockiert).
- **Excel-Import (manuell):** Super-Admin kann **„Per Excel hinzufügen“**: Spalte 1 = PLU, 2 = Name (optional), 3 = Wochen (1–4). Start = aktuelle KW.
- **Anzeige:** In der PLU-Tabelle: Badge/Icons für zentrale vs. eigene Werbung, **Aktionspreis** in der Preis-Spalte (Obst und Backshop). Im PDF: **Volle Liste** mit **Angebots-Hinweisen** (Megafon, hervorgehobener Preis) oder **ohne** diese Darstellung (**alle Produkte** bleiben drin) oder **Nur Angebote**; Dateiname bei Variante ohne Hinweise mit Suffix `_ohne-Werbungshinweise`; Angebots-PDF mit angepasstem Titel.
- **Obst/Gemüse und Backshop** getrennt (eigene Tabellen, Kampagnen und Seiten).

### Umbenennungen
- **Custom Products:** Ersteller oder Super-Admin kann umbenennen (z. B. auf der Seite Eigene Produkte).
- **Master Products:** Admin und Super-Admin können umbenennen.
  - **In der Masterliste** gibt es keinen Stift mehr an der Tabelle; stattdessen Toolbar-Button **„Umbenennen“** (zwischen „Ausgeblendete“ und „PDF“). Klick führt zur Seite **Umbenannte Produkte** (`/admin/renamed-products` bzw. `/super-admin/renamed-products`).
  - **Seite Umbenannte Produkte:** Liste aller umbenannten Master-Items (PLU, Original, Aktuell, Aktion „Zurücksetzen“). Oben rechts Button **„Produkte umbenennen“** öffnet einen Dialog mit der vollen PLU-Liste.
  - **Dialog „Produkte umbenennen“:** Einfache Suchleiste (PLU/Name) wie beim Dialog „Produkte ausblenden“ – filtert die Liste, Treffer werden hervorgehoben, optional Scroll zum ersten Treffer. Kein „X von Y“, keine Pfeil-Buttons. Pro Zeile ein Stift; Klick öffnet den Dialog „Produkt umbenennen“ (Neuer Name, optional Zurücksetzen). Nach Speichern bleibt der Dialog offen, die Listen werden aktualisiert. Die Zwei-Spalten-Tabelle nutzt vier Spalten (PLU \| Artikel \| PLU \| Artikel) mit klarer Mittellinie zwischen den Hälften.
  - Setzt `is_manually_renamed = true`; nur `display_name` wird geändert, `system_name` bleibt für Excel-Abgleich unverändert.
  - **Bezeichnungsregeln** laufen weiterhin im gleichen Anzeige-Durchlauf wie die Sortierung: Wenn das Schlagwort (z. B. „Bio“) im aktuellen Anzeigenamen **als ganzes Wort** vorkommt, wird es wie bei allen anderen Produkten normalisiert (Prefix/Suffix). Button **„Alle Regeln anwenden“** schreibt bei marktspezifischen Umbenennungen in `renamed_items` bzw. `backshop_renamed_items`, sonst in die Master-Tabellen.
  - **Zurücksetzen:** Auf der Seite Umbenannte Produkte pro Zeile „Zurücksetzen“ (mit Bestätigung) → Eintrag in `renamed_items` bzw. `backshop_renamed_items` wird gelöscht.
  - **Obst/Gemüse: Umbenennungen pro Markt** – In `renamed_items` gespeichert (store_id), gelten nur für den aktuell gewählten Markt.
  - **Backshop: Umbenennungen pro Markt** – In `backshop_renamed_items` gespeichert (store_id), gelten nur für den aktuell gewählten Markt. Orphan-Renames (PLU existiert nirgends mehr) werden täglich automatisch entfernt.
- **Suche in der Masterliste (Obst/Gemüse und Backshop):** In der Toolbar links neben den Anzeige-Infos gibt es ein **Lupen-Symbol**. Klick öffnet eine **fixierte Suchleiste** unter dem App-Header, **bündig mit dem Seiteninhalt** (gleicher `max-w-7xl`-Rahmen wie die Liste, links ausgerichtet, nicht am Viewport-Rand). PLU oder Artikelname eingeben, Treffer „X von Y“, **Pfeile** für vorheriger/nächster Treffer, die Liste scrollt zum Treffer. Der **aktuelle Treffer** wird nur durch **Markierung der passenden Zeichen** in PLU- und Artikelspalte hervorgehoben (nicht die ganze Zeile). **Escape** oder **X** schließt die Suche. Im Dialog „Produkte umbenennen“ gibt es weiterhin die einfache Filter-Suche (PLU/Name) ohne Treffer-Navigation.

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
- Wird auf den **effektiven Anzeigenamen** angewandt (nach marktspezifischer Umbenennung), nicht auf `system_name`; gilt auch nach manueller Umbenennung, wenn das Keyword als ganzes Wort vorkommt.
- **„Ganzes Wort“** schließt typische Satzzeichen direkt nach dem Schlagwort ein (z. B. „Bio,“ oder „Bio.“), nicht aber Buchstaben innerhalb eines anderen Worts (z. B. „Bionda“).
- **SchlagwortManager-Dialog**: Live-Feedback bei Eingabe (X Produkte enthalten...), Vorher/Nachher-Liste
- `keyword-rules.ts`: Pure Functions (`normalizeKeywordInName`, `isAlreadyCorrect`, `applyActiveBezeichnungsregelnToName`, `applyAllRulesToItems`, `applyAllRulesWithRenamedMerge`)

## Feature: Layout-Konfiguration

**Pro Markt (`store_id`):** Layout-Einstellungen und Bezeichnungsregeln gelten für den gewählten Markt; die kanonische PLU-Liste (`master_plu_items` / Upload) bleibt global. Optionale **Markt-Overrides:** Reihenfolge der Warengruppen und Zuordnung einzelner Artikel (nach normalisiertem Namen) ohne die Master-Zeile für andere Märkte zu ändern.

**Admin-Dashboard** (`/admin`): drei Einstiege **Obst und Gemüse**, **Backshop**, **Benutzer** (analog Super-Admin-Markt-Übersicht). Unter `/admin/obst` bzw. `/admin/backshop`: **PLU-Liste** (→ Masterliste / Backshop-Liste) und **Konfiguration der Liste** (→ `/admin/obst/konfiguration` bzw. `/admin/backshop/konfiguration` mit Layout, Regeln, Block-Sortierung). **Super-Admin** weiterhin unter `/super-admin/...` mit Markt-Switcher.

Die Layout-Seite zeigt eine **Live-Vorschau** mit echten PLU-Daten, die sich sofort bei jeder Änderung aktualisiert.

| Einstellung | Optionen | UI |
|-------------|---------|-----|
| Sortierung | Alphabetisch (A-Z) oder nach Warengruppen | Radio-Cards |
| Anzeige-Modus | Gemischt (Stück+Gewicht) oder Getrennt | Radio-Cards |
| Flussrichtung | Zeilenweise (→↓) oder Spaltenweise (↓→) | Radio-Cards |
| Schriftgrößen | Header, Spalte, Produkt (in px) – steuern Schriftgröße, Zellen-/Zeilenhöhe und Mindestabstände proportional | Number-Inputs |
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
- Schriftgrößen aus Layout-Einstellungen (font_header_px, font_column_px, font_product_px) werden ins PDF übernommen; sie steuern Schriftgröße, Zeilen-/Bannerhöhen und Mindestabstände proportional (Formel: Höhe = Schrift + 2×Padding)
- Tabellen-Design: Header „PLU“ und „Artikel“ ohne vertikale Linien; Mitte eine Mittellinie (keine weißen Kästen); Strich vor Preis nur wenn Produkt einen Preis hat
- Zebra-Striping (grau-weiß) bleibt erhalten
- ExportPDFDialog zeigt Vorschau-Infos vor dem Download
- **Backshop-PDF** (Zeile für Zeile, Bild / PLU / Name): Der blaue Titel steht nur auf der ersten Seite. Bei **Nach Warengruppen** und **Zeilenweise**: Eine **weitere** Warengruppe beginnt nur auf derselben Seite wie der Rest der vorherigen, wenn die **komplette** nächste Gruppe noch in den **verbleibenden** Platz unter der ersten passt (sonst bleibt die Lücke, die Gruppe startet auf der nächsten Seite). **Mehrseitige** Warengruppen starten **nicht** im unteren Seitenrest **unter** einer anderen Gruppe (weil die ganze Gruppe dort nie Platz hätte); sie beginnen auf einer neuen Seite oben. Am **Tabellenanfang** einer Seite (z. B. erste Gruppe im PDF oder direkt nach einem Seitenwechsel) darf eine lange Gruppe wie bisher starten, solange Kopf + Spaltenköpfe + erste Zeile in den Rest passen. Passt eine Gruppe auf keine einzelne Seite, setzt sie sich über mehrere Seiten fort (ohne künstlich leere erste Seite). Zwischen zwei Gruppen auf einer Seite gibt es einen kleinen vertikalen Abstand. Die Layout-Option „Vorschau: eine Seite pro Warengruppe“ steuert nur die Vorschau in den Einstellungen, nicht einen harten PDF-Umbruch pro Gruppe.

## Feature: KW-Versionen

- Jede Kalenderwoche hat eine eigene Version
- Status-Lifecycle: `draft` → `active` → `frozen` → gelöscht
- Nur eine Version kann gleichzeitig `active` sein
- Cron Job wechselt jeden Samstag 23:59 automatisch
- Frozen-Versionen werden nach 7 Tagen auto-gelöscht

## Feature: Benachrichtigungen (Runde 2)

Nach einem KW-Upload erhalten alle User (außer dem Uploader) eine Benachrichtigung:
- Ein Eintrag pro User pro Version in `version_notifications` (gelesen/ungelesen)
- **UnifiedNotificationBell** im AppHeader: eine Glocke, Badge = Summe **ungelesener** Einträge (Obst/Gemüse + Backshop, je nach Bereichs-Sichtbarkeit). Dialog mit beiden Bereichen; Hinweisbox (Ausblenden/Gelesen) nur solange die jeweilige Benachrichtigung ungelesen ist; Produktlisten bleiben sichtbar. (Nur Admin/User; Super-Admin nutzt die Dashboard-Karten „Benachrichtigungen“.)
- NotificationDialog zeigt neue und geänderte PLUs der Version (diese Woche hinzugefügt bzw. PLU geändert) mit "Ausblenden"-Option
- "Gelesen" markiert die Notification als gelesen
- Ausblenden-Aktion im Dialog schreibt in `hidden_items` (global)

## Cron Jobs

| Job | Zeitplan | Funktion |
|-----|---------|----------|
| KW-Switch | Sa 23:59 | Aktive Version einfrieren, nächste aktivieren |
| Auto-Delete | Täglich 02:00 | Nur älteste Versionen löschen – es bleiben maximal 3 (neueste nach Jahr/KW); PLU-Listen bleiben dauerhaft erhalten. |
| Notification Cleanup | Täglich 03:00 | Erledigte Notifications nach 30 Tagen löschen |
