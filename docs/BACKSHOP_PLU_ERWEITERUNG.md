# Backshop-PLU-Erweiterung – Anforderungen & Plan

**Wichtig:** Die bestehende **Obst/Gemüse-PLU-Liste darf durch die Erweiterung nicht kaputt gehen.** Alle Änderungen müssen so erfolgen, dass die erste Liste unverändert funktioniert. Gemeinsame Logik in `src/lib/` erweitern statt duplizieren; wo nötig über Parameter (z. B. `listType`) oder getrennte Tabellen trennen.

---

## 1. Ziel

- **Zweite PLU-Liste „Backshop“** neben der bestehenden „Obst/Gemüse“-Liste.
- Backshop: PLU (5-stellig), Name (Warentext), **Abbildung (Bild)**. **Kein** Stück/Gewicht wie bei Obst/Gemüse – stattdessen **Warengruppen** (z. B. Baguettes, Brot, Süßkram, Laugenstangen), die der User selbst anlegt und Produkten zuweist. Sortierung: **alphabetisch** oder **nach Warengruppen** (innerhalb der Gruppe alphabetisch). Obst/Gemüse: wie bisher (PLU, Name, Typ Stück/Gewicht, keine Bilder).
- **Gleiche Funktionen** für Backshop: Upload, Umbenennen, Ausblenden, Eigene Produkte, PDF. Alle getrennt pro Listentyp.
- **Gemeinsam:** Nur **Benutzer** (Auth, Rollen, User-Verwaltung). **Getrennt:** Versionen, Master-Items, Eigene Produkte, Ausgeblendete, Umbenannte, Benachrichtigungen, Layout, Regeln, Blöcke.
- **Kein Hardcoding:** Gemeinsame Library in `src/lib/` und ggf. parametrisierte Hooks/Komponenten nutzen; beide Listen bauen auf derselben Basis auf.

---

## 2. Excel Backshop

### 2.1 Spalten-Erkennung (intelligent, nicht hardcoded)

Das System soll **automatisch** erkennen (über Inhalt, nicht feste Spaltenbuchstaben):

- **PLU:** Spalte, in der ein **5-stelliger** numerischer Wert steht (Regex `/^\d{5}$/`). Andere Spalten (z. B. 4-stellig wie 8304) nicht als PLU verwenden. Führende Nullen erlaubt.
- **Name/Warentext:** Spalte mit dem „Haupttext“ – typischerweise längster Text bzw. Spalte mit Wort/Wörtern. Siehe Namens-Bereinigung unten.
- **Abbildung:** Spalte, in der **eingebettete Bilder** (Excel-Objekte/Shapes/Images) vorkommen. Technisch: Zuordnung Zeile ↔ Bild über Excel-API (xlsx-Bibliothek).

Optional: Fallback für bekannte Vorlagen (z. B. Header „ZWS PLU“ → PLU-Spalte), Hauptlogik bleibt inhaltsbasiert. **Implementierungsdetails, PLU-Normalisierung und Fehlerbehebung:** [BACKSHOP_EXCEL_PARSER.md](BACKSHOP_EXCEL_PARSER.md).

### 2.2 Namens-Bereinigung (Warentext)

- In der Quelle steht oft mehr als der Produktname, z. B. „Hotdog Deluxe, 123g, A-R-Y-Z-T-A“ oder „Produktname, Grammzahl, Code-Wort“.
- **Regel:** Nur den **Teil bis zum ersten Komma** als Namen übernehmen (z. B. „Hotdog Deluxe“). Alles nach dem ersten Komma (Grammzahl, Codes) verwerfen.
- Kein Komma in der Zelle → gesamten Zellinhalt als Namen nehmen.
- Ziel: Einheitlicher, kurzer Anzeigename ohne Zusatzinfos.

### 2.3 Mehrere Excel-Dateien pro KW

- Für **eine KW** muss der Super-Admin **mehrere Excel-Dateien** hochladen können (z. B. eine pro Kategorie/Sortiment). Das System gleicht ab, welche Excel-Tabellen vorhanden sind, **welche Bilder enthalten** und welche nicht, und gibt dem User einen klaren Überblick (welche Dateien haben Bilder, welche nicht). Die Daten aus allen Dateien werden für diese KW zusammengeführt bzw. verglichen.

### 2.4 Verschiedene Excel-Formate

- Es gibt unterschiedliche Quellen: Manche Listen haben **keine PLU-Nummer** → können nicht verwendet werden. Manche haben z. B. Spalte „Etikettentext“ (kurzer Produktname), manche sehr lange Bezeichnungen (z. B. Snacks). Parser und Spalten-Erkennung müssen mit verschiedenen Formaten umgehen; Listen ohne gültige PLU werden abgelehnt oder übersprungen. Ggf. muss der User manuell zuordnen, was zu welcher Warengruppe gehört.

### 2.5 Dateigröße

- Backshop-Excel typisch **~76–100 MB** (eingebettete Bilder). Beim Implementieren von Anfang an berücksichtigen: Fortschrittsanzeige beim Upload, ggf. Chunking oder server-seitige Verarbeitung, damit keine Timeouts oder Speicherprobleme entstehen.

---

## 3. Bilder

### 3.1 Speicherung

- Bilder aus der Excel werden in **Supabase Storage** (Bucket `backshop-images`) gespeichert (nicht nur Referenz in DB). In der Datenbank nur Referenz (URL; bei privatem Bucket signierte URL mit langer Gültigkeit). So sind sie dauerhaft vorhanden und schnell ladbar.
- **Automatische Extraktion beim Upload:** Beim Hochladen einer Backshop-Excel extrahiert die App eingebettete Bilder (über **ExcelJS**), lädt sie in den Bucket und ordnet sie anhand der Zellposition (Zeile/Spalte) den richtigen Produkten zu. Implementierung: [src/lib/backshop-excel-images.ts](../src/lib/backshop-excel-images.ts), Einbindung in [src/hooks/useBackshopUpload.ts](../src/hooks/useBackshopUpload.ts). Beide Layouts (Zeilen-Layout und Spalten-Layout) werden unterstützt.

### 3.2 Abgleich bei neuem Upload (Bild-Erhalt)

