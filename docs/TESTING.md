# Tests

Unit-Tests für die zentrale Business-Logik in `src/lib`. Framework: **Vitest** (Vite-nativ).

## Was wird getestet

- **Reine Funktionen** in `src/lib`: Formatierung, KW-/Jahr-Logik, Bezeichnungsregeln, Vergleichslogik (Upload vs. Version), Utils.
- **Nicht** in Phase 1: UI-Komponenten, Hooks mit Supabase, Excel-Parser (File-Input), PDF-Generator (DOM).

## Tests starten

```bash
# Interaktiv (Watch-Modus, z.B. während der Entwicklung)
npm run test

# Einmal durchlaufen (z.B. vor Push oder in CI)
npm run test:run
```

## Konvention

- **Co-located:** Jede getestete Datei hat eine gleichnamige Test-Datei: `plu-helpers.ts` → `plu-helpers.test.ts`.
- Alle Test-Dateien liegen in `src/lib/` neben dem jeweiligen Modul.
- Keine UI- oder Supabase-Tests in dieser Phase.

## Tests erweitern

- Neue **Funktion** in einem bestehenden Modul → neue `describe`/`it`-Blöcke in der zugehörigen `*.test.ts`.
- Neues **Modul** in `src/lib` mit reiner Logik → neue Datei `modulname.test.ts` im gleichen Ordner anlegen.
- **E2E Mobile-Layout:** Neue oder stark geänderte **User-Seiten mit breiten Tabellen/Listen** (`/user/...`) → [e2e/mobile-layout.spec.ts](../e2e/mobile-layout.spec.ts) um einen Test mit derselben **Scrollbreiten-Assertion** ergänzen (Login bleibt `E2E_USER_*`), damit Handy- und iPad-Viewport weiterhin ohne horizontales Scrollen geprüft werden. Wo die Seite ein **`data-testid`** auf dem Listen-Container setzt (z. B. `hidden-products-scroll-root`), prüft der Test **zusätzlich** `scrollWidth ≤ clientWidth` auf diesem Element – innere Überbreite wird so sichtbar, auch wenn `main` noch passt. **Super-Admin** (gleiche Datei, zweiter `describe`): mit `E2E_SUPER_ADMIN_*` u. a. **Warengruppen Obst** (`obst-warengruppen-panel-root`) und **Warengruppen Backshop** (`backshop-warengruppen-panel-root`).
- **Schmale Viewports (Handy):** Mehrspaltige Desktop-Tabellen nicht „nur schmaler skalieren“ – unterhalb **`md`** eine **eigene Listenansicht** (z. B. `md:hidden` + einspaltige `ul`/`li`, Desktop `hidden md:table`). Orientierung: **WCAG 2.1 – Erfolgskriterium 1.4.10 Reflow** ([W3C: Understanding Reflow](https://www.w3.org/WAI/WCAG21/Understanding/reflow.html)): Inhalt soll bei schmaler Breite **ohne horizontales Scrollen** nutzbar sein; starre `table-fixed`-Mehrspalter zerlegen den Text sonst buchstabenweise. **Automatisiert** lässt sich „Text unleserlich gestapelt“ kaum zuverlässig erfassen (kein Ersatz für kurzes manuelles Prüfen); sinnvoll bleiben **horizontale Overflow-Checks**, **stabile Test-IDs** auf Mobile-Listen (z. B. `add-to-offer-dialog-mobile-list`) und das **richtige UI-Muster**.

## Getestete Module (Stand)

| Modul | Inhalt |
|-------|--------|
| `plu-helpers` | formatKWLabel, formatPreisEur, parseBlockNameToItemType, isPriceOnlyPlu, getDisplayPlu, filterItemsBySearch, groupItemsByLetter, splitIntoColumns |
| `date-kw-utils` | getKWAndYearFromDate, getNextFreeKW, versionExistsForKW, clampKWToUploadRange |
| `keyword-rules` | normalizeKeywordInName, isAlreadyCorrect, nameContainsKeyword (inkl. Satzzeichen nach Schlagwort) |
| `block-override-utils` | Normalisierung Artikelname, effektive Warengruppe, Sortierung mit Markt-Block-Reihenfolge |
| `comparison-logic` | compareWithCurrentVersion (UNCHANGED, CONFLICT, PLU_CHANGED_RED, NEW_PRODUCT_YELLOW, erster Upload), resolveConflicts |
| `utils` | generateUUID, cn |

## E2E-Tests (Playwright)

User-Journeys (Login, Navigation, Rollen-Redirects) werden mit **Playwright** in `e2e/*.spec.ts` abgedeckt.

- **Smoke:** Login-Seite lädt, Root und geschützte Routen leiten zu `/login` um.
- **Journey-Tests:** Pro Rolle (Viewer, User, Admin, Super-Admin) Login und Hauptseiten; fehlende Berechtigung führt zu Redirect.
- **Mobile-Layout (`@mobile`):** Zwei Playwright-Projekte in [playwright.config.ts](../playwright.config.ts): **`mobile-chromium`** (Viewport iPhone 13) und **`tablet-chromium`** (Viewport iPad Pro 11). Datei [e2e/mobile-layout.spec.ts](../e2e/mobile-layout.spec.ts) loggt sich mit `E2E_USER_*` ein und prüft auf **allen** wichtigen Personal-Routen, dass **weder `html`/`body` noch das `main`** des Dashboard-Layouts horizontal breiter als der Viewport sind (`scrollWidth - clientWidth ≤ 1` je Element). Zusätzlich – wo die Seite passende Container setzt – `expectNoHorizontalOverflowInLocator` auf **`data-testid`**-Wurzeln, u. a. `hidden-products-scroll-root` (Ausgeblendete, Eigene & Ausgeblendete – Abschnitt Ausgeblendete, Backshop-Varianten), **`renamed-products-scroll-root`** (Umbenannt Obst/Backshop), **`offer-central-campaign-scroll-root`** / **`offer-local-advertising-scroll-root`** (Werbung Obst) sowie die Backshop-Pendants `backshop-offer-*`. Optional: **Picker-Vollseite** (nach „Produkte ausblenden“ → `/user/pick-hide-obst`) prüft Footer-Buttons (**Abbrechen** / Ausblenden-Aktion): zuerst per Scroll in den sichtbaren Bereich, dann **im Viewport** (bei 420px Höhe liegt der Footer unter der Liste). Abgedeckt u. a.: Dashboard, **PLU-Masterliste**, **Backshop-Liste**, **Eigene Produkte** (Obst + Backshop), **Eigene & Ausgeblendete**, **Ausgeblendete Produkte**, **Werbung**, **Umbenannt** (Obst + Backshop). **Super-Admin-Zweig** (falls Credentials gesetzt): u. a. Ausgeblendete, **PLU-Liste bearbeiten** Obst/Backshop (Block-Sort). Läuft bei `npm run test:e2e:full` mit; isoliert: `npm run test:e2e:mobile`. **Hinweis:** Konto muss Rolle **User (Personal)** sein (Login landet unter `/user/`). **Daten:** Zuverlässige Layout-Qualität setzt voraus, dass die E2E-Umgebung nicht nur leere Listen hat – bei **Ausgeblendeten** sollten möglichst einige Einträge mit **langen Artikelnamen** existieren, sonst bleiben Überbreiten-Fehler unsichtbar.

**Vollständige Abdeckung** aller Geräte, Datenkonstellationen und UI-Zustände ist eine **Daueraufgabe** (Matrix aus Laufzeit, gelegentlicher Flakiness und Testdaten). Die `@mobile`-Tests werden **iterativ** erweitert; sie ersetzen keine manuelle Release-Checkliste und **garantieren nicht** „null Layout-Fehler“ – sie reduzieren aber das Risiko typischer Regressionen (horizontale Überbreite, abgeschnittene Footer auf Picker-Vollseiten).

- **Kassenmodus (`e2e/kiosk-entrance.spec.ts`, `@extended`):** Öffentliche Seite `/kasse/…` mit unbekanntem Token zeigt einen **Hinweis** (keine aktiven Kassen / Fehler). Vollständiger Login-Flow mit echtem Token ist **nicht** in CI fest verdrahtet.

### Abgedeckte Flows (Stand)

| Rolle | Getestet |
|-------|----------|
| **Smoke** | Login-Seite, Redirects (/, /user → /login) |
| **Viewer** | Login → Dashboard → PLU-Liste Obst/Backshop öffnen, kein /admin |
| **User** | Login → Dashboard → Masterliste, Backshop-Liste, PDF-Button, Eigene, Ausgeblendete, Werbung, Umbenannte, Backshop-Seiten, kein /super-admin |
| **Admin** | Login → Dashboard → Masterliste, Benutzerverwaltung, Neuer-Benutzer-Button, alle User-Seiten, Backshop-Seiten, kein /super-admin |
| **Super-Admin** | Login → Dashboard → Upload, Obst/Backshop-Bereich, Benutzerverwaltung, **alle** Super-Admin-Seiten (PLU-Upload, Masterliste, Layout, Regeln, Block-Sort, Versionen, Firmen & Märkte, alle Obst- und Backshop-Seiten) |

**Super-Admin-Tests** laufen nur, wenn `E2E_SUPER_ADMIN_EMAIL` und `E2E_SUPER_ADMIN_PASSWORD` in `.env.e2e` gesetzt sind.

**Tutorial-E2E** (`tutorial-smoke.spec.ts`, `tutorial-full-walkthrough.spec.ts` u. a. mit `@extended`): Verwenden **`E2E_ADMIN_*`** für den Admin-Dashboard-Flow (Kacheln Obst/Backshop/Benutzer, `/admin/`). Das Konto muss in der Datenbank **`role = 'admin'`** haben – **nicht** `super_admin` (der nutzt `E2E_SUPER_ADMIN_*` und andere Routen). Super-Admin in `E2E_ADMIN_*` einzutragen führt zu falschen Erwartungen und fehlschlagenden Tests.

**Nicht automatisiert:** Excel-Upload, Benutzer anlegen, Layout-Änderungen, PDF-Inhalt prüfen.

### Zwei Stufen

| Befehl | Was läuft | Wann |
|--------|-----------|------|
| `npm run test:e2e` | Nur **@smoke** (Login, Redirects) | Schnell, vor jedem Commit, ohne .env.e2e |
| `npm run test:e2e:full` | **Alle** Tests: Desktop-Chromium (ohne `mobile-layout.spec.ts`) + **mobile-chromium** + **tablet-chromium** (jeweils `mobile-layout.spec.ts`) | Vor Publish, braucht .env.e2e |
| `npm run test:e2e:mobile` | Nur **mobile-chromium** und **tablet-chromium** (`mobile-layout.spec.ts`) | Schneller Check Handy- + Tablet-Layout mit User-Credentials |

**Vor dem Publish:** `npm run test:e2e:full` ausführen – alle Tests müssen grün sein.

### Ausführung

```bash
# Standard (schnell, ohne Credentials):
npm run test:e2e

# Vollständig (vor Publish, braucht .env.e2e):
npm run test:e2e:full

# Nur Mobile-Layout-Tests (Handy + iPad-Viewport):
npm run test:e2e:mobile

# Mit UI (empfohlen zum Debuggen):
npm run test:e2e:ui
```

Playwright startet den Dev-Server automatisch, sofern noch keiner auf Port 5173 läuft (`reuseExistingServer: true`).

### Parallele Worker und Auth-Rate-Limits

Lokal setzt [playwright.config.ts](../playwright.config.ts) die Worker-Zahl auf **maximal 3** (bzw. `min(3, availableParallelism())`), damit nicht zu viele Tests gleichzeitig bei Supabase **anmelden** – sonst kann die Login-Seite u. a. „Zu viele Anmeldeversuche“ anzeigen und URL-Erwartungen (`/user`, `/admin`) fehlschlagen. **CI:** weiterhin **1 Worker**.

**Überschreiben:** Umgebungsvariable **`PLAYWRIGHT_WORKERS`** mit einer positiven ganzen Zahl (z. B. `PLAYWRIGHT_WORKERS=6 npm run test:e2e:full`). Maximale Stabilität bei Limits weiterhin: **`npm run test:e2e:full:serial`**.

### Playwright: „Executable doesn't exist“ / falscher Ordner `mac-x64` vs. `mac-arm64`

**Symptom:** Fehler wie `browserType.launch: Executable doesn't exist at …/chrome-headless-shell-mac-arm64/…`, obwohl `npx playwright install` gelaufen ist.

**Ursache:** Die installierten Browser liegen im Cache unter **`chrome-headless-shell-mac-x64`**, der Testlauf erwartet aber **`mac-arm64`** (Apple Silicon). Das passiert, wenn Install und Laufzeit **unterschiedliche Plattform-Erkennung** hatten oder ein alter Cache nur die x64-ZIPs enthält.

**Behebung:**

1. Einmalig vollständig neu installieren: `npx playwright install` (oder nur `npx playwright install chromium`).
2. Wenn es weiter fehlt: Playwright-Browser-Cache löschen und mit **expliziter** Apple-Silicon-Plattform neu laden, z. B.  
   `PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=mac15-arm64 npx playwright install chromium --force`  
   (`mac15-arm64` an die macOS-Hauptversion anpassen, falls nötig; auf aktuellen Macs mit M-Chip passt das meist.)

**Hinweis:** Ohne Override meldet Playwright bei Override ggf. „not officially supported“ – die ARM-Builds sind trotzdem die richtigen für M1/M2/M3.

### Test-Accounts (optional)

Die Journey-Tests (viewer, user, admin, super_admin) benötigen echte Supabase-Accounts. Ohne gesetzte Credentials werden diese Tests übersprungen.

1. `.env.e2e.example` nach `.env.e2e` kopieren.
2. Werte eintragen (E-Mail + Passwort pro Rolle). `.env.e2e` ist in `.gitignore` und wird nicht committet.
3. **Empfohlen:** Test-User über die App (Benutzerverwaltung) anlegen – Markt-Zuweisung und Berechtigungen sind dann korrekt.

**User direkt in Supabase anlegen:** Wenn du „Add user“ im Supabase Dashboard nutzt, muss **User Metadata** gesetzt werden, sonst schlägt die Erstellung mit „Database error creating new user“ fehl (personalnummer ist UNIQUE, Standardwert `""` kollidiert bei mehreren Usern). Beispiel: `{"personalnummer": "e2e-admin-1", "role": "admin"}`. Super-Admin: Nach Erstellung in `profiles` die Spalte `role` auf `super_admin` setzen.

**Manueller Login ok, E2E bleibt auf `/login`?** Dann liegt es oft **nicht** an falschen Passwörtern im Browser, sondern an (a) **vielen parallelen Logins** (`npm run test:e2e:full` nutzt mehrere Worker → viele gleichzeitige `signIn`-Aufrufe; Rate-Limits oder Instabilität). Abhilfe: **`npm run test:e2e:full:serial`** (`--workers=1`) ausprobieren. (b) **`.env.e2e`-Zeilen** mit Kommentar am Zeilenende ohne Anführungszeichen (`PASS=geheim # staging`) – der Wert würde falsch geparst; Passwort mit Sonderzeichen in **Anführungszeichen** setzen oder Kommentar in eigene Zeile. (c) **UTF-8-BOM** am Dateianfang – wird in `playwright.config.ts` beim Einlesen entfernt.

Details und manuelle Checkliste vor Release: [TEST_UND_RELEASE.md](TEST_UND_RELEASE.md).

## Optimierung und Regression vermeiden

Änderungen an Performance, Listen oder PLU-Tabelle sollen **klein und ein Thema pro PR** bleiben (siehe Projektplan „Optimierung ohne Regressionen“).

### Gates nach jeder Merge-Einheit (lokal oder CI)

1. `npm run build`
2. `npm run test:run`

### Vor Publish

Wie in [TEST_UND_RELEASE.md](TEST_UND_RELEASE.md): **`npm run test:e2e:full`** (inkl. Mobile-/Tablet-Layout, wo konfiguriert) plus die dortige **manuelle Checkliste**.

### Kurz manuell nach Listen-/Thumbnail-/Scroll-Touches

Automatisiert nicht vollständig abgedeckt (u. a. PDF-Inhalt, Excel-Upload – siehe Abschnitt „Nicht automatisiert“ oben). Nach entsprechenden Code-Änderungen zusätzlich **Stichproben**:

- Obst-Masterliste und Backshop-Liste: scrollen, Darstellung ok
- Optional: „In Liste suchen“ / Springen zur Trefferzeile (betrifft [`find-in-page-scroll`](../src/lib/find-in-page-scroll.ts))
- PDF-Export einmal auslösen und kurz prüfen (nicht jedes Layout)

### Virtualisierung langer Listen (bewusst zurückgestellt)

**Listen-Virtualisierung** (nur sichtbare Zeilen im DOM) ist **kein aktuelles Lieferziel**: sie kann Find-in-Page, Scroll-Ziele, Kiosk und Export-Pfade beeinflussen. Falls später nötig: **eigenes Projekt** mit erweiterten Playwright-Schritten (Suche, Scroll, relevante Rollen) und ohne Vermischung mit reinem Design-Refactor.

## Build

Test-Dateien werden **nicht** in den Production-Build einbezogen (`tsconfig.app.json` schließt `**/*.test.ts` aus). Vor dem Deploy: `npm run lint` und `npm run test:run` ausführen. Optional vor Release: E2E ausführen und Checkliste in [TEST_UND_RELEASE.md](TEST_UND_RELEASE.md) durchgehen.
