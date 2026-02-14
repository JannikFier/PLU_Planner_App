# PLU Planner – Issues & Verbesserungen

**Zweck:** Konkrete, einzeln abarbeitbare Punkte aus User-Feedback.  
**Format:** Jeder Punkt ist eigenständig und spezifisch genug, dass genau eine Änderung nötig ist.

---

## Offen

*(Keine offenen Issues.)*

---

## Erledigt

### ISSUE-019: Bug – Fehlermeldung / „komme nicht mehr raus“ bei Eigene Produkte + Layout

**Erledigt:** Dialog-Verhalten auf der Seite „Eigene & Ausgeblendete“ geprüft. Beim Excel-Import-Dialog wird beim Schließen (`onOpenChange(false)`) zuverlässig `closeExcelDialog()` aufgerufen, sodass der User den Dialog per Overlay-Klick, Escape oder „Abbrechen“ verlassen kann. Keine weiteren Änderungen an CustomProductDialog, dialog.tsx oder Routen nötig.

---

### ISSUE-018: Beide Sektionen – „Von mir erstellt“ / „Von mir ausgeblendet“ hervorheben

**Erledigt:** In der Tabelle **Eigene Produkte** wird pro Zeile ein Badge „Von mir erstellt“ angezeigt, wenn `created_by === user?.id`. In der Tabelle **Ausgeblendete Produkte** wird bei Einträgen mit `hidden_by === user?.id` zusätzlich „Von mir“ angezeigt. `HiddenProductInfo` um `hidden_by` erweitert; `user` aus `useAuth()`. Betroffene Datei: `src/pages/HiddenItems.tsx`.

---

### ISSUE-016: Ausgeblendete Produkte – Suchfunktion

**Erledigt:** Auf der Masterliste gibt es ein Suchfeld (Debounce) mit Popover: Treffer nach PLU / display_name / system_name (case-insensitive). Pro Treffer Button „Ausblenden“ ruft `useHideProduct().mutate(plu)` auf; nach Ausblenden Query-Invalidierung, Treffer verschwindet. Helper `filterItemsBySearch` in `src/lib/plu-helpers.ts`. Betroffene Dateien: `src/pages/MasterList.tsx`, `src/lib/plu-helpers.ts`.

---

### ISSUE-017: Ausgeblendete Produkte – Excel-Upload

**Erledigt:** In der Sektion „Ausgeblendete Produkte“ Button „Per Excel ausblenden“. Excel-Format: erstes Sheet, erste Spalte = PLU pro Zeile. Parser `parseHiddenItemsExcel` in `src/lib/excel-parser.ts`; Hook `useHideProductsBatch` in `src/hooks/useHiddenItems.ts` (Insert pro PLU, Duplikate 23505 ignoriert, Toast mit „X ausgeblendet, Y bereits ausgeblendet“). Dialog „Diese Produkte werden ausgeblendet“ mit Vorschau (PLU + Name falls aus master/custom), Buttons Abbrechen / Ausblenden. Betroffene Dateien: `excel-parser.ts`, `useHiddenItems.ts`, `HiddenItems.tsx`.

---

### ISSUE-015: Eigene Produkte – Excel-Upload

**Erledigt:** Auf der Seite „Eigene & Ausgeblendete“ gibt es den Button „Per Excel hochladen“. Excel-Format: Spalte 1 = PLU (4–5 Ziffern) ODER Preis (Dezimalzahl); Spalte 2 = Name; Spalte 3 = Warengruppe (bei Layout BY_BLOCK) oder Stück/Gewicht (bei ALPHABETICAL). Parser `parseCustomProductsExcel` in `src/lib/excel-parser.ts`; Typen `ParsedCustomProductRow` und `CustomProductParseResult` in `src/types/plu.ts`. Nach dem Upload erscheint eine Vorschau mit Nachfrage-Dropdowns für fehlende Warengruppe bzw. Typ; „Alle hinzufügen“ ruft `useAddCustomProductsBatch` auf. Duplikat-PLUs werden übersprungen. Betroffene Dateien: `HiddenItems.tsx`, `useCustomProducts.ts`, `excel-parser.ts`, `plu.ts`.