- Beim Hochladen einer **neuen** Backshop-Liste: gleiche Vergleichslogik wie bei Obst/Gemüse (neu = gelb, PLU geändert = rot, unverändert = unverändert).
- **Zusatzregel:** Wenn für ein Produkt (Match über **PLU** bzw. **Name**) die **neue** Liste **kein** Bild hat, das System aber **bereits** ein Bild für diese PLU/diesen Namen hat (z. B. aus Vorversion): **bestehendes Bild beibehalten** (nicht löschen). Ziel: Im besten Fall immer ein Bild pro Produkt, wo es einmal eines gab.

### 3.3 Manuelle Bild-Verwaltung pro Produkt (im Reiter Umbenennen)

- Die Möglichkeit, Bilder **hinzuzufügen**, **zu ersetzen** oder **zu löschen**, wird **im Umbenennen-Bereich** angeboten – dort, wo bereits Produkte umbenannt werden können (Seite „Umbenannte Produkte“, Dialog „Produkte umbenennen“). Pro Produkt kann dort also sowohl der **Name** als auch das **Bild** angepasst werden (Bild hochladen / ersetzen / löschen). Eine separate „Bild bearbeiten“-Aktion in der Tabelle ist nicht nötig; alles gebündelt unter Umbenennen. Speicherung: Supabase Storage, Referenz in DB aktualisieren.
- **Nur Bild geändert:** Wenn der Anzeigename **nicht** vom Systemnamen abweicht (also nur das Bild geändert wird), wird das Produkt **nicht** in der Liste „Umbenannte Produkte“ geführt (Migration 015: `is_manually_renamed` nur true, wenn `display_name` ≠ `system_name`). So tauchen Korrekturen nach falscher Bild-Zuordnung beim Upload nicht als „umbenannt“ auf.

### 3.4 Technische Details (Bild-Zuordnung und -qualität)

- **Zeile/Spalte 0-basiert:** Die Zuordnung Bild ↔ PLU erfolgt über (Zeile, Spalte). Der **Parser** speichert `imageSheetRow0`/`imageSheetCol0` **0-basiert** (Array-Index). **ExcelJS** liefert `nativeRow`/`nativeCol` **1-basiert**; in `backshop-excel-images.ts` werden diese vor dem Abgleich auf 0-basiert umgerechnet (`row = nativeRow - 1`, analog für Spalte), damit alle Treffer korrekt zugeordnet werden (insbesondere die ersten Zeilen).
- **Bildskalierung beim Upload:** Vor dem Hochladen werden Bilder per Canvas API auf eine einheitliche Größe skaliert (längere Kante = 192 px, Seitenverhältnis erhalten), damit kleine Excel-Thumbnails in der Anzeige (96 px) schärfer wirken. Bei Fehlern beim Resize wird der Original-Buffer hochgeladen.

---

## 4. PDF Backshop

- Backshop-Liste als **PDF mit Bildern** exportierbar.
- **Reihenfolge pro Eintrag:** erst **Bild**, dann **PLU**, dann **Name** (nicht PLU + Name ohne Bild). Zwei Spalten wie bei Obst/Gemüse.
- **Kopf:** Eindeutige Bezeichnung **„PLU-Liste Backshop“** (damit sofort erkennbar, welche Liste es ist).
- **Footer:** Wie bei Obst/Gemüse: Von wann die PLU-Liste ist (KW/Datum), wann ausgedruckt, Seitenzahl (z. B. „Seite 1 von n“). Gemeinsame Footer-Logik aus `src/lib/pdf-generator.ts` wiederverwenden.

---

## 5. Trennung der Listentypen

| Bereich | Obst/Gemüse | Backshop |
|--------|-------------|----------|
| **Benutzer** | gemeinsam | gemeinsam |
| Versionen | `versions` (bzw. mit `list_type`) | getrennt |
| Master-Items | `master_plu_items` | getrennt (inkl. Bild-Referenz) |
| Eigene Produkte | `custom_products` | getrennt (Backshop: **Bild Pflicht**) |
| Ausgeblendete | `hidden_items` | getrennt |
| Umbenannte | display_name / renamed | getrennt |
| Benachrichtigungen | `version_notifications` | getrennt |
| Layout-Einstellungen | `layout_settings` | getrennt |
| Bezeichnungsregeln | `bezeichnungsregeln` | getrennt |
| Blöcke/Warengruppen | `blocks` | getrennt |

In der UI überall klar **markieren**, welche Liste gerade gemeint ist (z. B. „PLU-Liste Backshop“ vs. „PLU-Liste Obst/Gemüse“).

### Backshop: Kein Stück/Gewicht, nur Warengruppen & Sortierung

- Bei Backshop gibt es **kein** Feld „Stück“ vs. „Gewicht“ (kein `item_type` wie bei Obst/Gemüse). Stattdessen: **Warengruppen** (Blöcke), die der User **selbst anlegt** (z. B. Baguettes, Brot, Süßkram, Laugenstangen). Nicht alle Produkte müssen einer Warengruppe zugeordnet sein; Zuordnung erfolgt manuell (und ggf. über Regeln). **Anzeige:** nur zwei Optionen – **„Alle zusammen (alphabetisch)“** oder **„Nach Warengruppen (alphabetisch)“**; innerhalb jeder Warengruppe immer A–Z. Das Layout für Backshop unterstützt also nur diese beiden Modi (ALPHABETICAL / BY_BLOCK), nicht Stück/Gewicht.
- **PDF:** Bei „Nach Warengruppen“ kann optional **„Jede Warengruppe auf eigener Seite“** aktiviert werden; dann beginnt jede Warengruppe im PDF auf einer neuen Seite.
- **Nach Upload:** Alle Artikel einer neuen Backshop-Version haben zunächst keine Warengruppe. Nach dem Upload erscheint ein Hinweis und der Button „Warengruppen zuordnen“ führt zur Seite „Inhalt & Regeln (Backshop)“; dort zeigt eine Info-Box die Anzahl unzugeordneter Artikel, bis die Zuordnung im Warengruppen-Bereich erfolgt ist.
- **Drag & Drop:** In „Liste interaktiv bearbeiten“ und im Warengruppen-Panel folgt das Drag-Overlay der Maus (Modifier `snapCenterToCursor` aus `@dnd-kit/modifiers`), sodass beim Ziehen klar erkennbar ist, welches Produkt bzw. welche Warengruppe bewegt wird.
- **Rechte Spalte im Warengruppen-Panel:** Ohne Auswahl einer Warengruppe werden nur **unzugeordnete** Produkte angezeigt; bei Klick auf eine Warengruppe nur die **Produkte dieser Gruppe** (z. B. versehentlich bei Snacks gelandete Croissants sichtbar und per Zuweisen oder Drag auf „Brötchen“ korrigierbar). Optional: Button „Zuordnung aufheben“ für markierte Produkte.
- **Zuordnung nach Schlagwort:** Auf der Seite „Inhalt & Regeln (Backshop)“ gibt es die Karte **„Zuordnung nach Schlagwort“**. Regeln vom Typ „NAME_CONTAINS“ (Schlagwort → Warengruppe) können angelegt und gelöscht werden. Mit **„Regeln jetzt anwenden“** werden Produkte automatisch zugeordnet; Standard ist „Nur unzugeordnete Produkte zuordnen“. Logik in `src/lib/apply-backshop-block-rules.ts`; Speicherung in `backshop_block_rules`.

