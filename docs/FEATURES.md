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
| Kassenmodus (QR) | Öffentliche URL `/kasse/:token`, Kasse + Passwort, Rolle `kiosk`, nur Listen `/kiosk/obst` & `/kiosk/backshop` (ohne PDF); Verwaltung `/admin/kassenmodus` | Fertig |

## Kassenmodus (QR, eingeschränkte Listen)

Pro Markt existiert ein **Einstiegs-Link** mit Token in der Pfad-URL **`/kasse/:token`**. Öffentliche Seite: ohne Lazy-Chunk für diese Route; bei **einer** Kasse fest vorausgewählt, bei **mehreren** per **Dropdown**; Anzeige **Markt · Firma** (Kontextzeile aus RPC `kiosk_list_registers`, Migrationen `080_*` / `081_*`). **Anmeldung:** RPC `kiosk_resolve_register_auth` (anon) liefert die interne Login-Mail, danach **`signInWithPassword`** und RPC **`kiosk_finalize_entrance_session`** (authenticated) setzt `profiles.current_store_id` – **ohne Edge Function**, damit kein Deno-Cold-Start die Anmeldung verzögert (Migration `082_*`). Die Edge Function `kiosk-login` ist im Repo noch vorhanden, wird vom Frontend aber nicht mehr aufgerufen. Rolle **`kiosk`**: Leserechte wie Viewer, in der App **ohne PDF**, nur **`/kiosk/*`**. **Kiosk-Kopfzeile:** Links **Logo + Markenname**; Mitte **Markt · Kassenbezeichnung** und darunter **Kassenmodus** (SVG-Kassensymbol `CashRegisterIcon`); rechts **Abmelden**. Darunter **Obst / Backshop** als breite Buttons. Nächste Zeile: **breite Suche** links, rechts nur **KW-Label + Aktiv/Archiv** (ohne Sortier-/Darstellungstext in der Liste). Listen-Toolbar im Kiosk entfällt, damit mehr PLU-Tabelle sichtbar ist. Technik: `KioskListFindContext` (Suche + KW-Zeile). Verwaltung: **Administration → Kassenmodus** (`/admin/kassenmodus`).

**QR- und Einstiegs-URL (Markt-Subdomain):** Wenn der Markt eine gültige **`stores.subdomain`** hat und `VITE_APP_DOMAIN` gesetzt ist, bauen QR und kopierter Link **`https://{subdomain}.{VITE_APP_DOMAIN}/kasse/{token}`** ([`buildKioskEntranceUrl`](src/lib/kiosk-entrance-url.ts)) – erkennbarer Markt-Host. **Lokal (Vite):** Der Port der aktuellen Seite (z. B. `:5173`) wird an `http://{subdomain}.localhost…` angehängt, damit der neue Tab denselben Dev-Server trifft. Ohne nutzbare Subdomain: Fallback auf die **aktuelle Origin** (z. B. reines Vercel-Preview). **DNS:** Wildcard `*.deine-domain.de` auf das Hosting legen, damit Markt-Hosts erreichbar sind.

**Supabase:** `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` wie gewohnt.

**Session und Tabs:** Supabase-Auth (JWT) liegt in **`sessionStorage`** – **Tab schließen** beendet die Anmeldung lokal (wichtig für geteilte PCs); **Reload im selben Tab** bleibt eingeloggt. **Neuer Tab** zur gleichen Origin hat **eigenes** `sessionStorage` → dort ist meist **erneut einzuloggen**. Zwei parallele Tabs teilen die Session **nicht** automatisch wie früher mit `localStorage`. **Kasse vs. Verwaltung:** Mit **Markt-Subdomain-URL** (`https://{markt}.{DOMAIN}/kasse/...`) und Verwaltung z. B. unter **`https://app.{DOMAIN}`** bleiben die Kontexte ohnehin getrennt (eigenes Storage pro Host). Alternativen für Tests: privates Fenster, zweites Profil (Hinweise auf der Kassenmodus-Seite).

**Ladehinweis:** Beim ersten Öffnen der App lädt der Browser das Bundle; `main.tsx` setzt **preconnect** auf die Supabase-Origin. **Direktaufruf** nur **`/kasse/:token`** (ohne weitere Pfade): Es wird eine **schlanke Shell** (`KasseEntranceShell`) geladen – **ohne** volle App (Auth/Store, Persist, alle anderen Routen), damit der neue Tab schneller die Passwort-Oberfläche zeigt. Nach erfolgreichem Login folgt ein **voller Seitenwechsel** zur normalen App unter **`/kiosk/obst`**. Wenn die Kassen-Seite **innerhalb** der bereits geladenen App geöffnet wird, bleibt die **SPA-Navigation** erhalten. Auf `/kasse` werden nach dem Laden der Kassenliste die Chunks **MasterList** und **KioskLayout** dynamisch importiert. Beim Hover über „Vorschau (neuer Tab)“ im Kassenmodus werden **KasseEntrancePage**, **KioskLayout** und **MasterList** vorgeladen.

**Performance:** Kiosk-Layout blockiert nicht mehr die ganze Seite auf `user_list_visibility` (Kiosk-Nutzer: Abfrage entfällt). Nach erfolgreichem Login startet **`runKioskPostLoginPrefetch`** (Masterliste + Markt-Daten in den TanStack-Cache). Die RPC `kiosk_list_registers` liefert **`store_id`** (Migration `081_*`). Kiosk **Obst-Live** lädt nicht mehr die komplette **`versions`**-Liste.

Zusätzliche Ideen siehe [FEATURE_KASSEN_SPEC.md](FEATURE_KASSEN_SPEC.md).

## Backshop Multi-Source (Edeka · Harry · Aryzta)