---

### ISSUE-014: Eigene Produkte – Preisanzeige in Tabelle (nur wenn Preis vorhanden)

**Erledigt:** In der PLU-Tabelle, InteractivePLUTable und LayoutPreview wird bei eigenen Produkten mit Preis ein kompakter €-Preiskasten (PreisBadge) in der Artikel-Spalte angezeigt. Zentraler Helper `formatPreisEur(preis)` in `src/lib/plu-helpers.ts`; wiederverwendbare Komponente `PreisBadge` in `src/components/plu/PreisBadge.tsx`. Ohne Preis wird kein Kasten angezeigt. HiddenItems nutzt ebenfalls `formatPreisEur` für die Preisspalte.

---

### ISSUE-013: Eigene Produkte – PLU ODER Preis (4–5 Ziffern)

**Erledigt:** Ein eigenes Produkt hat entweder eine PLU (4 oder 5 Ziffern) oder einen Preis. CustomProductDialog: Validierung „genau eines von PLU oder Preis“; PLU optional mit Regex 4–5 Ziffern, Preis optional (Dezimalzahl mit Komma/Punkt). Bei nur Preis wird in `custom_products.plu` ein eindeutiger Platzhalter `price-{uuid}` gespeichert (NOT NULL UNIQUE bleibt unverändert). Zentrale Helper in `src/lib/plu-helpers.ts`: `PRICE_ONLY_PLU_PREFIX`, `isPriceOnlyPlu`, `getDisplayPlu`, `generatePriceOnlyPlu`. Überall wo PLU angezeigt wird (StatusBadge, PLUTable, InteractivePLUTable, LayoutPreview, WarengruppenPanel, RenameDialog, pdf-generator) wird `getDisplayPlu(plu)` verwendet – bei Preis-only erscheint „–“.

---

### ISSUE-012: Eigene Produkte – Layout-abhängige Pflichtfelder

**Erledigt:** CustomProductDialog nutzt `useLayoutSettings()` und `sort_mode`. Bei **BY_BLOCK:** Warengruppe ist Pflichtfeld, Typ (Stück/Gewicht) wird ausgeblendet (Default PIECE); Button „Neue Warengruppe anlegen“ mit Inline-Input, `useCreateBlock` legt Block an und gibt ihn zurück, neue block_id wird vorselektiert. Bei **ALPHABETICAL:** Typ ist Pflicht, Warengruppe optional (wie bisher). Validierung und Submit-Payload je nach sort_mode. `useCreateBlock` in `useBlocks.ts` gibt erstellten Block per `.select().single()` zurück. Betroffene Dateien: `src/components/plu/CustomProductDialog.tsx`, `src/hooks/useBlocks.ts`.

---

### ISSUE-011: Seite „Eigene & Ausgeblendete Produkte“ – Umbenennung, Icon, zwei Sektionen

**Erledigt:** Seite „Ausgeblendete Produkte“ in **Eigene & Ausgeblendete** umbenannt, mit Icon (Layers) im Header. Zwei Sektionen auf einer Seite: (1) **Eigene Produkte** – Tabelle aller custom_products (PLU, Name, Typ, Preis, Warengruppe), Button „Eigenes Produkt hinzufügen“ öffnet CustomProductDialog; (2) **Ausgeblendete Produkte** – unveränderte Tabelle mit Einblenden / Alle einblenden. Route `*/hidden-items` unverändert. Dashboards (User/Admin/SuperAdmin): Kachel-Titel „Eigene & Ausgeblendete“, Icon Layers, Beschreibung „Eigene Produkte und ausgeblendete verwalten“. Betroffene Dateien: `src/pages/HiddenItems.tsx`, `src/pages/UserDashboard.tsx`, `src/pages/AdminDashboard.tsx`, `src/pages/SuperAdminDashboard.tsx`, `docs/FEATURES.md`.