---

## 6. Eigene Produkte Backshop

- Gleiche Idee wie bei Obst/Gemüse: globale eigene Produkte, Master hat Vorrang. **Unterschied: Beim Anlegen eines eigenen Produkts in der Backshop-Liste ist ein Bild Pflicht.**
- Referenzen im bestehenden System: `src/components/plu/CustomProductDialog.tsx`, `src/hooks/useCustomProducts.ts`. Für Backshop: eigene Tabelle oder `list_type`; Dialog mit **Pflichtfeld Bild** (Upload).

---

## 7. Gemeinsame Library (Obst/Gemüse-Struktur nutzen)

Die Obst/Gemüse-PLU-Liste baut auf folgenden Modulen auf. Diese **erweitern** bzw. **wiederverwenden**, nicht neu schreiben. So bleiben beide Listen konsistent und die erste geht nicht kaputt.

### 7.1 Lib-Module (`src/lib/`)

| Datei | Verwendung Obst/Gemüse | Für Backshop |
|-------|------------------------|--------------|
| `src/lib/layout-engine.ts` | `buildDisplayList()` – Master + Custom − Hidden + Regeln + Sortierung | Erweitern: optionales Feld `image_url` (oder ähnl.), ggf. `listType`; gleiche Schritte 1–7, Obst/Gemüse liefert null für Bild. |
| `src/lib/comparison-logic.ts` | `compareWithCurrentVersion()`, `resolveConflicts()` – KW-Vergleich | Wiederverwenden für Backshop; Zusatz: bei Match (PLU/Name) und fehlendem Bild in neuer Liste → bestehendes Bild übernehmen. |
| `src/lib/plu-helpers.ts` | `formatKWLabel`, `getDisplayPlu`, `getDisplayNameForItem`, `groupItemsByLetter`, `groupItemsByBlock`, `splitLetterGroupsIntoColumns`, `splitItemsRowByRow`, `calculatePLUStats`, `getStatusColorClass`, `PLUItemBase`, `filterItemsBySearch`, `itemMatchesSearch` | Beibehalten; ggf. Typ/Interface um optionales Bild erweitern. Keine Duplikation. |
| `src/lib/keyword-rules.ts` | `nameContainsKeyword`, `normalizeKeywordInName`, `applyAllRulesToItems` | Gleiche Library; Backshop nutzt eigene Regeln (getrennte Tabelle/`list_type`). |
| `src/lib/date-kw-utils.ts` | `getCurrentKW`, `getNextFreeKW`, `versionExistsForKW`, `getKWOptionsForUpload`, `getUploadYearOptions`, `clampKWToUploadRange` | Wiederverwenden für Backshop-Versionen (gleiche KW-Logik). |
| `src/lib/pdf-generator.ts` | `generatePDF()` – A4, zwei Spalten, Footer (KW, Datum, Seite), Farben | Footer-Logik wiederverwenden; eigener Aufruf/Modus für Backshop: Reihenfolge Bild → PLU → Name, Kopf „PLU-Liste Backshop“. |
| `src/lib/excel-parser.ts` | `parseExcelFile()` – Obst/Gemüse-Excel (Stück/Gewicht, KW aus Dateiname) | **Neuer Parser** oder neues Modul (z. B. `backshop-excel-parser.ts`): Spalten-Erkennung PLU/Name/Abbildung, Namens-Bereinigung (bis erstes Komma), Bild-Extraktion. Keine festen Spaltenbuchstaben. |
| `src/lib/publish-version.ts` | `publishVersion()` – Version anlegen, Items batchweise einfügen, aktivieren, Notifications | Für Backshop: gleiche Logik mit Backshop-Tabellen bzw. `list_type`; ggf. Bild-URL in Items. |
| `src/lib/ensure-active-version.ts` | `ensureActiveVersion()` – eine Version aktiv | Für Backshop analog (eigene Versionen-Tabelle oder `list_type`). |

### 7.2 Hooks (`src/hooks/`)

| Hook | Verwendung | Für Backshop |
|------|------------|--------------|
| `useActiveVersion.ts` | Aktive KW-Version | Entweder Parameter `listType` und Abfrage mit Filter, oder eigener Hook `useBackshopActiveVersion` mit Backshop-Tabelle. |
| `useVersions.ts` | Alle Versionen (Dropdown) | Analog getrennt für Backshop. |
| `usePLUData.ts` | Master-Items einer Version | Getrennt für Backshop (Items inkl. Bild-Referenz). |
| `useCustomProducts.ts` | CRUD eigene Produkte | Getrennt für Backshop; **Bild Pflicht** beim Anlegen (Upload in Storage). |
| `useHiddenItems.ts` | Ausblenden/Einblenden | Getrennt für Backshop (eigene Tabelle oder `list_type`). |
| `useLayoutSettings.ts` | Layout-Konfiguration | Getrennt für Backshop (eigene Zeile oder `list_type`). |
| `useBlocks.ts` | Warengruppen/Blöcke | Getrennt für Backshop. |
| `useBezeichnungsregeln.ts` | Keyword-Regeln | Getrennt für Backshop. |
| `useNotifications.ts` | version_notifications | Getrennt für Backshop (eigene Tabelle oder `list_type`). |
| `usePLUUpload.ts` | Excel parsen, vergleichen, publish | Für Backshop: Backshop-Parser, Vergleich inkl. Bild-Erhalt, Backshop-publish. |

