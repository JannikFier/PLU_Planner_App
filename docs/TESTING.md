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

## Build

Test-Dateien werden **nicht** in den Production-Build einbezogen (`tsconfig.app.json` schließt `**/*.test.ts` aus). Vor dem Deploy: `npm run lint` und `npm run test:run` ausführen.