---

### Benutzerverwaltung – Anzeige, Passwort-Reset, Löschen (2026-02)

**Erledigt:** (1) Nur echte E-Mail und Personalnummer werden in der Tabelle angezeigt – interne Platzhalter (`@plu-planner.local`, `email-{uuid}`) werden als "–" ausgeblendet. (2) Passwort zurücksetzen öffnet zuerst einen Bestätigungsdialog mit Hinweis auf Einmalpasswort; Abbrechen bricht ab, "Passwort zurücksetzen" führt die Aktion aus. (3) Neuer Button "Löschen" mit Bestätigungsdialog ("Sind Sie sicher…?"); Edge Function `delete-user` löscht Benutzer komplett. Betroffene Dateien: `src/pages/UserManagement.tsx`, `src/lib/profile-helpers.ts` (neu), `supabase/functions/delete-user/index.ts` (neu).

---

### ISSUE-010: Benutzerverwaltung – Personalnummer und E-Mail (mindestens eines, optional beide)

**Erledigt:** Beide Felder (Personalnummer und E-Mail) werden immer angezeigt; mindestens eines muss ausgefüllt sein, beide dürfen ausgefüllt werden. Bei beiden Einträgen kann sich der Benutzer mit Personalnummer oder E-Mail anmelden. Auth-E-Mail = E-Mail falls angegeben, sonst `personalnummer@plu-planner.local`; bei nur E-Mail wird `personalnummer` in der DB als Platzhalter `email-{uuid}` gesetzt (NOT NULL). Betroffene Dateien: `src/pages/UserManagement.tsx`, `supabase/functions/create-user/index.ts`.

---

### ISSUE-008: Bezeichnungsregeln – Keyword nur als ganzes Wort matchen

**Erledigt:** Keyword wird nur noch als ganzes Wort gematcht (Wortgrenzen: Anfang/Ende, Leerzeichen, Klammern). Helper `keywordAsWordRegex(keyword)` und `keywordRemovalRegex(keyword)` in `src/lib/keyword-rules.ts`; `nameContainsKeyword` nutzt die Wortgrenzen-Regex, `normalizeKeywordInName` entfernt nur ganze Wörter. „Bionda“, „Biologie“ werden nicht mehr getroffen.

---

### ISSUE-009: Bezeichnungsregeln – Klammern bei zusammengesetzten Begriffen konsistent lassen

**Erledigt:** Beim Entfernen des Keywords in Klammern bleibt der Rest in Klammern (z. B. „Zitronen (Bio Demeter)“ → „BIO Zitronen (Demeter)“); leere Klammern werden entfernt („Apfel (Bio)“ → „BIO Apfel“). Umgesetzt in `normalizeKeywordInName` über Ersetz-Callback mit Capturing-Gruppen und Bereinigung `\s*\(\s*\)\s*`.

---

### ISSUE-005: Excel-Upload – 3 Schritte statt 4

**Erledigt:** UploadStep-Typ auf `1 | 2 | 3` geändert. Konflikt-Bereich in Schritt 2 integriert (wird unter der Vorschau angezeigt, wenn Konflikte vorhanden). Ein Button „Konflikte speichern & einspielen“ bzw. „Ins System einspielen“; nach Veröffentlichen → Schritt 3 (Fertig). Betroffene Dateien: `src/hooks/usePLUUpload.ts`, `src/pages/PLUUploadPage.tsx`.

---

### ISSUE-006: Excel-Upload Schritt 2 – Stats als Header, Liste als Vorschau

**Erledigt:** Schritt 2 zeigt eine einzeilige Statistik („X Gesamt · Y Unverändert · Z Neu · …“) statt Kachel-Grid. Darunter die vollständige PLU-Liste als Vorschau: `previewItems` aus allItems + aufgelöste Konflikte, `buildDisplayList` mit Layout-Einstellungen (useLayoutSettings, useBlocks, useBezeichnungsregeln), Ausgabe in `PLUTable` in scrollbarem Container (max-h-[50vh]). Betroffene Dateien: `src/pages/PLUUploadPage.tsx`, Nutzung von `src/lib/layout-engine.ts`, `src/components/plu/PLUTable.tsx`.