### 7.3 Typen (`src/types/`)

- `src/types/plu.ts`: `DisplayItem`, `LayoutEngineInput`, `LayoutEngineOutput`, `ParsedPLURow`, `ComparisonResult` usw. **Erweitern** um optionale Felder (z. B. `image_url`) und ggf. `listType: 'obst_gemuese' | 'backshop'`, statt neue parallele Typen zu bauen. So können dieselben Komponenten/Funktionen beide Listen bedienen.
- `src/types/database.ts`: Bei getrennten Backshop-Tabellen neue Typen; bei `list_type` bestehende Tabellen um Spalte `list_type` und ggf. `image_url` erweitern.

### 7.4 Seiten & Komponenten

- **MasterList:** `src/pages/MasterList.tsx` – nutzt `buildDisplayList`, KWSelector, PLUTable, Toolbar. Für Backshop: eigene Seite oder gleiche Seite mit Parameter (z. B. Route `/user/backshop-list`), gleiche Layout-Engine mit Backshop-Daten; Tabelle mit Bild-Spalte.
- **Upload:** `src/pages/PLUUploadPage.tsx` + `src/hooks/usePLUUpload.ts` – für Backshop eigene Route/Seite oder Modus, Backshop-Parser und -Publish.
- **Dialoge:** `CustomProductDialog`, `HideProductsDialog`, `RenameProductsDialog`, `ExportPDFDialog` – für Backshop Varianten oder Parameter (listType); bei CustomProduct Backshop **Bild Pflicht**. **RenameProductsDialog / Seite Umbenannte Produkte:** Für Backshop hier zusätzlich Bild-Verwaltung (hochladen/ersetzen/löschen) pro Produkt integrieren – ein Ort für „Name + Bild anpassen“.

---

## 8. Performance

- **Große Excel (76–100 MB):** Upload mit Fortschrittsanzeige; Verarbeitung ggf. in Chunks oder server-seitig, damit Browser nicht hängt.
- **Bilder in der UI:** Lazy Loading oder Thumbnails, damit die Liste schnell lädt.
- **PDF-Generierung:** Nicht blockierend (evtl. Web Worker oder async), gleiche Anforderung wie bei Obst/Gemüse.

---

## 9. Verständnis, Trennung, Risiken & Rückfragen

### 9.1 So ist der Plan verstanden

- **Ziel:** Eine zweite PLU-Liste **„Backshop“** bauen – im **gleichen Tool** wie die bestehende **„Obst/Gemüse“**-Liste. Beide Listen bleiben dauerhaft getrennt.
- **Obst/Gemüse-PLU-Liste (bestehend):** PLU (5-stellig), Name, Typ (Stück/Gewicht), optional Preis; **keine Bilder**. Upload pro KW, Vergleich, eigene Produkte, ausblenden, umbenennen, PDF – alles wie heute. Wird **nicht** verändert in dem Sinne, dass sich Ablauf oder sichtbare Daten vermischen.
- **Backshop-PLU-Liste (neu):** PLU (5-stellig), Name, **Abbildung (Bild)**. Gleiche Funktionen (Upload, Umbenennen, Ausblenden, Eigene Produkte, PDF), aber **eigene Daten**: eigene Versionen, eigene Items, eigene eigene Produkte, eigene ausgeblendete, eigene umbenannte, eigene Benachrichtigungen, eigenes Layout, eigene Regeln, eigene Blöcke.
- **Gemeinsam:** Nur die **Benutzer** (Auth, Rollen, User-Verwaltung). Ein User kann beide Listen sehen und je nach Kontext „Obst/Gemüse“ oder „Backshop“ wählen.
- **Trennung in der Anzeige:** Backshop erscheint **niemals** in der Obst/Gemüse-PLU-Liste; Obst/Gemüse erscheint **niemals** in der Backshop-PLU-Liste. Umbenannte Produkte, Bilder, eigene Produkte, ausgeblendete usw. sind **pro Liste getrennt** – Backshop-Daten tauchen nirgends in Obst/Gemüse auf und umgekehrt.
- **Library:** Gemeinsame Logik in `src/lib/` (z. B. `buildDisplayList`, Vergleich, Helfer, PDF-Footer) wird **erweitert** (optionale Parameter wie `listType`, `image_url`), nicht kopiert. Beide Listen nutzen dieselben Funktionen; die **Datenquelle** (Tabellen/Queries) ist je nach Liste unterschiedlich und strikt getrennt.

### 9.2 Risiken für die Obst/Gemüse-PLU-Liste (Vermeidung)

- **Gemeinsame Tabellen mit `list_type`:** Wenn Backshop und Obst/Gemüse in derselben Tabelle landen (z. B. `versions`, `master_plu_items`), muss **jede** Abfrage zwingend nach `list_type` filtern. Eine vergessene Filterung könnte Backshop-Daten in der Obst/Gemüse-Liste anzeigen oder umgekehrt. Bei Implementierung: konsequent prüfen, dass alle Queries für Obst/Gemüse nur Obst/Gemüse-Daten lesen/schreiben.
- **Erweiterung der Layout-Engine / Typen:** Neue optionale Felder (z. B. `image_url`, `listType`) müssen so eingebaut werden, dass bestehende Aufrufer für Obst/Gemüse **ohne Anpassung** weiterlaufen (z. B. `image_url` optional, Obst/Gemüse liefert `null`/`undefined`). Keine Pflichtfelder für Obst/Gemüse einführen, die es heute nicht gibt.
- **Cron-Jobs (KW-Switch):** Siehe Abschnitt 9.3 – Cron wechselt zwischen Samstag und Sonntag auf die nächste KW. **Vor** dem automatischen Wechsel muss der Super-Admin entschieden haben: neue PLU-Liste oder alte behalten? Ist bis zum Wechsel (Sa→So) keine neue Liste hochgeladen, bleibt die **alte** Liste aktiv. Lädt der Super-Admin später eine neue Liste hoch, wird diese dann genutzt. Backshop-Cron analog: nur Backshop-Versionen betreffen; Obst/Gemüse-Cron nur Obst/Gemüse.
- **Dialoge/Komponenten mit geteilter UI:** Wenn z. B. „Produkte umbenennen“ oder „Eigene Produkte“ für beide Listen genutzt wird: Immer **listType** oder klare Datenquelle übergeben, sodass nur die gerade gewählte Liste geladen/gespeichert wird. Kein gemeinsamer State, der Obst/Gemüse und Backshop mischt.
- **RLS (Row Level Security):** Backshop-Tabellen bzw. Zeilen mit `list_type = 'backshop'` so absichern, dass nur die vorgesehenen Rollen zugreifen. Bestehende RLS für Obst/Gemüse darf nicht so geändert werden, dass Backshop-Daten sichtbar werden oder Obst/Gemüse-Zugriff eingeschränkt wird.