Drei Upload-Flows pro Quelle, zentrale Produktgruppen und markt-individuelle Marken-Auswahl („Marken-Tinder"). Super-Admin: **Übersicht** `/super-admin/backshop-upload` mit drei Karten; je Quelle ein **Wizard** unter `/super-admin/backshop-upload/edeka` (bzw. `harry`, `aryzta`) mit eigenen Schritten (Vergleich, Warengruppen, Vorschau, Einspielen auf separaten Seiten). Alte URLs `/super-admin/backshop-harry-upload` und `…/backshop-aryzta-upload` leiten auf den jeweiligen Wizard um. Details: [BACKSHOP_MULTI_SOURCE.md](BACKSHOP_MULTI_SOURCE.md). Kurzfassung:

- Routen Super-Admin: `/super-admin/backshop-upload` (alle Quellen auf einer Seite), `/super-admin/backshop-harry-upload` und `/super-admin/backshop-aryzta-upload` (Redirect mit Anker zur Sektion), `/super-admin/backshop-product-groups`.
- Routen Markt: `/{user|admin|super-admin}/marken-auswahl` (Marken-Auswahl, früher `backshop-marken-tinder` leitet um). Grundregeln (Bulk) pro Warengruppe: `/{admin|super-admin}/backshop-gruppenregeln`. **Gruppenregeln-Seite:** Unter `md` zeigt die Tabelle **Karten pro Warengruppe** (volle Breite, kein horizontales Scrollen der Seite); ab `md` die gewohnte Tabellenansicht.
- Parser: bleibt flexibel, fällt bei Unsicherheit auf manuelles Spalten-Mapping (Super-Admin) zurück. **Auto-Fallback**: Öffnet sich selbständig, wenn >30 % der Zeilen übersprungen werden oder weniger als 3 Produkte erkannt sind. Unterstützt **Classic** (Kopfzeile + Spalten) **und Kassenblatt-Block** (Namens-/PLU-/Bild-Zeile + Blockhöhe pro Spalte), inkl. „keine Kopfzeile". Plunder-Produktnamen werden dank Wortgrenzen-Regex nicht mehr als Header fehlinterpretiert.
- Image-Upload: 3x Retry mit Exponential Backoff (500 ms/1 s/2 s) gegen 502/504-Regressionen; Toast bei dauerhaft fehlgeschlagenen Bildern.
- Warengruppen direkt beim Upload: `BackshopUploadGroupAssignment` zeigt Fortschritt (z. B. „12 von 18 zugeordnet"), Auto-Zuordnen-Button nutzt `suggestBlockIdsForNewItems` (Keyword-Regeln), plus Bulk-Reset.
- Publish: Nur die hochgeladene Quelle wird für die Ziel-KW ersetzt; andere Marken kommen aus Merge **Ziel-KW + aktive Version** (Ziel hat Vorrang). Vergleich vor dem Upload nur für die jeweilige Quelle. Warn-Dialog nur, wenn für die KW **bereits Zeilen dieser Quelle** existieren. Produktgruppen werden nach dem Publish automatisch aktualisiert.
- Anzeige: Marken-Badge (E/H/A); bei Teilmengen-Wahl optional dezenter Link zurück in den Tinder. Ohne Marken-Wahl: alle Produkte der Gruppe sichtbar (kein Konflikt-PDF-Lock).
- PDF: nicht wegen fehlender Marken-Auswahl gesperrt.
- Angebote: zentrale Edeka-Werbung wirkt nur auf `source='edeka'`. Ausgeblendete Edeka-Items bleiben während einer Kampagne temporär sichtbar, auch wenn die Markt-Wahl eigentlich nur Harry/Aryzta vorsieht.

## Backshop-Liste (Phase 3)

Zweite PLU-Liste **Backshop** neben Obst/Gemüse: eigene Versionen, Master-Items (mit Bild), keine Stück/Gewicht-Typen. **Routen:** `/user/backshop-list`, `/viewer/backshop-list`, `/admin/backshop-list`, `/super-admin/backshop-list`, `/super-admin/backshop-upload`. **Dashboard:** In User-, Viewer-, Admin- und Super-Admin-Dashboard je zwei Karten: „PLU-Liste Obst/Gemüse“ und „PLU-Liste Backshop“. Super-Admin zusätzlich „Backshop Upload“. **Backshop-Liste-Seite:** Tabelle mit Spalten Bild, PLU, Name; KW-Auswahl; Titel „PLU-Liste Backshop“. **Backshop-Upload:** Wizard mit separaten Routen (Upload, Vergleich, Warengruppen, Vorschau, Erfolg); mehrere Excel werden zusammengeführt (PLU-Deduplizierung). **Produkt-Analyse** nach dem Einlesen: Kennzahlen „eindeutige PLU“, „Duplikat-Spalten“, Plausibilität `totalRows + Duplikate` vor Deduplizierung; **CSV-Export** der importierten PLU-Liste; ungültige PLU mit **Zellinhalt** in den Hinweisen. Obst/Gemüse-Flows unverändert. **Backshop-Excel-Parser:** Spalten-Erkennung (PLU 5-stellig mit Normalisierung, Name, Abbildung/Bild), Namens-Bereinigung (bis erstes Komma); Details in [BACKSHOP_EXCEL_PARSER.md](BACKSHOP_EXCEL_PARSER.md).

**Backshop Layout & Regeln:** Super-Admin kann unter Konfiguration „Layout (Backshop)“ und „Inhalt & Regeln (Backshop)“ getrennt von Obst/Gemüse verwalten. Layout: **Anzeige** nur „Alle zusammen (alphabetisch)“ oder „Nach Warengruppen (alphabetisch)“; Flussrichtung (zeilen-/spaltenweise), Schriftgrößen, Markierungsdauer, Features (ohne separaten Warengruppen-Toggle – Warengruppen werden durch Anzeige „Nach Warengruppen“ freigeschaltet). Bei „Nach Warengruppen“ optional **„Vorschau: eine Seite pro Warengruppe“** (nur die Live-Vorschau in den Layout-Einstellungen; das PDF bricht platzsparend nach Höhe um, mehrere kurze Gruppen können auf einer Seite stehen). Regeln: Bezeichnungsregeln (Schlagwort-Manager) und Warengruppen (Blöcke anlegen/zuweisen); bei Anzeige nach Warengruppen steht „Liste interaktiv bearbeiten“ für Drag-&-Drop-Sortierung zur Verfügung. **Drag-Overlay** in „Liste interaktiv bearbeiten“ und im Warengruppen-Panel folgt der Maus (snapCenterToCursor). **Rechte Spalte Warengruppen:** Ohne Gruppenauswahl werden nur unzugeordnete Produkte angezeigt; bei Klick auf eine Warengruppe nur deren Produkte (Falschzuordnungen korrigierbar per Zuweisen oder Drag auf andere Gruppe); optional „Zuordnung aufheben“. **Zuordnung nach Schlagwort:** Karte „Zuordnung nach Schlagwort“ auf der Regeln-Seite: Regeln „Schlagwort → Warengruppe“ (NAME_CONTAINS) anlegen/löschen, Button „Regeln jetzt anwenden“ (Standard: nur unzugeordnete zuordnen). **Nach Upload:** Hinweis auf fehlende Warengruppen-Zuordnung und Button „Warengruppen zuordnen“; auf der Regeln-Seite erscheint eine Info-Box mit der Anzahl unzugeordneter Artikel. **Backshop-Cron:** Drei pg_cron-Jobs (KW-Switch Samstag 23:59 UTC, Auto-Delete alte Versionen, Notification-Cleanup) nur für Backshop-Tabellen.

## Per-User Bereichs-Sichtbarkeit und Markt-Gate

**Zwei Ebenen** (UND-Verknüpfung):

1. **Markt** (`store_list_visibility`): Super-Admin stellt unter Firmen & Märkte → Markt → **Listen-Sichtbarkeit** ein, ob Obst/Gemüse, Backshop und/oder der **Kassenmodus** (QR und öffentliche Kassen-Anmeldung) für diesen Markt vorgesehen sind. Ist der Kassenmodus aus, liefern `kiosk_list_registers` und `kiosk-login` keine gültige Anmeldung – auch nicht mit einem noch vorhandenen QR-Code.
2. **User** (`user_list_visibility`): Admin/Super-Admin können in der Benutzerverwaltung pro User einschränken, welche der **vom Markt erlaubten** Bereiche der User sieht (Button „Bereiche“). Ist eine Liste am Markt aus, sind die zugehörigen Schalter deaktiviert.

**Effektiv sichtbar** = Markt erlaubt **und** User erlaubt (kein Eintrag in der jeweiligen Tabelle = sichtbar). Dashboards, Benachrichtigungen, Admin-Hubs und **Routen** (inkl. Deep-Links) nutzen dieselbe Logik; ohne gewählten Markt im Kontext (z. B. Super-Admin global) greift nur die User-Regel nicht – Markt-Regel dann neutral (Zugriff nicht durch fehlenden Markt blockiert).

**Super-Admin Markt-Detail (Listen → Obst & Gemüse / Backshop):** Zwei große Karten wie beim Admin-Hub – **PLU-Liste** führt direkt zur Masterliste bzw. Backshop-Liste (`backTo` zur Marktseite); weitere Schritte (eigene Produkte, Werbung, …) über die **Toolbar** der Liste. **Konfiguration der Liste** öffnet einen Hub unter `/super-admin/markt/obst/konfiguration` bzw. `/super-admin/markt/backshop/konfiguration` mit denselben Kacheln wie in den Admin-Konfigurations-Hubs (Obst: Layout, Bezeichnungsregeln, Warengruppen; Backshop zusätzlich Gruppenregeln und Warengruppen-Sortierung).

## S/W-taugliche PDF-Markierungen

Die PDF-Statusmarkierungen sind auch in Schwarz-Weiss erkennbar: Neues Produkt = gestrichelter Rahmen, PLU geändert = fetter Rahmen. Zusätzlich zur Farbmarkierung (gelb/rot).

## Responsive Listen (Handy/Tablet)

Seiten mit **breiten Tabellen** (viele Spalten, Badges, Buttons) liefern auf schmalen Viewports eine **zweite Darstellung**: kompakte **Listen/Karten** (eine Zeile pro Eintrag), **Symbole** für Aktionen mit Beschriftung in Tooltips/`aria-label`, analog zu **Eigene Produkte (Backshop)**. Desktop bleibt bei Tabellenansicht ab **`md`**. Technische Leitlinie: [.cursor/rules/mobile-responsive-lists.mdc](../.cursor/rules/mobile-responsive-lists.mdc).

**Desktop-Layout Verwaltungslisten:** Backshop-Tabellen nutzen **große Bildvorschau** (Thumbnail-Größe `2xl`, 96×96 px) in einer festen ersten Spalte; **Obst & Gemüse** dieselben Seiten **ohne Bildspalte**, dafür **`table-fixed`** mit breiterer **Name/Artikel-Spalte**, damit der Inhalt den Platz nutzt. Zellen sind vertikal **mittig** ausgerichtet, wo sinnvoll.

## Kern-Konzept

Der PLU Planner verwaltet wöchentliche Preis-Look-Up (PLU) Listen für Obst- und Gemüseabteilungen. Jede Kalenderwoche liefert die Zentrale neue Excel-Dateien, die hochgeladen und mit der Vorwoche verglichen werden. Es gibt **fünf Rollen**: Super-Admin (Inhaber, alles inkl. Rollen tauschen), Admin (Benutzerverwaltung ohne Rollenänderung, PLU inkl. Umbenennen), User (volle PLU-Funktionen, keine Benutzerverwaltung), Viewer (nur PLU-Liste ansehen + PDF), **Kasse** (`kiosk`, nur PLU-Listen über QR-Anmeldung, ohne PDF). Details in [ROLES_AND_PERMISSIONS.md](ROLES_AND_PERMISSIONS.md).

## Super-Admin User-Vorschau

Super-Admins können über das Profil-Menü **„User-Vorschau (Firma & Markt)“** einen Dialog öffnen, **Firma**, **Markt** und eine simulierte Rolle (**User**, **Viewer** oder **Admin**) wählen und landen anschließend im jeweiligen Bereich (`/user`, `/viewer`, `/admin`) mit gesetztem Markt-Kontext. **Zur Super-Admin-Ansicht** beendet die Vorschau und stellt den vorherigen Marktzustand wieder her (ohne `current_store_id` während der Vorschau zu überschreiben). Die Vorschau steuert **Oberfläche und Navigation**; sie ersetzt **keine** echte Identitäts-Impersonation – datenbankseitig gilt weiterhin die Super-Admin-Session (siehe [SECURITY_LIVING.md](SECURITY_LIVING.md)).

In der **Benutzerverwaltung** sieht der Super-Admin nur Nutzer, die mindestens einem Markt der **im Kopfbereich gewählten Firma** zugeordnet sind. Ohne gewählte Firma/Markt erscheint ein Hinweis statt der Liste. **Admins** sind weiterhin über die Datenbankregeln (RLS) auf die eigene Firma beschränkt.

## Tutorial (Rundgang)

Interaktives Onboarding (Kopfzeile, Profil-Menü). **Production-Build** (z. B. Vercel): Tutorial ist **standardmäßig aus** (Nutzer sehen keine Symbole und keinen automatischen Start). Zum **Wieder-Einschalten** `VITE_TUTORIAL_ENABLED=true` setzen und neu deployen. **Lokal** mit `npm run dev` bleibt das Tutorial immer an. Kurz in `.env.example`.

## Farbcodes

| Farbe | Code | Bedeutung | Wo sichtbar |
|-------|------|-----------|-------------|
| Gelb/Orange | `#F59E0B` | Neues Produkt (neu in dieser KW) | PLU-Feld in Tabelle + PDF |
| Rot | `#EF4444` | PLU geändert (gleicher Name, neue PLU) | PLU-Feld in Tabelle + PDF |
| Keine | – | Unverändert | Standard |

**Wichtig:** **Master-Items** (Excel / Stammdaten): Gelb = Datenbank-Status **`NEW_PRODUCT_YELLOW`** nach Versionsvergleich bzw. Upload — die Anzeige folgt diesem Status, bis er sich ändert (kein automatisches Ausblenden nach Kalenderwochen). **Zentrale Nachbesserungen** (manuelle Ergänzung mit `UNCHANGED` in älteren Daten): werden in der Liste wie **neu** markiert, wenn sie **nicht** aus dem Carryover der Vor-KW stammen (gleiche Regel wie Tab „Neu“ in der Glocke). **Angebote/Werbung** in der Live-Masterliste beziehen sich auf die **aktive eingespielte Version** (KW/Jahr der Version). **Eigene Produkte** (Custom, PLU nicht im Master): „Neu“-Gelb bleibt **zeitlich begrenzt** (Layout: „Wie lange als neu anzeigen“, Standard 4 KW): Abstand in ISO-Kalenderwochen zwischen `created_at` und der **aktuellen Kalender-KW** (nicht der Listen-KW), damit die Markierung z. B. nicht sofort verschwindet oder zu früh endet, wenn die aktive Liste schon eine KW weiter ist als die echte Woche.

## Feature: Excel Upload & KW-Vergleich

### Ablauf

1. Super-Admin öffnet **PLU Upload** (eigene Seite `/super-admin/plu-upload`) – **3 Schritte:** (1) Dateien + Ziel-KW/Jahr, (2) Vorschau inkl. Vergleich, Konflikte, Einspielen, (3) Fertig.
2. **Ein Upload-Feld** für eine oder mehrere Excel-Dateien (max. 2 für den Vergleich); im Datei-Dialog können mehrere Dateien auf einmal ausgewählt werden.
3. **Auto-Erkennung:** Listentyp (Stück/Gewicht) wird aus dem **Excel-Inhalt** (erste Zeile/Header, z. B. „Gewicht“, „Stück“, „Stück ÜO“) und bei Bedarf aus dem Dateinamen erkannt. KW wird aus dem Dateinamen übernommen.
4. **Ziel-KW und Jahr** sind Dropdowns: KW nur **aktuelle ± 3** (z. B. bei KW 10: 7–13), Jahr nur **aktuelles Jahr ± 1**. Automatische Vorauswahl: nächste freie KW (bzw. aktuelle), aktuelles Jahr als Standard. Bei zwei Dateien: automatische Zuordnung (eine als Stück-, eine als Gewichtsliste); **manuelle Korrektur** pro Datei per Dropdown (Stück/Gewicht) möglich.
5. **Überschreibungs-Warnung:** Ist die gewählte Ziel-KW für das gewählte Jahr bereits in `versions` vorhanden, erscheint vor dem Vergleich ein Dialog mit der Wahl „Ziel-KW ändern“ oder „Überschreiben“. Bei „Überschreiben“ wird beim Einspielen die **bestehende Version für diese KW ersetzt** (kein zweiter Eintrag, keine Duplicate-Key-Fehler).
6. **Schritt 2 (Vorschau):** Einzeilige Statistik (Gesamt · Unverändert · Neu · PLU geändert · Entfernt · ggf. Konflikte). **„Neu“ und „Entfernt“ sind klickbar** und zeigen in einem Popover die Liste der betroffenen Produkte (PLU + Name). Darunter die **vollständige PLU-Liste** (Layout-Engine + PLUTable): Die **Super-Admin-Upload-Vorschau** zeigt Stück und Gewicht **immer getrennt** und **alphabetisch** – unabhängig von den **marktspezifischen** Layout-Einstellungen (Schriften und Flussrichtung der Tabelle kommen weiterhin vom Markt). Nach dem Einspielen entspricht die **Masterliste** wieder dem konfigurierten Markt-Layout. Scrollbar. Falls Konflikte: Konflikt-Bereich im selben Schritt; Button „Konflikte speichern & einspielen“ bzw. „Ins System einspielen“.
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
- **Obst/Gemüse:** Seitenüberschrift **„PLU Obst und Gemüse“** (`*/masterlist`). In der Infozeile (Lupen-Bereich) stehen **Sortierung** (Alphabetisch vs. Nach Warengruppen), **Stück/Gewicht-Darstellung** und die **KW der zuletzt eingespielten Liste** (`Liste …` = `kw_label` der aktiven Version). Ist die Sortierung **Nach Warengruppen**, zeigen **User, Admin und Super-Admin** (nicht Viewer) in der Toolbar (vor **PDF**) den Button **Warengruppen** → Seite **`/user/obst-warengruppen`**, **`/admin/obst-warengruppen`** bzw. **`/super-admin/obst-warengruppen`** je nach Rolle (Zurück zur Masterliste per `backTo`, wie bei Ausgeblendete/Werbung). In der **Live-Masterliste** (Obst und Backshop) und **Layout-Vorschau** erscheinen bei **Nach Warengruppen** auch **neue bzw. leere** Warengruppen als Abschnittskopf (noch ohne Artikel); das **PDF** listet weiterhin nur Gruppen mit mindestens einem Artikel (kompakter Druck). **Hinweis:** Markt-Zuordnungen aus der Warengruppen-Workbench (`store_*_name_block_override`) wirken in den Daten immer auf die effektive Gruppe; in der **Listen-Ansicht** sind Warengruppen-Abschnitte aber **nur bei Sortierung „Nach Warengruppen“** sichtbar – bei **Alphabetisch** erscheint unter der Toolbar ein **Hinweis-Banner** (mit Link zu Layout für Admin/Super-Admin), solange mindestens eine solche Zuordnung existiert.
- **Backshop:** Eine Zeile für den **Zeitraum der PLU-Liste** (Einspiel-KW bis gewähltes Ende, ISO-8601): z. B. `KW 10 – KW 16 · 2026` oder am Jahreswechsel zwei `KW … · Jahr`-Teile. Die **hintere KW** ist die **Werbungs-Vorschau**: per schmales Dropdown wählbar, sobald für **spätere** Kalenderwochen bereits eine Zentralwerbung existiert (nur nach vorne); Standard bleibt die **aktuelle ISO-KW** (automatische Werbung wie bisher). Die Auswahl wird in `sessionStorage` gemerkt.
- Kalenderwochen werden **einheitlich nach ISO-8601** berechnet (`getISOWeek` / ISO-Kalenderjahr), damit die Anzeige mit der üblichen deutschen KW-Zählung übereinstimmt.

### Eigene Produkte hinzufügen (custom_products)
- **Feature „Eigene Produkte“** kann pro Markt in den Layout-Einstellungen ausgeschaltet werden; dann entfallen Menü/Buttons zur Verwaltung (Super-Admin sieht die Seiten weiterhin mit Hinweis).
- Alle Rollen können eigene Produkte hinzufügen (wenn aktiviert). **Entweder PLU oder Preis:** PLU = 4 oder 5 Ziffern (ohne Dezimaltrenner), ODER Preis = Dezimalzahl (z.B. 1,50). Genau eines davon ist Pflicht. **Stück/Gewicht** ist nur **Pflicht**, wenn im Layout **Anzeige „Stück / Gewicht getrennt“** gewählt ist; bei **„Alle zusammen“** wird intern **Stück** gespeichert. **Warengruppe** ist nur **Pflicht**, wenn im Layout **Sortierung „Nach Warengruppen“** gewählt ist. Dialog, Bearbeiten-Dialog, Tabelle „Eigene Produkte“ und Excel-Vorschau blenden Spalten/Felder entsprechend ein oder aus.
- Produkte ohne PLU (nur Preis): In der DB wird in `custom_products.plu` ein interner Platzhalter `price-{uuid}` gespeichert (NOT NULL UNIQUE); in der Anzeige erscheint in der PLU-Spalte „–“.
- **Preisanzeige in der Tabelle:** Bei eigenen Produkten mit Preis erscheint in der PLU-Tabelle (und Layout-Vorschau) in der Artikel-Spalte ein kompakter €-Preiskasten (z.B. „1,50 €“). Ohne Preis wird kein Preiskasten angezeigt.
- **Excel-Upload:** Nur **Super-Admin** sieht die Buttons „Per Excel hochladen“ (Eigene Produkte) und „Per Excel ausblenden“. Spaltenbedeutung richtet sich nach Layout (nur PLU/Preis + Name; optional Spalte 3 = Warengruppe oder Stück/Gewicht; bei **getrennter Stück/Gewicht-Darstellung** und **Warengruppen-Sortierung** zusätzlich Spalte 4 = Typ). Vorschau mit Dropdowns pro Zeile, dann Batch-Import.
- **„Von mir erstellt“:** In der Tabelle Eigene Produkte wird bei Einträgen, die der aktuelle User erstellt hat (`created_by`), ein Badge „Von mir erstellt“ angezeigt (nur in der **Desktop-Tabellenansicht** ab Bildschirmbreite `md`).
- **Schmale Bildschirme (Handy):** Seiten **Eigene Produkte** und **Eigene Produkte (Backshop)** zeigen unter `md` eine **kompakte Liste** (PLU, Name, ggf. zweite Zeile mit Stück/Gewicht · Preis · Warengruppe je nach Layout/Daten; Backshop mit Vorschaubild und Auswahl **Angebots-PDF** Test/Fest) und **Icon-Aktionen** statt breiter Tabelle – ohne horizontales Scrollen der Seite. Desktop bleibt die volle Tabelle. **Eigene Produkte (Backshop):** Kamera-/Galeriebilder werden vor dem Speichern und im **Backshop-PDF** in der gleichen Ausrichtung wie in der Vorschau verarbeitet (EXIF). Fehler beim **Bild-Upload** erscheinen im Dialog; Fehler beim **Speichern** in der Datenbank als **Toast** mit verständlicher Meldung.
- Werden global gespeichert (nicht pro User)
- **Master hat Vorrang:** Wenn eine PLU sowohl in master_plu_items als auch in custom_products existiert, wird nur das Master-Item angezeigt. Das Custom Product wird "implizit pausiert".
- Gelb-Markierung ist **zeitlich begrenzt**: so viele **ISO-Kalenderwochen** zwischen `created_at` und **heute** (Kalender-KW), wie unter „Wie lange als neu anzeigen“ eingestellt — danach ohne Gelb
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
- **Vollseite „Produkte ausblenden“** (`*/pick-hide-obst`; Button auf **Ausgeblendete Produkte** und auf „Eigene & Ausgeblendete“): Die Desktop-Liste nutzt dieselbe **Flussrichtung** und **Schriftgrößen** wie die Obst-Masterliste (**zeilenweise** = zwei Artikel pro Tabellenzeile; **spaltenweise** = Zeitungslayout mit logischen **Seiten** und Trenner „Seite 2“, …). Auf dem Handy bleibt eine durchgehende Liste. **Zurück** über App-Header-Pfeil oder Abbrechen zur aufrufenden Seite (mit Query-Parametern, falls gesetzt).
- **Backshop** (`backshop_hidden_items`): Auf **Ausgeblendete Produkte (Backshop)** führt der Button zur Vollseite `*/pick-hide-backshop`; Gruppierung wie die Backshop-Masterliste (alphabetisch vs. nach Warengruppe inkl. Markt-Block-Reihenfolge und namensbasierte Block-Overrides); angezeigte Namen berücksichtigen globale Backshop-Umbenennungen. In der Auswahl-Liste: Vorschaubild, Marken-Kürzel **E/H/A** nur für Excel-Quellen (Edeka/Harry/Aryzta), **kein** Kürzel für `manual` oder Markt-eigene Produkte.
- **Zentrale Werbung vs. Ausblendung:** Steht eine PLU in **irgendeiner** zentralen Obst-Kampagne (Exit, Ordersatz Woche, Ordersatz 3-Tage) bzw. in der Backshop-Kampagne (dieselbe KW-Logik wie in der App), erscheint sie in **Hauptliste und PDF** trotz Eintrag in `hidden_items` / `backshop_hidden_items` – **solange** der Markt die zentrale Werbung für diese PLU **nicht** per Megafon ausgeschaltet hat (`obst_offer_store_disabled` / `backshop_offer_store_disabled`). Ist das Megafon für die PLU aus, greift die Ausblendung wieder wie gewohnt. Sobald die PLU **in keiner** dieser Kampagnen mehr vorkommt, ist die Ausblendung für die Anzeige ebenfalls wirksam. Auf den Seiten „Ausgeblendete Produkte“ kann ein Badge **„Sichtbar durch Werbung“** erscheinen. **Manuelle** Werbung (`plu_offer_items` / `backshop_offer_items`) ändert diese Logik nicht.

### Werbung/Angebot (plu_offer_items / backshop_offer_items)
- **User, Admin und Super-Admin** können Produkte als „Angebot“ markieren (Viewer nur Lesen).
- **Laufzeit (manuell):** Beim Hinzufügen werden **Aktionspreis** (optional; leer = Werbung ohne gespeicherten Aktionspreis), Laufzeit 1–4 Wochen und Start = aktuelle KW gewählt. Nach Ablauf gilt das Produkt nicht mehr als Angebot.
- **Zentrale Werbung (Super-Admin):** Getrennt für Obst/Gemüse und Backshop. **Obst/Gemüse** (`/super-admin/central-werbung/obst`): zwei Excel-Dateien pro KW (siehe „Zentrale Obst-Werbung (Import)“); je **Kalenderwoche** und **Kampagnentyp** getrennt; Speichern ersetzt nur diese eine Variante. (Legacy: ältere **Exit**-Kampagnen in der DB werden weiterhin geladen und merged; neuer Exit-Upload für Obst entfällt.) **Duplikat-PLU** in mehreren Obst-Kampagnen: Anzeige nach Priorität 3-Tage > Woche > Exit. **Namens-Hervorhebung** in Liste/PDF: zentrale Werbung am **Artikelnamen** (zwei Gelbtöne: Woche/Exit vs. 3-Tage), **manuelle (eigene) Werbung** am Artikelnamen im **gleichen Gelb wie Wochenwerbung**; **Neu/PLU geändert** bleiben an der **PLU-Spalte**. **Backshop** (`/super-admin/central-werbung/backshop`): Exit-Excel. Zuordnung Excel → PLU aus der **aktiven Masterliste**. **Auslieferung ab:** Spalte **„Auslieferung ab“** (z. B. `DD.MM.YY`) wird pro Kampagne gespeichert. **Erwerb / Aktions-EK:** flexible Header-Erkennung (z. B. **Erwerb**, **Einkauf**) **oder** Exit-Spalte **Akt. WP** → `purchase_price`. **Listen-EK / VK:** **Listen-EK**, **Listen-VK**, freistehendes **VK**/**UVP** (ohne „Akt.“) **oder** Exit **Nor. WP** → `list_ek`, **Nor. UVP** → `list_vk`. **Aktions-VK** aus **Akt. UVP** (Pflicht). Auf der Markt-Seite **Werbung bestellen** (KW-Detail): Spalten **EK (Liste)**, **VK (Liste)**, **Aktions-VK**, **Aktions-EK** (letzteres = gespeicherter Erwerb bzw. Akt. WP). **Megafon** pro Markt (`obst_offer_store_disabled` / `backshop_offer_store_disabled`): Auf der Markt-Seite **Werbung** neben dem Stift; Dialog wie unter **„Seite Werbung“**. **Interaktion mit Ausblendung:** siehe Bullet „Zentrale Werbung vs. Ausblendung“.
- **Zentrale Obst-Werbung (Import):** **Gesamte Wochenwerbung (EWK)** und **3-Tage-Preis (Do–Sa)** – je Kampagne **eine oder zwei** Excel-Dateien (z. B. Stück- und Gewichtsliste; PLUs zusammengeführt). Excel: Kopfzeile **„PLU“** / **„ZWS PLU“** optional mit **Artikel**-/Name-Spalte, oder **ohne Kopfzeile** mit PLU-Spalte (Kategorielisten). Nach dem Import erscheint eine **Review-Tabelle** (wie Backshop-Exit): **Excel-PLU** und **Artikel-Hinweis** pro Zeile; **Master-PLU** wird vorausgewählt, wenn die Excel-PLU in der Masterliste steht, sonst **Namens-Vorschlag**; Zuordnung ist **pro Zeile korrigierbar**. Beim Speichern werden alle Zeilen gespeichert: Zeilen mit Master-PLU als `origin='excel'`, nicht zugeordnete Zeilen als `origin='unassigned'` (bleiben im Archiv, erscheinen aber **nicht** in der Marktliste). Keine Aktionspreise aus Excel, nur **Markierung** (Listenpreis bleibt). **KW-Auswahl (Upload):** Nach dem Speichern springt die Werbungs-KW nur dann automatisch auf die **nächste** ISO-KW, wenn für die gespeicherte KW **sowohl** Wochenwerbung **als auch** 3-Tagespreis existieren und jeweils mindestens eine **zugeordnete** PLU haben; sonst bleibt die KW erhalten. Beim ersten Öffnen der Upload-Seite gilt dieselbe Logik für die höchste KW mit bestehender Kampagne.
- **Zentrale Werbung – Nachbearbeiten (Super-Admin):** Auf `Versionen` / `Backshop-Versionen` steht unter der Versionstabelle die Karte **„Alle Werbungen“**. Pro KW (je Jahr) eine Zeile: Obst zeigt **Wochenwerbung** und **3-Tagespreis** separat, Backshop eine **Wochenwerbung** pro KW (gleiche Spaltenbezeichnung wie Obst). Klick auf „X Artikel ansehen“ öffnet die Edit-Seite (`/super-admin/versions/werbung/obst/:kw/:jahr/:kind` bzw. `/super-admin/backshop-versions/werbung/:kw/:jahr`): links die **Excel-Herkunft** (`source_plu`, `source_artikel`), rechts die **Master-PLU-Zuordnung** mit Such-Combobox. Möglich sind: PLU ändern, **„Keine Zuordnung“** setzen (Zeile bleibt als Archiv erhalten, verschwindet aber aus der Marktliste) und **Zeilen manuell hinzufügen** (`origin='manual'`, auch ohne Excel-Herkunft). Beim Speichern wird die Kampagne komplett neu geschrieben; die zugehörige Marktlisten-Query wird invalidiert und zeigt den neuen Stand sofort an. Alte Kampagnen ohne archivierte Excel-Herkunft zeigen links „(Excel nicht archiviert)“, bleiben aber editierbar. **Obst und Backshop:** Neben „X Artikel ansehen“ kann eine vorhandene Variante per **Papierkorb** gelöscht werden (einheitlicher Bestätigungstext in `src/lib/central-offer-admin-copy.ts`); auf der Edit-Seite zusätzlich **„Diese Werbung löschen“**. Speichern auf der Obst-Edit-Seite **ohne** Zeilen **entfernt** die gesamte Obst-Kampagne dieses Typs (keine leere Kampagne).
- **Toolbar:** In der Masterliste (Obst/Gemüse und Backshop) zwischen „Ausgeblendete“ und „Umbenennen“: Button **„Werbung“** → Seite **Produkte in der Werbung** (`*/offer-products` bzw. `*/backshop-offer-products`). **„Werbung bestellen“** (`/{rolle}/backshop-werbung` …) ist **nicht** in der Backshop-PLU-Listen-Toolbar; Zugriff z. B. über den **Admin-Backshop-Hub** (Kachel **„Werbung“**). Im KW-Detail: **Auslieferung ab** aus der Exit-Spalte **„Auslieferung ab“** (Datum + Countdown in Tagen); **Strichcode** aus der Excel-Spalte **Art. Nr.** / GTIN (`source_art_nr`); die **PLU** erscheint im Dialog nur als **Text** zur Orientierung, nicht als Strichcode. Abgrenzung: keine Ersetzung von **Produkte in der Werbung (Backshop)** (`*/backshop-offer-products`, Megafon, manuelle Werbung).
- **Seite Werbung:** Zwei Sektionen (oben zentral, unten eigen), Sortierung wie Hauptliste. Zentral: PLU, Artikel, Spalte **Preis & Werbung** (Stift für lokalen Anzeige-VK, Megafon mit Entscheidungsdialog). Eigene Werbung: Laufzeit, Aktionspreis, **„Aus Werbung entfernen“**, **„Produkte zur Werbung hinzufügen“** (Dialog mit optionalem Aktionspreis; zentrale PLUs sind blockiert).
- **Dialog „Produkte zur Werbung hinzufügen“:** Existiert ein **eigenes Produkt** mit derselben PLU wie ein Master-Artikel, bleibt in der Hauptliste der Master-Eintrag sichtbar (wie in der Layout-Engine). Im Dialog erscheint unter dem Listennamen ein Hinweis **„Eigenes Produkt: …“**; die Suche findet zusätzlich den **eigenen Namen**. Es bleibt **eine** manuelle Werbung pro PLU und Markt (`plu_offer_items` / `backshop_offer_items`). Für **eigene Produkte** (und Master-Zeilen mit Hinweis auf eigenes Produkt) gilt zusätzlich eine **begrenzte Tippfehler-Suche** im Namen (z. B. „sparge“ findet „Spagel …“).
- **Excel-Import (manuell):** Super-Admin kann **„Per Excel hinzufügen“**: Spalte 1 = PLU, 2 = Name (optional), 3 = Wochen (1–4). Start = aktuelle KW.
- **Anzeige:** In der PLU-Tabelle: Badge/Icons für zentrale vs. eigene Werbung, **Aktionspreis** in der Preis-Spalte (Obst und Backshop). Im PDF: **Volle Liste** mit **Angebots-Hinweisen** (Megafon, hervorgehobener Preis) oder **ohne** diese Darstellung (**alle Produkte** bleiben drin) oder **Nur Angebote**; Dateiname bei Variante ohne Hinweise mit Suffix `_ohne-Werbungshinweise`; Angebots-PDF mit angepasstem Titel.
- **Backshop – eigenes Produkt „Test“ (Angebots-PDF):** Jedes eigene Backshop-Produkt hat **`is_offer_sheet_test`** (beim Anlegen standardmäßig Test). Test-Artikel stehen in der **Hauptliste** wie andere eigene Produkte (Badge **Test** in der Namenszeile); im PDF **„Nur Angebote“** erscheinen sie unter dem Zwischenblock **„Neue Produkte“** (ohne Megaphon-/Aktionszeile). Seite **Eigene Produkte (Backshop)** und Anlegen-/Bearbeiten-Dialog: Umschaltung **Test** vs. **In Hauptliste fest**. Beim **Export der vollen** Backshop-PDF (mit oder ohne Werbungshinweise) fragt die App, ob alle noch auf Test stehenden eigenen Produkte **übernommen** werden sollen; **Nein** exportiert trotzdem die volle Liste, lässt den Test-Status unverändert.
- **Obst/Gemüse und Backshop** getrennt (eigene Tabellen, Kampagnen und Seiten).

### Umbenennungen
- **Custom Products:** Ersteller oder Super-Admin kann umbenennen (z. B. auf der Seite Eigene Produkte).
- **Master Products:** Admin und Super-Admin können umbenennen.
  - **In der Masterliste** gibt es keinen Stift mehr an der Tabelle; stattdessen Toolbar-Button **„Umbenennen“** (zwischen „Ausgeblendete“ und „PDF“). Klick führt zur Seite **Umbenannte Produkte** (`/admin/renamed-products` bzw. `/super-admin/renamed-products`).
  - **Seite Umbenannte Produkte:** Liste aller umbenannten Master-Items (PLU, Original, Aktuell, Aktion „Zurücksetzen“). Oben rechts Button **„Produkte umbenennen“** öffnet die Vollseite **`*/pick-rename-obst`** mit der vollen PLU-Liste.
  - **Vollseite „Produkte umbenennen“ (Obst):** Einfache Suchleiste (PLU/Name) wie beim Ausblenden-Picker – filtert die Liste, Treffer werden hervorgehoben, optional Scroll zum ersten Treffer. Kein „X von Y“, keine Pfeil-Buttons. Pro Zeile ein Stift; Klick öffnet weiterhin den **Modal** „Produkt umbenennen“. Nach Speichern bleibt die Picker-Seite offen, die Listen werden aktualisiert. **Desktop-Layout** entspricht den **Layout-Einstellungen**: Obst/Gemüse bei **spaltenweise** wie die Masterliste (Zeitung inkl. Seiten-Trennern bei Bedarf), bei **zeilenweise** zwei Artikel pro Zeile (PLU \| Artikel \| PLU \| Artikel). **Backshop:** gleiche Picker-Logik unter **`*/pick-rename-backshop`** (inkl. Bild und E/H/A-Badge wie beim Backshop-Ausblenden-Picker).
  - Setzt `is_manually_renamed = true`; nur `display_name` wird geändert, `system_name` bleibt für Excel-Abgleich unverändert.
  - **Bezeichnungsregeln** laufen weiterhin im gleichen Anzeige-Durchlauf wie die Sortierung: Wenn das Schlagwort (z. B. „Bio“) im aktuellen Anzeigenamen **als ganzes Wort** vorkommt, wird es wie bei allen anderen Produkten normalisiert (Prefix/Suffix). **Keine** Schreibzugriffe auf die zentralen Master-Tabellen (`master_plu_items` / `backshop_master_plu_items`); die Namensdarstellung gilt **pro Markt** über die Layout-Engine. Button **„Alle Regeln anwenden“** persistiert nur noch Anpassungen in `renamed_items` bzw. `backshop_renamed_items`, wenn dort bereits eine Umbenennung für die PLU existiert.
  - **Zurücksetzen:** Auf der Seite Umbenannte Produkte pro Zeile „Zurücksetzen“ (mit Bestätigung) → Eintrag in `renamed_items` bzw. `backshop_renamed_items` wird gelöscht.
  - **Obst/Gemüse: Umbenennungen pro Markt** – In `renamed_items` gespeichert (store_id), gelten nur für den aktuell gewählten Markt.
  - **Backshop: Umbenennungen pro Markt** – In `backshop_renamed_items` gespeichert (store_id), gelten nur für den aktuell gewählten Markt. Orphan-Renames (PLU existiert nirgends mehr) werden täglich automatisch entfernt.
- **Suche in der Masterliste (Obst/Gemüse und Backshop):** In der Toolbar links neben den Anzeige-Infos gibt es ein **Lupen-Symbol**. Klick öffnet eine **fixierte Suchleiste** unter dem App-Header, **bündig mit dem Seiteninhalt** (gleicher `max-w-7xl`-Rahmen wie die Liste, links ausgerichtet, nicht am Viewport-Rand). PLU oder Artikelname eingeben, Treffer „X von Y“, **Pfeile** für vorheriger/nächster Treffer, die Liste scrollt zum Treffer. Der **aktuelle Treffer** wird nur durch **Markierung der passenden Zeichen** in PLU- und Artikelspalte hervorgehoben (nicht die ganze Zeile). **Escape** oder **X** schließt die Suche. Auf der Vollseite **Produkte umbenennen** gibt es weiterhin die einfache Filter-Suche (PLU/Name) ohne Treffer-Navigation.

## Feature: Warengruppen (Blöcke)

Produkte können in logische Gruppen eingeteilt werden (z.B. "Exotik", "Regional").

### Löschen einer Warengruppe (Obst und Backshop)
- Vor dem eigentlichen Löschen des Blocks werden **Master-Zeilen** der aktiven Version sowie **eigene Produkte** des aktuellen Markts, die der Gruppe zugeordnet waren (direkt per `block_id` oder nur per **namensbasiertem Markt-Override** auf diese Gruppe), auf **„Ohne Zuordnung“** (`block_id` null) gesetzt. So landen Artikel nicht wieder automatisch in einer anderen Master-Gruppe, sobald der Override durch CASCADE entfällt.
- TanStack-Query-Caches für **Markt-Overrides** und **Block-Reihenfolge** werden invalidiert; die Layout-Engine behandelt veraltete Block-IDs ohne passenden Block wie **Ohne** (Schutz vor kurzem Cache-Race).

### WarengruppenPanel (Split-Panel)
- **Links**: Liste aller Warengruppen mit Artikelanzahl; **Erstellen/Umbenennen/Löschen** der globalen Gruppen für **Admin und Super-Admin** (RLS `is_admin()`; Migration 055)
- **Rechts**: Alle Produkte mit Checkboxen, Suchfeld, Batch-Zuweisen an gewählte Gruppe; bei gewählter Gruppe **Produkte hinzufügen…** öffnet einen Dialog im gleichen Layout wie die **Vollseite „Produkte ausblenden“** (Suche, Mehrfachauswahl, Zuweisung an die Warengruppe per Markt-Override).
- **Markt-Workbench Obst:** Drei Spalten wie beim Backshop auf **`/user/obst-warengruppen`**, **`/admin/obst-warengruppen`** und **`/super-admin/obst-warengruppen`** (`ObstWarengruppenPanel`): links Warengruppen (Drop-Ziele, **Admin/Super-Admin:** waagerechter Griff = Reihenfolge `store_obst_block_order`; zudem **Neue Gruppe**, bei gewählter Gruppe **Umbenennen** und **Löschen** mit Bestätigungsdialog), Mitte Artikel mit Suche/Mehrfachauswahl, rechts Status und „Zuletzt geändert“. Die alte URL **`/admin/block-sort`** / **`/super-admin/block-sort`** leitet dorthin um. **Inhalt & Regeln** (`*/rules`): **Bezeichnungsregeln** (Namens-Schlagwörter). Das Split-Panel **`WarengruppenPanel`** ist im UI derzeit nicht eingebunden (Komponente im Repo für ggf. spätere Nutzung).
- **Zahlen links (Artikel je Gruppe)** und **„Ohne Zuordnung“** zählen nur Artikel, die in der **Hauptliste/PDF** auch erscheinen würden (`hidden_items` plus dieselbe Logik wie die Masterliste: **zentrale Werbung** vs. Ausblendung inkl. Megafon-Opt-out). In der Mitte bleiben alle zugeordneten Artikel sichtbar; ausgeblendete tragen ein Badge **„Ausgeblendet“** und ein Hinweis in der Unterzeile (sichtbar vs. ausgeblendet).
- Beim Zuweisen per Drag & Drop folgt das **Drag-Overlay** der Maus (`snapCenterToCursor`, wie bei Backshop); sind mehrere Artikel angehakt, zeigt das Overlay eine **„n Artikel“**-Badge.
- **Mehrfachauswahl:** Button **Alle auswählen** gilt für die **aktuell angezeigte** Mitte-Liste (inkl. Suchtreffer); **Alles abwählen** leert die Auswahl. Mit mehreren Häkchen verschiebt **ein Zug** alle markierten Artikel ins **gleiche Drop-Ziel**; der Dialog „Warengruppe wählen“ (Tap auf eine Karte) gilt bei aktiver Auswahl ebenfalls für **alle** angehakten Zeilen. **Zuletzt geändert** gruppiert Aktionen als **Batch** (aufklappbar): **Alles zurück** oder pro Zeile **Zurücknehmen** setzt auf die Zuordnung **vor** der jeweiligen Aktion zurück (Obst unterstützt zusätzlich „Override entfernen“ dort, wo wie bisher nur Master-Overrides betroffen sind).
- **Schmale Ansicht (unter 1280 px Breite):** Obst- und Backshop-Workbench zeigen zuerst **Status** und **Warengruppenliste**; nach Tap auf eine Gruppe die **Artikel** mit Zurück-Navigation. Zuordnung per **Tap auf den Artikel** und Dialog „Warengruppe wählen“ (bei Mehrfachauswahl wie oben); kein **Ziehen** einzelner Produkte (DnD) und bei Obst kein **Reihenfolge-Griff** für Warengruppen. **Ab 1280 px** bleibt die dreispaltige Karte mit Produkt-DnD wie bisher.

### WarengruppenSortierung (Legacy-Komponente)
- Die Komponente `WarengruppenSortierung` (Pfeile + DnD) ist im UI nicht mehr angebunden; die **Reihenfolge der Warengruppen am Markt** erfolgt in der Obst-Workbench bzw. weiterhin über `store_obst_block_order`.

### PLU-Liste bearbeiten (Backshop, `/admin/backshop-block-sort` / Super-Admin)
- Split-Layout: **Warengruppen** links (Drop-Zonen, Drag der Gruppe), **noch nicht zugeordnet** rechts; auf schmalen Viewports **untereinander** (`flex-col`). **Griff-Buttons** analog andere Backshop-Listen größer auf Mobil, kompakt ab `md`; Container: `data-testid="interactive-backshop-block-sort-root"`.

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

**Admin-Dashboard** (`/admin`): drei Einstiege **Obst und Gemüse**, **Backshop**, **Benutzer** (analog Super-Admin-Markt-Übersicht). Unter `/admin/obst` bzw. `/admin/backshop`: **PLU-Liste** (→ Masterliste / Backshop-Liste) und **Konfiguration der Liste** (→ `/admin/obst/konfiguration` bzw. `/admin/backshop/konfiguration` mit Layout, Regeln, Block-Sortierung). Von der Konfiguration aus führen Kacheln zu Layout, Regeln und Block-Sortierung mit **Zurück** zur Konfigurationsübersicht (`backTo`). **Super-Admin** weiterhin unter `/super-admin/...` mit Markt-Switcher.

Die Layout-Seite zeigt eine **Live-Vorschau** mit echten PLU-Daten, die sich sofort bei jeder Änderung aktualisiert.

| Einstellung | Optionen | UI |
|-------------|---------|-----|
| Sortierung | Alphabetisch (A-Z) oder nach Warengruppen | Radio-Cards |
| Anzeige-Modus | Gemischt (Stück+Gewicht) oder Getrennt | Radio-Cards |
| Flussrichtung | Zeilenweise (→↓) oder Spaltenweise (↓→) | Radio-Cards |
| Schriftgrößen | **Zeilenweise:** drei Felder – Listen-Überschrift (Listenkopf), Spaltenköpfe & Gruppen, Produktname & Zeilen (px). **Spaltenweise:** zwei Felder – Listen-Überschrift + ein gemeinsamer Wert für Spaltenköpfe, Gruppen und Produktzeilen (speichert `font_column_px` und `font_product_px` identisch, 8–24 px). Steuern Schriftgröße, Zellen-/Zeilenhöhe und Mindestabstände proportional. | Number-Inputs |
| Markierungs-Dauer | Rot: 1-4 KWs, Gelb: 1-4 KWs | Selects |
| Kalenderwoche | Optional **Woche mit Datum (Mo–Sa)** zur ISO-KW: In Masterliste, Backshop-Toolbar (Einspiel-KW) und PDF erscheint z. B. `KW07/2026 · 09.02.2026–14.02.2026` (getrennt für Obst/Gemüse und Backshop in den jeweiligen Layout-Einstellungen). | Switch |
| Features Ein/Aus (Obst) | Eigene Produkte, Ausblenden, Warengruppen (wird bei Sortierung „Nach Warengruppen“ automatisch mit eingeschaltet) | Switches |

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
- **Obst/Gemüse, spaltenweise (COLUMN_FIRST):** Zeitungslayout pro Seite – zuerst die **linke** Spalte von oben nach unten, dann oben **rechts** weiter; erst wenn beide Spalten voll sind, folgt die nächste Seite. Buchstaben- bzw. Block-Header werden bei Fortsetzung in der nächsten Spalte oder auf der nächsten Seite **wiederholt**; Header-Zeilen nutzen dieselbe Zeilenhöhe wie Produktzeilen, die kürzere Spalte wird unten mit Leerzeilen auf die gleiche Höhe gebracht. Die **Web-Masterliste** zeigt ab **md** (≥768px) dieselbe Zerlegung mit **zwei Spalten** (PLU \| Artikel) nebeneinander pro PDF-Seite und **gestrichelte Trennlinie** mit „Seite N“ zwischen den Seiten; **unter md** eine durchgehende **eine** Spalte in derselben Reihenfolge wie die Suche (links→rechts pro Seite).
- **Obst-PDF Legende:** Hinweis zu PLU-/Namens-Farben steht **unten** auf jeder Seite in **einer Zeile** (kompakter Kasten, Farbkästchen; Druckfarben etwas kräftiger als im Browser, damit Gelbtöne unterscheidbar sind), nicht unter den Spaltenköpfen.
- Schriftgrößen aus Layout-Einstellungen (font_header_px, font_column_px, font_product_px) werden ins PDF übernommen; sie steuern Schriftgröße, Zeilen-/Bannerhöhen und Mindestabstände proportional (Formel: Höhe = Schrift + 2×Padding). Gleiche Logik in den **Backshop-Layout-Einstellungen** (Labels und Spaltenweise wie oben).
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