---

### ISSUE-007: Excel-Upload Schritt 2 – Klickbare „Neu“ und „Entfernt“

**Erledigt:** Hook exportiert `allNewProducts` und `allRemoved` (kombiniert aus pieceComparison und weightComparison). In der Statistik-Zeile sind „X Neu“ und „Y Entfernt“ als klickbare Buttons umgesetzt; bei Klick öffnet sich ein Popover mit der Liste der betroffenen Produkte (PLU + Name), scrollbar. Betroffene Dateien: `src/hooks/usePLUUpload.ts`, `src/pages/PLUUploadPage.tsx` (Popover von shadcn/ui).

---

### ISSUE-001: Ein gemeinsamer Datei-Upload statt Datei 1 + Datei 2

**Erledigt:** Ein einziges `<input type="file" multiple accept=".xlsx,.xls" />` auf der Upload-Seite. User wählt eine oder mehrere Dateien; max. 2 werden für den Vergleich verwendet. State in `usePLUUpload` auf `fileResults: FileResultEntry[]` umgestellt, `handleFilesSelected(files)` parst alle Dateien, bei 2 Dateien automatische Stück/Gewicht-Zuordnung. Pro Datei Zeilenanzahl, Erkannt-Typ und Dropdown Zuordnung (Stück/Gewicht) sowie Button zum Entfernen. Betroffene Dateien: `src/pages/PLUUploadPage.tsx`, `src/hooks/usePLUUpload.ts`.

---

### ISSUE-002: Ziel-KW als Dropdown statt Number-Input

**Erledigt:** Ziel-KW ist ein `<Select>` mit allen KWs 1–53 (Konstante `KW_OPTIONS` in `src/lib/date-kw-utils.ts`). Placeholder „KW wählen“. Betroffene Dateien: `src/pages/PLUUploadPage.tsx`, `src/lib/date-kw-utils.ts`.

---

### ISSUE-003: Automatische Vorauswahl von KW und Jahr

**Erledigt:** In `src/lib/date-kw-utils.ts`: `getCurrentKW()`, `getNextFreeKW()`, `UPLOAD_YEAR_OPTIONS` (2024–2030). Hook nutzt `useVersions()`; einmalig nach Laden wird die nächste freie KW für das gewählte Jahr gesetzt (useEffect + Ref, damit User-Änderung nicht überschrieben wird). Jahr als Dropdown mit `UPLOAD_YEAR_OPTIONS`, Standard aktuelles Jahr. Betroffene Dateien: `src/hooks/usePLUUpload.ts`, `src/pages/PLUUploadPage.tsx`, `src/lib/date-kw-utils.ts`.

---

### ISSUE-004: Warnung bei Überschreiben existierender KW

**Erledigt:** Vor „Vergleich starten“ wird mit `versionExistsForKW(kw, jahr, versions)` geprüft, ob die Ziel-KW für das Jahr bereits existiert. Falls ja: `overwriteConfirmOpen` wird gesetzt, die Page zeigt einen shadcn `AlertDialog` mit Titel „KW bereits vorhanden“, Beschreibungstext und den Optionen „Ziel-KW ändern“ (Dialog schließen) und „Überschreiben“ (ruft `startComparison(true)` auf). Betroffene Dateien: `src/hooks/usePLUUpload.ts`, `src/pages/PLUUploadPage.tsx`, `src/lib/date-kw-utils.ts` (Funktion `versionExistsForKW`).

---

## Hinweise für abarbeitende Agents

- Jeder Punkt (ISSUE-XXX) ist eigenständig abarbeitbar.
- Nach Umsetzung: Punkt unter „Erledigt“ eintragen und aus „Offen“ entfernen.
- Keine Vermischung mehrerer Issues in einer Änderung.