### 9.3 Klarstellungen (Cron, Backshop-Sortierung, mehrere Excel)

- **Cron / KW-Switch:** Zwischen **Samstag und Sonntag** wird automatisch auf die nächste KW gewechselt. **Wichtig:** Vor diesem Wechsel muss der **Super-Admin** entschieden haben, ob es eine **neue** PLU-Liste gibt oder die **alte** weiter gilt. Ist bis Sa→So **keine** neue Liste hochgeladen, wird vorerst die **alte** Liste weiter verwendet. Lädt der Super-Admin später eine neue Liste hoch, wird diese dann aktiv. Für Backshop gilt dasselbe Prinzip (eigener Cron oder eigener Lauf mit `list_type`: nur Backshop-Versionen; Obst/Gemüse-Cron berührt nur Obst/Gemüse).
- **Backshop: Kein Stück/Gewicht (item_type):** Backshop hat **kein** Feld Stück/Gewicht. Stattdessen: **Warengruppen** (vom User angelegt, z. B. Baguettes, Brot, Süßkram, Laugenstangen). Sortierung **auswählbar:** **alphabetisch** oder **nach Warengruppen** (innerhalb Warengruppe alphabetisch). Kein `item_type` für Backshop-Items nötig.
- **Mehrere Excel pro KW (Backshop):** Pro KW können **mehrere** Excel-Dateien hochgeladen werden. System zeigt Übersicht: welche Tabellen vorhanden sind, welche Bilder haben, welche nicht. Daten werden für diese KW zusammengeführt/verglichen.
- (Weitere Rückfragen nach Bedarf hier ergänzen.)

---

## 10. Aufgaben für Agenten

Jede Aufgabe so umsetzen, dass die **bestehende Obst/Gemüse-PLU-Liste nicht beeinträchtigt** wird. Vor Änderungen: `docs/FEATURES.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE.md` lesen. Nach Änderungen: `npm run build` und manueller Test Obst/Gemüse (Upload, Liste, PDF, Eigene Produkte).

| ID | Aufgabe | Relevante Dateien / Module | Akzeptanzkriterien |
|----|--------|----------------------------|---------------------|
| **A1** | DB-Entwurf & Migrationen | `supabase/migrations/`, `docs/DATABASE.md` | Entscheidung dokumentieren: gemeinsame Tabellen mit `list_type` vs. getrennte Tabellen für Backshop. Migrationen für Backshop (Versionen, Items inkl. Bild-Referenz, custom_products, hidden_items, Umbenennungen, version_notifications, layout_settings, bezeichnungsregeln, blocks) anlegen. Migrationen laufen durch; DATABASE.md aktualisiert. |
| **A2** | Excel-Parser Backshop & Mehrere Excel pro KW | `src/lib/` (z. B. `backshop-excel-parser.ts`), Upload-UI Backshop | PLU 5-stellig, Name (ggf. „Etikettentext“/längster Text), Namens-Bereinigung bis erstes Komma, Abbildung erkannt. **Pro KW mehrere Excel-Dateien** hochladbar; System zeigt Übersicht: welche Dateien, welche mit/ohne Bilder. Listen ohne PLU ablehnen/überspringen. Verschiedene Formate (Etikettentext, lange Texte) unterstützen. Große Dateien (~76–100 MB) berücksichtigen. |
| **A3** | Supabase Storage & Bild-Referenz | Supabase Bucket, RLS, Backshop-Items-Tabelle | Bucket für Backshop-Bilder anlegen, RLS so dass authentifizierte User lesen/schreiben dürfen. In Backshop-Items Spalte für Bild-URL/Pfad. Upload/Abruf aus App möglich. ARCHITECTURE.md bzw. DATABASE.md angepasst. |
| **A4** | Vergleich & Bild-Erhalt | `src/lib/comparison-logic.ts` (erweitern oder Backshop-Wrapper) | Für Backshop: gleiche Vergleichslogik (unchanged, pluChanged, new, removed, conflicts). **Zusatz:** Bei Match (PLU oder Name) und fehlendem Bild in neuer Liste → bestehendes Bild aus Vorversion in Ergebnis übernehmen. Obst/Gemüse-Code unverändert (keine Regression). |
| **A5** | Layout-Engine erweitern | `src/lib/layout-engine.ts`, `src/types/plu.ts` | `DisplayItem` bzw. Input um optionales `image_url` erweitern. Backshop: **kein** `item_type` (Stück/Gewicht); Sortierung nur **ALPHABETICAL** oder **BY_BLOCK** (Warengruppen), innerhalb Warengruppe alphabetisch. `buildDisplayList()` für Backshop mit Bild-URL; für Obst/Gemüse unverändert (null/undefined Bild). Build und Tests grün. |
| **A6** | UI Backshop-Liste & Dashboard | `src/pages/`, `src/App.tsx` (Routen), User-/Viewer-/Admin-Dashboards | Neue Route(s) z. B. `/user/backshop-list`, `/viewer/backshop-list` usw. Dashboard-Karten: „PLU-Liste Obst/Gemüse“ und „PLU-Liste Backshop“. Backshop-Liste: Tabelle mit Bild, PLU, Name; klar gekennzeichnet „PLU-Liste Backshop“. Obst/Gemüse-Liste unverändert erreichbar. |
| **A7** | Eigene Produkte / Ausblenden / Umbenennen Backshop | `src/hooks/`, Backshop-Varianten der Seiten/Dialoge, `CustomProductDialog`, Seite Umbenannte Produkte / Dialog „Produkte umbenennen“ | Eigene Produkte, Ausblendete, Umbenannte für Backshop getrennt (eigene Tabellen oder `list_type`). **Backshop eigenes Produkt: Bild Pflicht** – Dialog mit Pflichtfeld Bild-Upload. **Bild-Verwaltung (hochladen/ersetzen/löschen) in den Umbenennen-Bereich integrieren:** Im Backshop-Reiter „Umbenennen“ (Seite Umbenannte Produkte, Dialog „Produkte umbenennen“) pro Produkt auch Bild anpassen können. Referenz: `src/components/plu/CustomProductDialog.tsx`, `src/hooks/useCustomProducts.ts`, `src/pages/RenamedProductsPage.tsx`, `RenameProductsDialog`. Obst/Gemüse-Flows unverändert. |
| **A8** | Benachrichtigungen getrennt | `version_notifications` bzw. Backshop-Äquivalent, Glocke, `useNotifications` | Pro Listentyp getrennte Notifications. Backshop-Upload löst nur Backshop-Benachrichtigungen aus. Glocke zeigt nur für gewählte Liste (oder beide getrennt). |
| **A9** | PDF Backshop | `src/lib/pdf-generator.ts` | Neuer Export oder Modus für Backshop: Reihenfolge **Bild → PLU → Name** pro Eintrag; Kopf „PLU-Liste Backshop“; Footer wie Obst/Gemüse (KW, Druckdatum, Seite) – gemeinsame Footer-Logik wiederverwenden. Obst/Gemüse-PDF unverändert. |
| **A10** | Manuelle Bild-Verwaltung (im Umbenennen-Bereich) | Backshop: Seite „Umbenannte Produkte“, Dialog „Produkte umbenennen“, Supabase Storage, DB | Im **Umbenennen-Reiter** für Backshop: pro Produkt neben Name auch **Bild hochladen / ersetzen / löschen** anbieten (gleicher Dialog/Seite wie Umbenennen). Kein separates „Bild bearbeiten“ in der Tabelle. Speicherung in Supabase Storage; Referenz in DB aktualisieren. |
| **A11** | Tests & Absicherung | Gesamtapp, `npm run build` | Obst/Gemüse: Upload, Masterliste, PDF, Eigene Produkte, Ausblenden, Umbenennen manuell getestet – keine Regression. Backshop: großer Excel-Upload (falls möglich), Abgleich mit Bild-Erhalt, PDF-Export getestet. Build grün. |

