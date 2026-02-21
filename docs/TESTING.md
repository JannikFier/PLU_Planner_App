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

### Ausführung

```bash
# Dev-Server starten (in einem Terminal), dann in anderem Terminal:
npm run test:e2e

# Mit UI (empfohlen zum Debuggen):
npm run test:e2e:ui
```

Playwright startet den Dev-Server automatisch, sofern noch keiner auf Port 5173 läuft (`reuseExistingServer: true`).

### Test-Accounts (optional)

Die Journey-Tests (viewer, user, admin, super_admin) benötigen echte Supabase-Accounts. Ohne gesetzte Credentials werden diese Tests übersprungen.

1. `.env.e2e.example` nach `.env.e2e` kopieren.
2. Werte eintragen (E-Mail + Passwort pro Rolle). `.env.e2e` ist in `.gitignore` und wird nicht committet.
3. Entweder: Dediziertes Supabase-Test-Projekt mit Test-Usern anlegen, oder Staging-Projekt mit Test-Accounts nutzen.

Details und manuelle Checkliste vor Release: [TEST_UND_RELEASE.md](TEST_UND_RELEASE.md).

## Build

Test-Dateien werden **nicht** in den Production-Build einbezogen (`tsconfig.app.json` schließt `**/*.test.ts` aus). Vor dem Deploy: `npm run lint` und `npm run test:run` ausführen. Optional vor Release: E2E ausführen und Checkliste in [TEST_UND_RELEASE.md](TEST_UND_RELEASE.md) durchgehen.
