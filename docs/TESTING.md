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

## Getestete Module (Stand)

| Modul | Inhalt |
|-------|--------|
| `plu-helpers` | formatKWLabel, formatPreisEur, parseBlockNameToItemType, isPriceOnlyPlu, getDisplayPlu, filterItemsBySearch, groupItemsByLetter, splitIntoColumns |
| `date-kw-utils` | getKWAndYearFromDate, getNextFreeKW, versionExistsForKW, clampKWToUploadRange |
| `keyword-rules` | normalizeKeywordInName, isAlreadyCorrect, nameContainsKeyword |
| `comparison-logic` | compareWithCurrentVersion (UNCHANGED, CONFLICT, PLU_CHANGED_RED, NEW_PRODUCT_YELLOW, erster Upload), resolveConflicts |
| `utils` | generateUUID, cn |

## E2E-Tests (Playwright)

User-Journeys (Login, Navigation, Rollen-Redirects) werden mit **Playwright** in `e2e/*.spec.ts` abgedeckt.

- **Smoke:** Login-Seite lädt, Root und geschützte Routen leiten zu `/login` um.
- **Journey-Tests:** Pro Rolle (Viewer, User, Admin, Super-Admin) Login und Hauptseiten; fehlende Berechtigung führt zu Redirect.

### Abgedeckte Flows (Stand)

| Rolle | Getestet |
|-------|----------|
| **Smoke** | Login-Seite, Redirects (/, /user → /login) |
| **Viewer** | Login → Dashboard → PLU-Liste Obst/Backshop öffnen, kein /admin |
| **User** | Login → Dashboard → Masterliste, Backshop-Liste, PDF-Button, Eigene, Ausgeblendete, Werbung, Umbenannte, Backshop-Seiten, kein /super-admin |
| **Admin** | Login → Dashboard → Masterliste, Benutzerverwaltung, Neuer-Benutzer-Button, alle User-Seiten, Backshop-Seiten, kein /super-admin |
| **Super-Admin** | Login → Dashboard → Upload, Obst/Backshop-Bereich, Benutzerverwaltung, **alle** Super-Admin-Seiten (PLU-Upload, Masterliste, Layout, Regeln, Block-Sort, Versionen, Firmen & Märkte, alle Obst- und Backshop-Seiten) |

**Super-Admin-Tests** laufen nur, wenn `E2E_SUPER_ADMIN_EMAIL` und `E2E_SUPER_ADMIN_PASSWORD` in `.env.e2e` gesetzt sind.

**Nicht automatisiert:** Excel-Upload, Benutzer anlegen, Layout-Änderungen, PDF-Inhalt prüfen.

### Zwei Stufen

| Befehl | Was läuft | Wann |
|--------|-----------|------|
| `npm run test:e2e` | Nur **@smoke** (Login, Redirects) | Schnell, vor jedem Commit, ohne .env.e2e |
| `npm run test:e2e:full` | **Alle** Tests (inkl. Journeys mit Login) | Vor Publish, braucht .env.e2e |

**Vor dem Publish:** `npm run test:e2e:full` ausführen – alle Tests müssen grün sein.

### Ausführung

```bash
# Standard (schnell, ohne Credentials):
npm run test:e2e

# Vollständig (vor Publish, braucht .env.e2e):
npm run test:e2e:full

# Mit UI (empfohlen zum Debuggen):
npm run test:e2e:ui
```

Playwright startet den Dev-Server automatisch, sofern noch keiner auf Port 5173 läuft (`reuseExistingServer: true`).

### Test-Accounts (optional)

Die Journey-Tests (viewer, user, admin, super_admin) benötigen echte Supabase-Accounts. Ohne gesetzte Credentials werden diese Tests übersprungen.

1. `.env.e2e.example` nach `.env.e2e` kopieren.
2. Werte eintragen (E-Mail + Passwort pro Rolle). `.env.e2e` ist in `.gitignore` und wird nicht committet.
3. **Empfohlen:** Test-User über die App (Benutzerverwaltung) anlegen – Markt-Zuweisung und Berechtigungen sind dann korrekt.

**User direkt in Supabase anlegen:** Wenn du „Add user“ im Supabase Dashboard nutzt, muss **User Metadata** gesetzt werden, sonst schlägt die Erstellung mit „Database error creating new user“ fehl (personalnummer ist UNIQUE, Standardwert `""` kollidiert bei mehreren Usern). Beispiel: `{"personalnummer": "e2e-admin-1", "role": "admin"}`. Super-Admin: Nach Erstellung in `profiles` die Spalte `role` auf `super_admin` setzen.

Details und manuelle Checkliste vor Release: [TEST_UND_RELEASE.md](TEST_UND_RELEASE.md).

## Build

Test-Dateien werden **nicht** in den Production-Build einbezogen (`tsconfig.app.json` schließt `**/*.test.ts` aus). Vor dem Deploy: `npm run lint` und `npm run test:run` ausführen. Optional vor Release: E2E ausführen und Checkliste in [TEST_UND_RELEASE.md](TEST_UND_RELEASE.md) durchgehen.