### Abhängigkeiten zwischen Aufgaben

- **A1** vor A2, A3, A4, A5, A6, A7, A8, A9, A10 (DB/Storage zuerst).
- **A2** (Parser) vor **A4** (Vergleich braucht geparste Daten).
- **A3** (Storage) vor **A9** (PDF mit Bildern), **A10** (manuelles Bild).
- **A5** (Layout-Engine) vor **A6** (UI Liste), **A9** (PDF).
- **A6** vor **A7** (Eigene Produkte/Ausblenden/Umbenennen auf Backshop-Liste).
- **A11** am Ende (nach allen anderen).

---

## 12. Implementierungsplan – Reihenfolge & Phasen

Konkrete Abarbeitung für dich oder einen Agenten. Nach jeder Phase: `npm run build`, Obst/Gemüse-Flows kurz testen (keine Regression).

### Phase 1: Datenbasis (DB + Storage)

| Schritt | Aufgabe | Kurz was tun |
|--------|--------|----------------|
| 1 | **A1** | DB-Entscheidung: getrennte Backshop-Tabellen oder `list_type` in bestehenden Tabellen. Migrationen anlegen (Versionen, Items inkl. Bild-Referenz, custom_products, hidden_items, Umbenennungen, version_notifications, layout_settings, bezeichnungsregeln, blocks). Migrationen ausführen, `docs/DATABASE.md` aktualisieren. |
| 2 | **A3** | Supabase Bucket für Backshop-Bilder anlegen, RLS setzen. In Backshop-Items-Tabelle Spalte für Bild-URL/Pfad. Doku anpassen. |

**Check nach Phase 1:** Build grün, Obst/Gemüse unverändert (keine neuen Abfragen ohne Filter).

#### Phase 1 – Detailplan (Datenbasis)

**Entscheidung DB-Struktur:** Getrennte Tabellen für Backshop (kein `list_type` in bestehenden Tabellen). Begründung: Keine Änderung an `versions`, `master_plu_items`, `custom_products` usw. – alle bestehenden Queries bleiben unverändert, null Risiko für Obst/Gemüse. Backshop nutzt eigene Tabellen mit eigenem Schema (z. B. Backshop-Items ohne `item_type`, mit `image_url`).

**Neue Tabellen (Migration 011):**
- `backshop_versions` – wie `versions` (kw_nummer, jahr, status, published_at, frozen_at, delete_after, created_by). UNIQUE(kw_nummer, jahr).
- `backshop_blocks` – wie `blocks` (name, order_index). Warengruppen nur für Backshop.
- `backshop_block_rules` – wie `block_rules`, FK auf `backshop_blocks`.
- `backshop_master_plu_items` – wie master_plu_items, aber: **kein** `item_type`, **kein** `is_admin_eigen`, **kein** `preis`; dafür **`image_url` TEXT** (Referenz auf Storage). Felder: id, version_id (→ backshop_versions), plu, system_name, display_name, status, old_plu, warengruppe, block_id (→ backshop_blocks), is_manually_renamed, image_url. UNIQUE(version_id, plu).
- `backshop_custom_products` – wie custom_products, aber: **kein** `item_type`; **`image_url` NOT NULL** (Bild Pflicht). plu, name, image_url, block_id, created_by, created_at, updated_at.
- `backshop_hidden_items` – wie hidden_items (plu UNIQUE, hidden_by, created_at).
- `backshop_version_notifications` – wie version_notifications, version_id → backshop_versions.
- `backshop_layout_settings` – Singleton wie layout_settings (sort_mode, font_*, mark_*_kw_count, features_*); eine Zeile, Initial-Insert.
- `backshop_bezeichnungsregeln` – wie bezeichnungsregeln (keyword, position, case_sensitive, is_active, created_by).

**Helper-Funktion:** `get_active_backshop_version()` – gibt die eine aktive Backshop-Version zurück (analog `get_active_version()`), arbeitet nur auf `backshop_versions`.

**RLS:** Für alle `backshop_*`-Tabellen RLS aktivieren. Policies analog Obst/Gemüse: Lesen für alle authentifizierten User; Schreiben (Insert/Update/Delete) für versions, master_plu_items, blocks, block_rules, layout_settings, bezeichnungsregeln nur für Super-Admin; custom_products/hidden_items wie bisher (alle können lesen/einfügen, Ersteller/Super-Admin update/delete bei custom_products; alle können hidden_items löschen). version_notifications: User liest/updated nur eigene; Super-Admin insert.

**Was nicht angefasst wird:** Alle bestehenden Tabellen (`versions`, `master_plu_items`, `custom_products`, `hidden_items`, `layout_settings`, `blocks`, `bezeichnungsregeln`, `version_notifications`) und alle bestehenden Cron-Jobs. Kein ALTER an Obst/Gemüse-Tabellen.

**Storage (A3):** Bucket `backshop-images` im Supabase Dashboard anlegen (Storage → New bucket, privat). RLS: Authentifizierte User dürfen lesen; authentifizierte User dürfen hochladen/aktualisieren/löschen (für Umbenennen-Bild und eigene Produkte). In der App: nach Upload öffentliche URL oder signierte URL in `backshop_master_plu_items.image_url` bzw. `backshop_custom_products.image_url` speichern. Doku in DATABASE.md bzw. ARCHITECTURE.md ergänzen.

---

### Phase 2: Parser, Vergleich, Layout-Engine

| Schritt | Aufgabe | Kurz was tun |
|--------|--------|----------------|
| 3 | **A2** | Backshop-Excel-Parser (neue Datei oder Modus): PLU 5-stellig, Name (Etikettentext/längster Text), Namens-Bereinigung bis erstes Komma, Abbildung. Mehrere Excel pro KW unterstützen; Übersicht „welche Dateien / mit oder ohne Bilder“. Listen ohne PLU ablehnen. Große Dateien beachten. |
| 4 | **A4** | Vergleichslogik für Backshop nutzen (wie Obst/Gemüse); Zusatz: bei Match (PLU/Name) und fehlendem Bild in neuer Liste → bestehendes Bild aus Vorversion übernehmen. Obst/Gemüse-Code unverändert lassen. |
| 5 | **A5** | Layout-Engine erweitern: `DisplayItem`/Input um optionales `image_url`; Backshop ohne `item_type`, Sortierung nur ALPHABETICAL oder BY_BLOCK. Bestehende Aufrufer für Obst/Gemüse unverändert. |

**Umsetzung Phase 2:** A2 (`src/lib/backshop-excel-parser.ts`), A4 (`compareBackshopWithCurrentVersion()` in `src/lib/comparison-logic.ts` inkl. Bild-Erhalt über PLU/Name), A5 (Typen + Layout-Engine) sind implementiert. Build grün.

**Check nach Phase 2:** Build grün, Obst/Gemüse Masterliste und Upload weiter wie bisher.

---

### Phase 3: Backshop-UI & Upload

| Schritt | Aufgabe | Kurz was tun |
|--------|--------|----------------|
| 6 | **A6** | Routen für Backshop anlegen (`/user/backshop-list`, `/viewer/backshop-list`, ggf. Admin/Super-Admin). Dashboard-Karten: „PLU-Liste Obst/Gemüse“ und „PLU-Liste Backshop“. Backshop-Liste-Seite: Tabelle mit Bild, PLU, Name, klar „PLU-Liste Backshop“ gekennzeichnet. Backshop-Upload-Seite/Modus (mehrere Excel, Ziel-KW, Übersicht mit/ohne Bilder, Vergleich, Einspielen). |

**Umsetzung Phase 3:** A6 umgesetzt: Routen `/user/backshop-list`, `/viewer/backshop-list`, `/admin/backshop-list`, `/super-admin/backshop-list`, `/super-admin/backshop-upload`. Hooks: `useActiveBackshopVersion`, `useBackshopVersions`, `useBackshopPLUData`, `useBackshopLayoutSettings`. `buildBackshopDisplayList` in `src/lib/layout-engine.ts`. PLUTable mit `listType="backshop"` (Bild | PLU | Name). BackshopMasterList-Seite, BackshopUploadPage (3 Schritte: Dateien, Vergleich, Einspielen). `publishBackshopVersion`, `useBackshopUpload`. Dashboard-Karten „PLU-Liste Obst/Gemüse“ und „PLU-Liste Backshop“ in allen vier Dashboards; Super-Admin: „Backshop Upload“. Obst/Gemüse unverändert.

**Check nach Phase 3:** Beide Listen im Dashboard wählbar, Backshop-Liste und Upload erreichbar, Obst/Gemüse unverändert.

---

### Phase 4: Eigene Produkte, Ausblenden, Umbenennen, Bild im Umbenennen

| Schritt | Aufgabe | Kurz was tun |
|--------|--------|----------------|
| 7 | **A7** | Backshop: Eigene Produkte (Bild Pflicht), Ausblenden, Umbenennen – getrennte Daten. CustomProductDialog-Variante mit Pflichtfeld Bild. Seiten „Eigene & Ausgeblendete“, „Umbenannte Produkte“ für Backshop (oder gleiche Seiten mit listType). |
| 8 | **A10** | Im Backshop-Umbenennen-Bereich (Seite Umbenannte Produkte, Dialog „Produkte umbenennen“) pro Produkt Bild hochladen/ersetzen/löschen integrieren. Storage + DB-Referenz. |

**Umsetzung Phase 4:** Migration `012_backshop_rename_rpc.sql` (RPCs `rename_backshop_master_plu_item`, `reset_backshop_master_plu_item_display_name`). Hooks: `useBackshopCustomProducts`, `useBackshopHiddenItems`, `useBackshopRename`, `useBackshopBlocks`. Layout-Engine: `buildBackshopDisplayList` um `customProducts` und `hiddenPLUs` erweitert; BackshopMasterList bindet Custom/Hidden/Blocks an. Upload-Helfer: `uploadBackshopImage` in `src/lib/backshop-storage.ts`. Seiten: BackshopCustomProductsPage, BackshopHiddenProductsPage, BackshopRenamedProductsPage. Dialoge: BackshopCustomProductDialog, EditBackshopCustomProductDialog, HideBackshopProductsDialog; RenameDialog und RenameProductsDialog um `listType="backshop"` erweitert (Bild hochladen/ersetzen/entfernen im Umbenennen). Routen: `/user|admin|super-admin/backshop-custom-products`, `backshop-hidden-products`, `backshop-renamed-products`. Dashboard-Links in User-, Admin- und Super-Admin-Dashboard. Obst/Gemüse unverändert.

**Check nach Phase 4:** Backshop: eigenes Produkt nur mit Bild anlegbar; Umbenennen inkl. Bild möglich. Obst/Gemüse: keine Änderung.

---

### Phase 5: PDF, Benachrichtigungen, Abschluss

| Schritt | Aufgabe | Kurz was tun |
|--------|--------|----------------|
| 9 | **A9** | PDF Backshop: Reihenfolge Bild → PLU → Name, Kopf „PLU-Liste Backshop“, Footer wie Obst/Gemüse (gemeinsame Footer-Logik). Obst/Gemüse-PDF unverändert. |
| 10 | **A8** | Benachrichtigungen pro Listentyp trennen. Backshop-Upload löst nur Backshop-Notifications aus. Glocke/Anzeige nur für gewählte Liste oder getrennt. |
| 11 | **A11** | Gesamttest: Obst/Gemüse (Upload, Liste, PDF, Eigene Produkte, Ausblenden, Umbenennen) ohne Regression. Backshop: Upload (ggf. große Excel), Abgleich mit Bild-Erhalt, PDF, Eigenes Produkt, Umbenennen inkl. Bild. `npm run build` grün. |

**Check nach Phase 5:** Beide Listen voll nutzbar, Obst/Gemüse stabil, Backshop mit allen Anforderungen aus dieser Spezifikation.

**Umsetzung Phase 5:** A9 umgesetzt: `generateBackshopPDF()` in `src/lib/pdf-generator.ts` (Reihenfolge Bild → PLU → Name, Kopf „PLU-Liste Backshop“, Footer wie Obst/Gemüse). ExportBackshopPDFDialog, PDF-Button auf BackshopMasterList. A8 umgesetzt: `publishBackshopVersion` schreibt nach Aktivierung Einträge in `backshop_version_notifications` (pro User außer Uploader). Hooks in `src/hooks/useBackshopNotifications.ts` (ChangeCount, UnreadCount, MarkRead, NewProducts, ChangedProducts). BackshopNotificationBell und BackshopNotificationDialog auf BackshopMasterList (nur Backshop-Benachrichtigungen). **Backshop-Versionen-Seite:** BackshopVersionsPage unter `/super-admin/backshop-versions`, Karte „Backshop-Versionen“ im Super-Admin-Dashboard; Anzeige aller Backshop-KW-Versionen, Löschen mit Bestätigung, Ansehen-Link zur Backshop-Liste. Obst/Gemüse-PDF und -Glocke unverändert. Build grün.

---

### Nach Phase 5: Layout, Inhalt & Regeln (Backshop), Cron

- **Layout (Backshop):** Super-Admin-Seite `/super-admin/backshop-layout` (BackshopLayoutSettingsPage). Einstellungen für Backshop getrennt von Obst/Gemüse: Sortierung (ALPHABETICAL/BY_BLOCK), Flussrichtung, Schriftgrößen, Markierungsdauer, Feature-Switches. Hook `useUpdateBackshopLayoutSettings` in `src/hooks/useBackshopLayoutSettings.ts`. Dashboard-Karte „Layout (Backshop)“ unter Konfiguration.
- **Inhalt & Regeln (Backshop):** Super-Admin-Seite `/super-admin/backshop-rules` (BackshopRulesPage). Bezeichnungsregeln (BackshopSchlagwortManager, Tabelle `backshop_bezeichnungsregeln`) und Warengruppen (BackshopWarengruppenPanel, `backshop_blocks`). Bei Sortierung „Nach Warengruppen“: Link „Liste interaktiv bearbeiten“ → `/super-admin/backshop-block-sort` (BackshopBlockSortPage mit InteractiveBackshopPLUTable). Hooks: `useBackshopBezeichnungsregeln`, erweiterte `useBackshopBlocks` (CRUD, Reorder, Assign). Layout-Engine: `buildBackshopDisplayList` wendet optionale `bezeichnungsregeln` an; BackshopMasterList übergibt Backshop-Regeln.
- **Cron (Backshop):** Migration `013_backshop_cron.sql`. Drei pg_cron-Jobs: `backshop-kw-switch` (Samstag 23:59 UTC: aktive Version einfrieren, älteste Draft aktivieren), `backshop-auto-delete-old-versions` (täglich 02:00: eingefrorene Versionen mit abgelaufenem `delete_after` löschen), `backshop-notification-cleanup` (täglich 03:00: gelesene Backshop-Benachrichtigungen älter 30 Tage löschen).

---

### Kurzübersicht Reihenfolge

1. **A1** → **A3** (Phase 1)  
2. **A2** → **A4** → **A5** (Phase 2)  
3. **A6** (Phase 3)  
4. **A7** → **A10** (Phase 4)  
5. **A9** → **A8** → **A11** (Phase 5)

Cron für Backshop: umgesetzt in Migration 013 (backshop-kw-switch, backshop-auto-delete-old-versions, backshop-notification-cleanup).

---

## 11. Kurz-Checkliste vor Implementierung

- [ ] DB-Schema (list_type vs. getrennte Tabellen) entschieden und dokumentiert.
- [ ] Alle Referenzen zu `src/lib/*.ts` und `src/hooks/*.ts` für Wiederverwendung gelesen.
- [ ] Klar: Obst/Gemüse-Code nicht löschen oder so ändern, dass bestehende Flows brechen.
- [ ] Backshop: Bild Pflicht bei eigenem Produkt; Bild-Erhalt beim Abgleich; manuelle Bild-Verwaltung im Umbenennen-Bereich; PDF mit Bild → PLU → Name und Kopf „PLU-Liste Backshop“; **mehrere Excel pro KW** mit Übersicht (welche mit/ohne Bilder); **kein** Stück/Gewicht, nur Warengruppen; Sortierung alphabetisch oder nach Warengruppen. Cron: alte Liste bis Super-Admin neue hochlädt; Backshop-Cron nur Backshop.
